<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Customer;
use App\Models\PushToken;
use App\Models\User;
use App\Services\PushService;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

/**
 * 👥 CRM clients : fiche, historique d'achats, crédits regroupés par client.
 * Les agrégats excluent les avoirs (status refunded).
 */
class CustomerController extends Controller
{
    private function aggregates($query)
    {
        return $query
            ->withCount(['activeReceipts as receipts_count'])
            ->withSum(['activeReceipts as spent_total' => fn ($q) => $q], 'total')
            ->withSum(['activeReceipts as discount_total' => fn ($q) => $q], 'points_discount') // 🎁 remises fidélité
            ->withSum(['activeReceipts as paid_total' => fn ($q) => $q], 'amount_paid')
            ->withMax(['activeReceipts as last_purchase_at' => fn ($q) => $q], 'created_at');
    }

    // ---------- 💳 v2.13 : échéancier de rappels crédit (réglage JSON, 0 migration) ----------

    /** Réglage `credit_schedule` décodé : {customer_id: ['AAAA-MM-JJ', …]} (défensif : tableau sinon). */
    private function creditSchedule(): array
    {
        $raw = \App\Support\Setting::getText('credit_schedule');
        if ($raw === '') {
            return [];
        }
        $map = json_decode($raw, true);

        return is_array($map) ? $map : [];
    }

    /**
     * Dates planifiées d'un client — normalisées (format strict, dédoublonnées, triées).
     * `next` = première date ≥ aujourd'hui, sinon la dernière passée (retard en cours).
     * `days_until` = jours relatifs signés (négatif = en retard, 0 = aujourd'hui, 1 = demain).
     */
    private function planFor(array $schedule, int $customerId): array
    {
        $raw = $schedule[$customerId] ?? $schedule[(string) $customerId] ?? [];
        $dates = array_values(array_unique(array_filter(array_map(
            fn ($d) => trim((string) $d),
            is_array($raw) ? $raw : []
        ), fn ($d) => preg_match('/^\d{4}-\d{2}-\d{2}$/', $d) === 1)));
        sort($dates);

        $today = now()->toDateString();
        $next = null;
        foreach ($dates as $d) {
            if ($d >= $today) {
                $next = $d;
                break;
            }
        }
        $ref = $next ?? (count($dates) ? $dates[count($dates) - 1] : null); // 📅 à défaut : la dernière passée
        $daysUntil = $ref === null
            ? null
            : (int) round((\Illuminate\Support\Carbon::parse($ref)->startOfDay()->getTimestamp()
                - now()->startOfDay()->getTimestamp()) / 86400);

        return ['dates' => $dates, 'next' => $ref, 'days_until' => $daysUntil];
    }

    /** GET /api/customers?q=&all=1 — recherche nom/téléphone + solde crédit par client */
    public function index(Request $request)
    {
        $schedule = $this->creditSchedule(); // 💳 v2.13 : décodé UNE fois pour tout le lot

        $customers = \App\Support\ShopScope::apply($this->aggregates(Customer::query()), $request) // 🏬
            ->when($request->filled('q'), function ($q) use ($request) {
                $term = $request->query('q');
                $q->where(fn ($w) => $w->where('name', 'like', "%{$term}%")
                    ->orWhere('phone', 'like', "%{$term}%"));
            })
            ->orderBy('name')
            ->limit($request->filled('segment') || $request->boolean('all') ? 500 : 60)
            ->get()
            ->map(function (Customer $c) use ($schedule) {
                $plan = $this->planFor($schedule, $c->id); // 💳 v2.13 (additif)

                return [
                'id' => $c->id,
                'name' => $c->name,
                'phone' => $c->phone,
                'email' => $c->email,
                'address' => $c->address,
                'price_tier' => $c->price_tier ?? Customer::TIER_RETAIL, // 👥 détail/gros
                'loyalty_points' => (int) ($c->loyalty_points ?? 0),     // 🎁 solde fidélité
                'receipts_count' => (int) $c->receipts_count,
                'spent_total' => (int) ($c->spent_total ?? 0),
                'paid_total' => (int) ($c->paid_total ?? 0),
                // 💳 Encours crédit = total acheté − remises fidélité − total payé (avoirs exclus)
                'credit_balance' => max(0, (int) $c->spent_total - (int) ($c->discount_total ?? 0) - (int) $c->paid_total),
                'last_purchase_at' => $c->last_purchase_at,
                // 💳 v2.13 : échéancier planifié (additif — dates [] / next null si rien, vieux clients ignorent)
                'payment_dates' => $plan['dates'],
                'next_payment_date' => $plan['next'],
                'days_until' => $plan['days_until'],
                ];
            })
            ->values();

        // 👥 Segments : fidèles · à crédit · inactifs (60 jours sans achat)
        $customers = $this->applySegment($customers, $request->query('segment'));

        return response()->json(['data' => $customers->values()]);
    }

    /** POST /api/customers */
    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
            'price_tier' => ['nullable', 'in:' . Customer::TIER_RETAIL . ',' . Customer::TIER_WHOLESALE], // 👥
        ]);

        if (! empty($data['phone']) && Customer::where('phone', $data['phone'])->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['Un client existe déjà avec ce numéro.'],
            ]);
        }

        $customer = Customer::create([...$data, 'shop_id' => \App\Support\ShopScope::currentShopId($request)]);

        return response()->json(['data' => $customer], 201);
    }

    /** GET /api/customers/{customer} — fiche complète : totaux + crédits + fidélité + historique */
    public function show(Customer $customer)
    {
        $customer->loadCount(['activeReceipts as receipts_count'])
            ->loadSum(['activeReceipts as spent_total' => fn ($q) => $q], 'total')
            ->loadSum(['activeReceipts as discount_total' => fn ($q) => $q], 'points_discount')
            ->loadSum(['activeReceipts as paid_total' => fn ($q) => $q], 'amount_paid');

        $credits = $customer->credits()->withCount('items')->get();

        $history = $customer->receipts()
            ->withCount('items')
            ->latest()
            ->limit(20)
            ->get();

        // 🎁 Journal fidélité (20 derniers mouvements)
        $loyalty = $customer->loyaltyTransactions()
            ->with('user:id,name')
            ->limit(20)
            ->get();

        return response()->json([
            'data' => $customer,
            'stats' => [
                'receipts_count' => (int) $customer->receipts_count,
                'spent_total' => (int) ($customer->spent_total ?? 0),
                'paid_total' => (int) ($customer->paid_total ?? 0),
                'credit_balance' => max(0, (int) $customer->spent_total - (int) ($customer->discount_total ?? 0) - (int) $customer->paid_total),
            ],
            'credits' => $credits,
            'history' => $history,
            'loyalty_history' => $loyalty, // 🎁
            'loyalty_config' => [           // 🎁 pour l'affichage app
                'earn_per' => (int) \App\Support\Setting::get('loyalty_earn_per', 1000),
                'point_value' => (int) \App\Support\Setting::get('loyalty_point_value', 10),
            ],
            // 💳 v2.13 : échéancier planifié (additif — absent = vieux serveur, carte masquée côté clients)
            'payment_plan' => $this->planFor($this->creditSchedule(), $customer->id),
        ]);
    }

    /** PUT /api/customers/{customer} — 💳 v2.13 : accepte aussi payment_plan seul (échéancier) */
    public function update(Request $request, Customer $customer)
    {
        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'], // 💳 v2.13 : « sometimes » = fiche OU échéancier seul
            'phone' => ['nullable', 'string', 'max:30'],
            'email' => ['nullable', 'email', 'max:255'],
            'address' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:500'],
            'price_tier' => ['nullable', 'in:' . Customer::TIER_RETAIL . ',' . Customer::TIER_WHOLESALE], // 👥
            // 💳 v2.13 : échéancier planifié — liste complète remplacée ([] = aucune date)
            'payment_plan' => ['nullable', 'array', 'max:12'],
            'payment_plan.*' => ['date_format:Y-m-d'],
        ]);

        if (! empty($data['phone'])
            && Customer::where('phone', $data['phone'])->whereKeyNot($customer->id)->exists()) {
            throw ValidationException::withMessages([
                'phone' => ['Un autre client utilise déjà ce numéro.'],
            ]);
        }

        // 💳 v2.13 : l'échéancier ne vit PAS dans la table customers (0 migration)
        $planSent = $request->has('payment_plan');
        unset($data['payment_plan']);

        if ($data !== []) {
            $customer->update($data);
        }

        if ($planSent) {
            $schedule = $this->creditSchedule();
            $dates = array_values(array_unique(array_map(
                fn ($d) => trim((string) $d),
                (array) $request->input('payment_plan', [])
            )));
            sort($dates); // normalisé : dédoublonné + trié chronologique
            if ($dates === []) {
                unset($schedule[$customer->id], $schedule[(string) $customer->id]);
            } else {
                $schedule[$customer->id] = $dates;
            }
            \App\Support\Setting::set('credit_schedule', $schedule === [] ? '' : json_encode($schedule, JSON_UNESCAPED_UNICODE));
        }

        return response()->json([
            'data' => $customer,
            // 💳 v2.13 : échéancier à jour (additif — permet aux clients de rafraîchir sans re-GET)
            'payment_plan' => $this->planFor($this->creditSchedule(), $customer->id),
        ]);
    }

    /** POST /api/customers/notify-segment — 📣 push « segment » au staff (admins+managers) */
    public function notifySegment(Request $request)
    {
        $data = $request->validate([
            'segment' => ['required', 'in:loyal,credit,inactive'],
        ]);

        $customers = $this->applySegment(
            $this->aggregates(Customer::query())->orderBy('name')->limit(500)->get()->map(fn (Customer $c) => [
                'id' => $c->id,
                'name' => $c->name,
                'receipts_count' => (int) $c->receipts_count,
                'credit_balance' => max(0, (int) $c->spent_total - (int) $c->paid_total),
                'last_purchase_at' => $c->last_purchase_at,
            ]),
            $data['segment']
        );

        if ($customers->isEmpty()) {
            return response()->json(['notified' => 0, 'clients' => 0]);
        }

        $loyalMin = (int) \App\Support\Setting::get('segment_loyal_min', 5);
        $inactiveDays = (int) \App\Support\Setting::get('segment_inactive_days', 60);
        $labels = [
            'loyal' => ['⭐ Fidèles', "clients fidèles ({$loyalMin}+ achats) — pensez à les remercier !"],
            'credit' => ['💳 Crédits', 'clients avec un crédit en cours — campagne de relance ?'],
            'inactive' => ['😴 Inactifs', "clients inactifs depuis {$inactiveDays}+ jours — offre de retour ?"],
        ];
        [$title, $text] = $labels[$data['segment']];
        $names = $customers->take(3)->pluck('name')->implode(', ');

        $count = $customers->count();
        $tokens = PushToken::whereIn(
            'user_id',
            User::whereIn('role', ['admin', 'manager'])->pluck('id')
        )->pluck('token')->all();

        $notified = PushService::send(
            $tokens,
            "{$title} : {$count} client(s)",
            "{$text} — ex : {$names}" . ($count > 3 ? '…' : ''),
            ['type' => 'customer_segment', 'segment' => $data['segment']]
        );

        return response()->json(['notified' => $notified, 'clients' => $count]);
    }

    /** Filtre en mémoire par segment (loyal ≥ 5 achats · credit solde > 0 · inactive 60 j) */
    private function applySegment($customers, ?string $segment)
    {
        // 🎯 Seuils configurables (Réglages boutique)
        $loyalMin = (int) \App\Support\Setting::get('segment_loyal_min', 5);
        $inactiveDays = (int) \App\Support\Setting::get('segment_inactive_days', 60);

        return match ($segment) {
            'loyal' => $customers->filter(fn ($c) => $c['receipts_count'] >= $loyalMin),
            'credit' => $customers->filter(fn ($c) => $c['credit_balance'] > 0),
            'inactive' => $customers->filter(fn ($c) => empty($c['last_purchase_at'])
                || \Carbon\Carbon::parse($c['last_purchase_at'])->lt(now()->subDays($inactiveDays))),
            default => $customers,
        };
    }

    /** DELETE /api/customers/{customer} — refuse si des reçus sont liés */
    public function destroy(Customer $customer)
    {
        if ($customer->receipts()->exists()) {
            throw ValidationException::withMessages([
                'customer' => ['Ce client a des reçus liés — impossible de le supprimer.'],
            ]);
        }

        $customer->delete();

        return response()->json(['deleted' => true]);
    }
}
