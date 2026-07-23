<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Middleware\SetLocale;

class LangController extends Controller
{
    /** GET /lang/{locale} — Change la langue du site (bouton FR / EN). */
    public function switch(string $locale)
    {
        abort_unless(in_array($locale, SetLocale::LOCALES, true), 404);

        session(['locale' => $locale]);

        return back();
    }
}
