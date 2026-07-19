<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;

/**
 * Identité visuelle de la boutique — notamment le LOGO affiché
 * en tête des reçus PDF (vente + commande de licence).
 *
 * Le logo est un simple fichier `public/images/shop-logo.{png|jpg|jpeg|webp}`
 * → déposé manuellement OU uploadé depuis l'admin (web ou mobile).
 */
class ShopInfo
{
    private const EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];

    /** Chemin absolu du logo actuel, ou null. */
    public static function logoPath(): ?string
    {
        foreach (self::EXTENSIONS as $ext) {
            $path = public_path("images/shop-logo.{$ext}");
            if (is_file($path)) {
                return $path;
            }
        }

        return null;
    }

    /** URL publique du logo (avec cache-buster), ou null. */
    public static function logoUrl(): ?string
    {
        $path = self::logoPath();
        if (! $path) {
            return null;
        }

        return asset('images/'.basename($path)).'?v='.filemtime($path);
    }

    /**
     * Logo encodé en data-URI base64 — le moyen le plus fiable
     * pour dompdf (pas d'accès disque/HTTP à configurer).
     */
    public static function logoDataUri(): ?string
    {
        $path = self::logoPath();
        if (! $path) {
            return null;
        }

        $mime = match (strtolower(pathinfo($path, PATHINFO_EXTENSION))) {
            'jpg', 'jpeg' => 'image/jpeg',
            'webp' => 'image/webp',
            default => 'image/png',
        };

        $contents = @file_get_contents($path);
        if ($contents === false) {
            return null;
        }

        return "data:{$mime};base64,".base64_encode($contents);
    }

    /**
     * Enregistre un logo uploadé : supprime l'ancien puis stocke
     * sous `public/images/shop-logo.<ext>`. Retourne l'URL publique.
     */
    public static function storeLogo(UploadedFile $file): string
    {
        self::deleteLogo();

        $ext = strtolower($file->getClientOriginalExtension() ?: 'png');
        if (! in_array($ext, self::EXTENSIONS, true)) {
            $ext = 'png';
        }

        $file->move(public_path('images'), "shop-logo.{$ext}");

        return asset("images/shop-logo.{$ext}").'?v='.time();
    }

    public static function deleteLogo(): void
    {
        foreach (self::EXTENSIONS as $ext) {
            $path = public_path("images/shop-logo.{$ext}");
            if (is_file($path)) {
                @unlink($path);
            }
        }
    }
}
