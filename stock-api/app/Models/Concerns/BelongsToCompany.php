<?php

namespace App\Models\Concerns;

use App\Models\Company;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * 🏢 Isolation multi-locataire STRICTE.
 *
 * - À la création : company_id auto-rempli depuis l'utilisateur connecté.
 * - À la lecture : GLOBAL SCOPE qui filtre sur l'entreprise de l'utilisateur
 *   connecté. S'il n'y a pas d'utilisateur avec entreprise (super-admin
 *   plateforme, commandes artisan/scheduler), aucun filtre n'est ajouté —
 *   ces contextes de confiance gèrent l'itération par entreprise eux-mêmes.
 *
 * ⚠️ Ne PAS appliquer ce trait au modèle User : Auth::user() charge le User,
 *    ce qui provoquerait une récursion. Le User est scopé manuellement.
 */
trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::creating(function ($model) {
            if (empty($model->company_id)) {
                $companyId = Auth::user()?->company_id;
                if ($companyId) {
                    $model->company_id = $companyId;
                }
            }
        });

        static::addGlobalScope('company', function (Builder $builder) {
            $companyId = Auth::user()?->company_id;
            if ($companyId) {
                $builder->where($builder->getModel()->getTable().'.company_id', $companyId);
            }
        });
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
