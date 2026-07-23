<?php

namespace App\Http\Controllers\Web;

use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class MediaController
{
    /** Sert les images produits recadrées et mises en cache par Glide. */
    public function product(Request $request, string $path): Response
    {
        abort_unless(preg_match('/^[A-Za-z0-9_\/-]+\.(?:jpg|jpeg|png|webp)$/i', $path), 404);
        $source = storage_path('app/public/products/' . ltrim($path, '/'));
        abort_unless(is_file($source), 404);

        if (! class_exists(\League\Glide\ServerFactory::class)) {
            return response()->file($source);
        }

        $server = \League\Glide\ServerFactory::create([
            'source' => storage_path('app/public'),
            'cache' => storage_path('app/glide'),
            'driver' => 'gd',
        ]);

        $params = [
            'w' => min(1200, max(80, $request->integer('w', 600))),
            'h' => min(1200, max(80, $request->integer('h', 600))),
            'fit' => in_array($request->query('fit', 'crop'), ['crop', 'contain', 'fill', 'stretch'], true) ? $request->query('fit', 'crop') : 'crop',
            'q' => min(90, max(40, $request->integer('q', 82))),
            'fm' => 'webp',
        ];
        $dataUri = $server->getImageAsBase64('products/' . ltrim($path, '/'), $params);
        [$meta, $encoded] = explode(',', $dataUri, 2);
        preg_match('#^data:([^;]+);#', $meta, $matches);
        return response(base64_decode($encoded), 200, [
            'Content-Type' => $matches[1] ?? 'image/webp',
            'Cache-Control' => 'public, max-age=31536000',
        ]);
    }
}
