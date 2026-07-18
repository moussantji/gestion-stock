<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $categories = Category::withCount('products')
            ->orderBy('name')
            ->get();

        return response()->json(['data' => $categories]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', 'unique:categories,name'],
            'description' => ['nullable', 'string', 'max:1000'],
        ], [
            'name.unique' => 'Cette catégorie existe déjà.',
        ]);

        $category = Category::create($data);

        return response()->json(['data' => $category], 201);
    }

    public function show(Category $category)
    {
        return response()->json(['data' => $category->loadCount('products')]);
    }

    public function update(Request $request, Category $category)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255', Rule::unique('categories', 'name')->ignore($category->id)],
            'description' => ['nullable', 'string', 'max:1000'],
        ]);

        $category->update($data);

        return response()->json(['data' => $category]);
    }

    public function destroy(Category $category)
    {
        if ($category->products()->exists()) {
            return response()->json([
                'message' => 'Impossible de supprimer : des produits sont liés à cette catégorie.',
            ], 422);
        }

        $category->delete();

        return response()->json(['message' => 'Catégorie supprimée.']);
    }
}
