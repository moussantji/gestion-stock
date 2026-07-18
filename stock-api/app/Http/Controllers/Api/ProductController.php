<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProductRequest;
use App\Http\Requests\UpdateProductRequest;
use App\Models\Category;
use App\Models\Product;
use App\Models\Receipt;
use App\Models\StockMovement;
use App\Models\Supplier;
use App\Support\ShopStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class ProductController extends Controller
{
    /**
     * GET /api/products
     * Filtres : search, category_id, supplier_id, low_stock=1, out_of_stock=1,
     *           sort=name|quantity|sale_price|created_at, order=asc|desc,
     *           per_page, all=1 (sans pagination, pour les listes déroulantes)
     */
    public function index(Request $request)
    {
        $query = Product::with(['category:id,name', 'supplier:id,name']);

        $query->search($request->query('search'));

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->integer('category_id'));
        }

        if ($request->filled('supplier_id')) {
            $query->where('supplier_id', $request->integer('supplier_id'));
        }

        if ($request->boolean('low_stock')) {
            $query->lowStock();
        }

        if ($request->boolean('out_of_stock')) {
            $query->where('quantity', 0);
        }

        $sort = in_array($request->query('sort'), ['name', 'quantity', 'sale_price', 'created_at'], true)
            ? $request->query('sort')
            : 'name';
        $query->orderBy($sort, $request->query('order') === 'desc' ? 'desc' : 'asc');

        if ($request->boolean('all')) {
            return response()->json(['data' => $this->appendPromo($this->appendShopStock($query->limit(500)->get(), $request))]);
        }

        $paginator = $query->paginate($request->integer('per_page', 15));
        $paginator->setCollection($this->appendPromo($this->appendShopStock($paginator->getCollection(), $request)));

        return response()->json($paginator);
    }

    /**
     * 🏬📦 v13 — Ajoute `shop_stock` = stock à MON emplacement :
     * - utilisateur rattaché à une boutique → son bucket (0 si rien n'y a été transféré)
     * - siège → global − buckets (null si le produit n'a aucun bucket = mono-stock v12)
     * 1 requête groupée pour toute la page (pas de N+1).
     */
    /**
     * 🏷️ v2.11 : clés promo ADDITIVES — promo_price / promo_until (null hors promo
     * active → vieux clients intacts, 1 lecture de réglage pour toute la page).
     */
    private function appendPromo(\Illuminate\Support\Collection $products): \Illuminate\Support\Collection
    {
        return $products->map(function (Product $p) {
            $active = \App\Support\Promo::activeFor((int) $p->id);
            $p->promo_price = $active ? (int) $active['price'] : null;
            $p->promo_until = $active ? $active['to'] : null;

            return $p;
        });
    }

    private function appendShopStock(\Illuminate\Support\Collection $products, Request $request): \Illuminate\Support\Collection
    {
        $ids = $products->pluck('id');
        if ($ids->isEmpty()) {
            return $products;
        }

        $userShop = $request->user()?->shop_id;
        $buckets = DB::table('product_shop_stocks')
            ->whereIn('product_id', $ids)
            ->get(['product_id', 'shop_id', 'quantity'])
            ->groupBy('product_id');

        return $products->map(function (Product $p) use ($buckets, $userShop) {
            $rows = $buckets->get($p->id, collect());
            if ($userShop !== null) {
                $p->shop_stock = (int) (optional($rows->firstWhere('shop_id', $userShop))->quantity ?? 0);
            } else {
                $p->shop_stock = $rows->isEmpty() ? null : ((int) $p->quantity - (int) $rows->sum('quantity'));
            }

            return $p;
        });
    }

    /** GET /api/products/low-stock */
    public function lowStock()
    {
        $products = Product::lowStock()
            ->with(['category:id,name', 'supplier:id,name'])
            ->orderBy('quantity')
            ->get();

        return response()->json(['data' => $products]);
    }

    /**
     * GET /api/products/restock-forecast?days=30&lead=14 — 📈 prévision de rupture.
     * Vélocité = ventes NETTES /jour sur la fenêtre (avoirs exclus) ;
     * rupture estimée = stock ÷ vélocité ; suggestion = vélocité × délai − stock.
     */
    public function restockForecast(Request $request)
    {
        $days = min(90, max(7, $request->integer('days', 30)));
        $lead = min(60, max(1, $request->integer('lead', 14))); // délai de réassort visé
        $since = now()->subDays($days)->startOfDay();

        // Ventes nettes par produit sur la fenêtre (reçus actifs uniquement)
        $sold = DB::table('receipt_items')
            ->join('receipts', 'receipts.id', '=', 'receipt_items.receipt_id')
            ->where('receipts.status', Receipt::STATUS_COMPLETED)
            ->where('receipts.created_at', '>=', $since)
            ->whereNotNull('receipt_items.product_id')
            ->groupBy('receipt_items.product_id')
            ->selectRaw('receipt_items.product_id, SUM(receipt_items.quantity - receipt_items.refunded_qty) as qty')
            ->pluck('qty', 'receipt_items.product_id');

        $rows = Product::with('category:id,name')
            ->whereIn('id', $sold->keys()->all())
            ->get()
            ->map(function (Product $p) use ($sold, $days, $lead) {
                $netSold = max(0, (int) ($sold[$p->id] ?? 0));
                $velocity = round($netSold / $days, 2); // ventes/jour
                $daysLeft = $velocity > 0 ? (int) floor($p->quantity / $velocity) : null;
                $suggested = (int) max(0, ceil($velocity * $lead) - $p->quantity);

                return [
                    'id' => $p->id,
                    'name' => $p->name,
                    'sku' => $p->sku,
                    'category' => $p->category?->name,
                    'quantity' => (int) $p->quantity,
                    'sold_period' => $netSold,
                    'velocity' => $velocity,                       // vendus/jour
                    'days_left' => $daysLeft,                      // rupture estimée (j)
                    'suggested_order' => $suggested,               // qté à commander (couvre `lead` jours)
                ];
            })
            ->filter(fn ($r) => $r['days_left'] !== null)
            ->sortBy('days_left')
            ->values()
            ->take(100);

        // 📊 v2.12 : vue REGROUPÉE PAR FOURNISSEUR (additive — demandée explicitement,
        //    0 requête supplémentaire sinon ; seules les lignes avec qqch à commander)
        $suppliers = [];
        if ($request->boolean('by_supplier')) {
            $supplierOf = Product::with('supplier:id,name')
                ->whereIn('id', $rows->pluck('id')->all() ?: [0])
                ->get(['id', 'supplier_id'])
                ->keyBy('id');

            foreach ($rows as $r) {
                if ((int) ($r['suggested_order'] ?? 0) <= 0) {
                    continue;
                }
                $sup = $supplierOf[$r['id']]?->supplier;
                $key = (int) ($sup?->id ?? 0);
                $suppliers[$key] ??= [
                    'supplier_id' => $sup?->id,
                    'name' => $sup?->name ?? 'Sans fournisseur',
                    'lines' => [],
                    'total_qty' => 0,
                ];
                $suppliers[$key]['lines'][] = [
                    'product_id' => $r['id'],
                    'name' => $r['name'],
                    'sku' => $r['sku'],
                    'quantity' => $r['quantity'],
                    'velocity' => $r['velocity'],
                    'days_left' => $r['days_left'],
                    'suggested_order' => $r['suggested_order'],
                ];
                $suppliers[$key]['total_qty'] += (int) $r['suggested_order'];
            }
            $suppliers = collect($suppliers)->sortByDesc('total_qty')->values()->all();
        }

        return response()->json([
            'data' => $rows,
            'window_days' => $days,
            'lead_days' => $lead,
            'suppliers' => $suppliers, // 📊 v2.12 : [] quand non demandé (vieux clients : ignorée)
        ]);
    }

    /** GET /api/products/barcode/{barcode} */
    public function findByBarcode(string $barcode, Request $request)
    {
        $product = Product::where('barcode', $barcode)
            ->with(['category:id,name', 'supplier:id,name'])
            ->firstOrFail();

        $this->appendShopStock(collect([$product]), $request); // 🏬📦

        return response()->json(['data' => $product]);
    }

    /**
     * POST /api/products  (JSON ou multipart avec photo `image`)
     * Crée aussi un mouvement d'entrée "Stock initial" si quantity > 0.
     */
    public function store(StoreProductRequest $request)
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }

        $initialQty = (int) ($data['quantity'] ?? 0);
        $data['quantity'] = 0; // la quantité passe par un mouvement d'entrée (historique cohérent)

        $product = DB::transaction(function () use ($data, $initialQty, $request) {
            $product = Product::create($data);

            if ($initialQty > 0) {
                $product->movements()->create([
                    'user_id' => $request->user()->id,
                    'type' => StockMovement::TYPE_IN,
                    'quantity' => $initialQty,
                    'unit_price' => $product->purchase_price,
                    'reason' => 'Stock initial',
                ]);
                $product->update(['quantity' => $initialQty]);
            }

            return $product;
        });

        return response()->json(
            ['data' => $product->load(['category:id,name', 'supplier:id,name'])],
            201
        );
    }

    public function show(Product $product, Request $request)
    {
        $product->load(['category:id,name', 'supplier:id,name']);
        $product->load(['movements' => function ($q) {
            $q->with('user:id,name')->limit(10);
        }]);

        // 🏬📦 v13 : mon niveau + détail par emplacement (si buckets)
        $this->appendShopStock(collect([$product]), $request);
        $product->stocks = ShopStock::breakdown($product);

        return response()->json(['data' => $product]);
    }

    /**
     * PUT /api/products/{product}
     * Depuis l'app mobile : POST /api/products/{id} avec `_method=PUT` (multipart).
     */
    public function update(UpdateProductRequest $request, Product $product)
    {
        $data = $request->validated();

        if ($request->hasFile('image')) {
            // Supprime l'ancienne photo pour ne pas encombrer le disque
            if ($product->image_path) {
                Storage::disk('public')->delete($product->image_path);
            }
            $data['image_path'] = $request->file('image')->store('products', 'public');
        }

        $product->update($data);

        return response()->json(
            ['data' => $product->fresh(['category:id,name', 'supplier:id,name'])]
        );
    }

    /** Suppression (soft delete) — réservée admin/manager via la route. */
    public function destroy(Product $product)
    {
        $product->delete();

        return response()->json(['message' => 'Produit supprimé.']);
    }

    /**
     * 📥 v2.13 — POST /api/products/import : import CSV en masse (création / mise à jour).
     *
     * Body : { rows: [ {name, sku, barcode?, purchase_price, sale_price, wholesale_price?,
     *                    quantity?, alert_threshold?, category?, supplier?} ] ≤ 300,
     *          create_missing?: bool }
     *
     * Rapprochement par SKU (insensible à la casse) :
     *  • trouvé  → MISE À JOUR des données commerciales (nom, prix, seuil, catégorie,
     *              fournisseur, code-barres) — la QUANTITÉ n'est jamais touchée sur une
     *              mise à jour : le stock ne bouge que par mouvements (cohérence d'historique) ;
     *  • absent  → CRÉATION (quantity = stock initial + mouvement IN « Import CSV »,
     *              miroir strict de store()).
     *
     * Une ligne invalide est signalée et n'empêche PAS les autres : validation ligne par
     * ligne (mêmes règles que StoreProductRequest) — le rapport final liste tout.
     * Réponse : { created, updated, errors: [{line, sku, message}] }.
     */
    public function import(Request $request)
    {
        $payload = $request->validate([
            'create_missing' => ['nullable', 'boolean'],
            'rows' => ['required', 'array', 'min:1', 'max:300'],
        ]);

        $createMissing = $request->boolean('create_missing');
        $created = 0;
        $updated = 0;
        $errors = [];

        // 🔎 Index SKU insensible à la casse : UNE requête pour tout le lot
        $skus = collect($payload['rows'])->pluck('sku')->map(fn ($s) => trim((string) $s))->filter()->values()->all();
        $existing = Product::whereIn('sku', $skus)->get()
            ->keyBy(fn ($p) => mb_strtolower((string) $p->sku));

        // 🔎 Catégories / fournisseurs connus indexés par nom (UNE requête chacun)
        $categories = Category::query()->get()->keyBy(fn ($c) => mb_strtolower(trim((string) $c->name)));
        $suppliers = Supplier::query()->get()->keyBy(fn ($s) => mb_strtolower(trim((string) $s->name)));

        foreach ($payload['rows'] as $i => $row) {
            $row = is_array($row) ? $row : [];
            $line = $i + 2; // 🧾 ligne réelle dans le fichier (la 1ʳᵉ = en-têtes)
            $skuForError = trim((string) ($row['sku'] ?? ''));

            // Validation de la ligne — mêmes règles que StoreProductRequest
            $v = Validator::make($row, [
                'name' => ['required', 'string', 'max:255'],
                'sku' => ['required', 'string', 'max:100'],
                'barcode' => ['nullable', 'string', 'max:100'],
                'purchase_price' => ['required', 'numeric', 'min:0'],
                'sale_price' => ['required', 'numeric', 'min:0'],
                'wholesale_price' => ['nullable', 'numeric', 'min:0'],
                'quantity' => ['nullable', 'integer', 'min:0'],
                'alert_threshold' => ['nullable', 'integer', 'min:0'],
                'category' => ['nullable', 'string', 'max:255'],
                'supplier' => ['nullable', 'string', 'max:255'],
            ]);
            if ($v->fails()) {
                $errors[] = ['line' => $line, 'sku' => $skuForError !== '' ? $skuForError : null, 'message' => $v->errors()->first()];
                continue;
            }

            // 🔗 Catégorie / fournisseur par NOM — créés seulement si create_missing
            $categoryId = null;
            $catName = trim((string) ($row['category'] ?? ''));
            $supplierId = null;
            $supName = trim((string) ($row['supplier'] ?? ''));

            if ($catName !== '') {
                $ck = mb_strtolower($catName);
                if ($categories->has($ck)) {
                    $categoryId = $categories->get($ck)->id;
                } elseif ($createMissing) {
                    $cat = Category::create(['name' => $catName]);
                    $categoryId = $cat->id;
                    $categories->put($ck, $cat); // les lignes suivantes le retrouvent
                } else {
                    $errors[] = ['line' => $line, 'sku' => $skuForError, 'message' => "Catégorie inconnue : {$catName}"];
                    continue;
                }
            }
            if ($supName !== '') {
                $sk = mb_strtolower($supName);
                if ($suppliers->has($sk)) {
                    $supplierId = $suppliers->get($sk)->id;
                } elseif ($createMissing) {
                    $sup = Supplier::create(['name' => $supName]);
                    $supplierId = $sup->id;
                    $suppliers->put($sk, $sup);
                } else {
                    $errors[] = ['line' => $line, 'sku' => $skuForError, 'message' => "Fournisseur inconnu : {$supName}"];
                    continue;
                }
            }

            try {
                $product = $existing->get(mb_strtolower($skuForError));
                if ($product) {
                    // ✏️ Mise à jour — la quantité n'est JAMAIS modifiée ici
                    $data = [
                        'name' => trim((string) $row['name']),
                        'purchase_price' => $row['purchase_price'],
                        'sale_price' => $row['sale_price'],
                    ];
                    if (array_key_exists('wholesale_price', $row)) $data['wholesale_price'] = $row['wholesale_price'];
                    if (array_key_exists('alert_threshold', $row) && $row['alert_threshold'] !== null) $data['alert_threshold'] = $row['alert_threshold'];
                    if (trim((string) ($row['barcode'] ?? '')) !== '') $data['barcode'] = trim((string) $row['barcode']);
                    if ($catName !== '') $data['category_id'] = $categoryId;
                    if ($supName !== '') $data['supplier_id'] = $supplierId;
                    DB::transaction(fn () => $product->update($data));
                    $updated++;
                } else {
                    $initialQty = (int) ($row['quantity'] ?? 0);
                    $data = [
                        'name' => trim((string) $row['name']),
                        'sku' => $skuForError,
                        'barcode' => trim((string) ($row['barcode'] ?? '')) !== '' ? trim((string) $row['barcode']) : null,
                        'purchase_price' => $row['purchase_price'],
                        'sale_price' => $row['sale_price'],
                        'wholesale_price' => array_key_exists('wholesale_price', $row) ? $row['wholesale_price'] : null,
                        'category_id' => $categoryId,
                        'supplier_id' => $supplierId,
                        'alert_threshold' => (int) ($row['alert_threshold'] ?? 0),
                        'quantity' => 0, // passe par un mouvement — miroir de store()
                    ];
                    $new = DB::transaction(function () use ($data, $initialQty, $request) {
                        $p = Product::create($data);
                        if ($initialQty > 0) {
                            $p->movements()->create([
                                'user_id' => $request->user()->id,
                                'type' => StockMovement::TYPE_IN,
                                'quantity' => $initialQty,
                                'unit_price' => $p->purchase_price,
                                'reason' => 'Import CSV',
                            ]);
                            $p->update(['quantity' => $initialQty]);
                        }

                        return $p;
                    });
                    $existing->put(mb_strtolower($skuForError), $new); // doublons de SKU dans le fichier = mise à jour
                    $created++;
                }
            } catch (\Throwable $e) {
                $errors[] = ['line' => $line, 'sku' => $skuForError, 'message' => $e->getMessage()];
            }
        }

        // 📥 v2.13 : rapport détaillé (les lignes en erreur n'ont PAS bloqué le reste)
        return response()->json([
            'created' => $created,
            'updated' => $updated,
            'errors' => $errors,
        ]);
    }
}
