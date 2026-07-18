<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Gestion des utilisateurs — réservée aux admins (middleware role:admin).
 */
class UserController extends Controller
{
    public function index()
    {
        return response()->json([
            'data' => User::with('shop:id,name')->withCount('movements')->orderBy('name')->get(), // 🏬
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
            'role' => ['required', Rule::in(User::ROLES)],
            'shop_id' => ['nullable', 'integer', 'exists:shops,id'], // 🏬 boutique de rattachement
        ], [
            'email.unique' => 'Cet email est déjà utilisé.',
            'password.min' => 'Le mot de passe doit contenir au moins 8 caractères.',
        ]);

        $user = User::create($data);

        return response()->json(['data' => $user], 201);
    }

    public function show(User $user)
    {
        return response()->json(['data' => $user->loadCount('movements')]);
    }

    public function update(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'role' => ['required', Rule::in(User::ROLES)],
            'password' => ['nullable', 'string', 'min:8', 'confirmed'],
            'shop_id' => ['nullable', 'integer', 'exists:shops,id'], // 🏬
        ]);

        if (empty($data['password'])) {
            unset($data['password']);
        }

        $user->update($data);

        return response()->json(['data' => $user]);
    }

    public function destroy(Request $request, User $user)
    {
        if ($user->id === $request->user()->id) {
            return response()->json(['message' => 'Vous ne pouvez pas supprimer votre propre compte.'], 422);
        }

        if ($user->movements()->exists()) {
            return response()->json(['message' => 'Impossible : cet utilisateur a des mouvements enregistrés.'], 422);
        }

        $user->tokens()->delete();
        $user->delete();

        return response()->json(['message' => 'Utilisateur supprimé.']);
    }
}
