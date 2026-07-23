<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\License;
use Illuminate\Http\Request;

class LicenseController extends Controller
{
    public function index(Request $request)
    {
        $licenses = License::with('order:id,reference')
            ->when($request->query('q'), function ($q, $term) {
                $q->where(function ($qq) use ($term) {
                    $qq->where('key', 'like', "%{$term}%")
                        ->orWhere('buyer_name', 'like', "%{$term}%")
                        ->orWhere('buyer_email', 'like', "%{$term}%");
                });
            })
            ->when($request->query('status'), function ($q, $status) {
                match ($status) {
                    'active' => $q->valid(),
                    'expired' => $q->where('status', License::STATUS_ACTIVE)->where('expires_at', '<=', now()),
                    'revoked' => $q->where('status', License::STATUS_REVOKED),
                    default => null,
                };
            })
            ->orderByDesc('expires_at')
            ->paginate(15)
            ->withQueryString();

        return view('admin.licenses.index', compact('licenses'));
    }

    /** Active / révoque une licence. */
    public function toggle(License $license)
    {
        $new = $license->status === License::STATUS_ACTIVE
            ? License::STATUS_REVOKED
            : License::STATUS_ACTIVE;

        $license->update(['status' => $new]);

        return back()->with('success', $new === License::STATUS_ACTIVE
            ? 'Licence réactivée.'
            : 'Licence révoquée.');
    }
}
