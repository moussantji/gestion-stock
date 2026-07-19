<?php

namespace App\Http\Controllers\Web\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class WebUserController extends Controller
{
    public function index(Request $request)
    {
        $users = User::withCount('movements')
            ->when($request->query('role'), fn ($q, $r) => $q->where('role', $r))
            ->orderBy('name')
            ->paginate(15)
            ->withQueryString();

        return view('admin.users.index', compact('users'));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role' => ['required', Rule::in(User::ASSIGNABLE_ROLES)],
        ]);

        $user = User::create($data);

        $msg = $user->isClient()
            ? "Compte client créé — il peut se connecter sur {$request->getSchemeAndHttpHost()}/compte."
            : 'Utilisateur créé.';

        return back()->with('success', $msg);
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return back()->with('error', 'Tu ne peux pas supprimer ton propre compte.');
        }

        if ($user->movements()->exists()) {
            return back()->with('error', 'Impossible : cet utilisateur a des mouvements enregistrés.');
        }

        $user->tokens()->delete();
        $user->delete();

        return back()->with('success', 'Utilisateur supprimé.');
    }
}
