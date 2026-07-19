<?php

use App\Http\Controllers\Web\Admin\DashboardController;
use App\Http\Controllers\Web\Admin\LicenseController;
use App\Http\Controllers\Web\Admin\OrderController;
use App\Http\Controllers\Web\Admin\PaymentMethodController;
use App\Http\Controllers\Web\Admin\PlanController;
use App\Http\Controllers\Web\Admin\SettingsController;
use App\Http\Controllers\Web\Admin\WebUserController;
use App\Http\Controllers\Web\AdminAuthController;
use App\Http\Controllers\Web\ClientAuthController;
use App\Http\Controllers\Web\ClientPortalController;
use App\Http\Controllers\Web\GoogleAuthController;
use App\Http\Controllers\Web\HomeController;
use App\Http\Controllers\Web\LangController;
use App\Http\Controllers\Web\ReceiptController;
use Illuminate\Support\Facades\Route;

// ================= SITE PUBLIC =================
Route::get('/', [HomeController::class, 'home'])->name('home');
Route::get('/acheter/{plan:slug}', [HomeController::class, 'checkout'])->name('checkout');
Route::post('/acheter/{plan:slug}', [HomeController::class, 'purchase'])->name('purchase');
Route::get('/commande/{order:reference}', [HomeController::class, 'confirmation'])->name('order.confirmation');
Route::get('/commande/{order:reference}/recu', [ReceiptController::class, 'orderReceipt'])->name('order.receipt');
// 👤 v2.14 : la vérification de clé est morte — redirigée vers le portail client
Route::get('/verifier-licence', [HomeController::class, 'checkForm'])->name('license.check');
Route::post('/verifier-licence', [HomeController::class, 'checkLicense'])->name('license.check.post');

// ================= 👤 PORTAIL CLIENT (v2.14) =================
Route::get('/compte/connexion', [ClientAuthController::class, 'showLogin'])->name('client.login');
Route::post('/compte/connexion', [ClientAuthController::class, 'login'])->name('client.login.post');
Route::post('/compte/connexion/google', [ClientAuthController::class, 'loginGoogle'])->name('client.login.google');
Route::post('/compte/deconnexion', [ClientAuthController::class, 'logout'])->name('client.logout');
Route::get('/compte', [ClientPortalController::class, 'dashboard'])->name('client.dashboard');

// 🇬 « Se connecter avec Google » depuis les apps mobile/PC → code à usage unique
Route::get('/auth/google/app', [GoogleAuthController::class, 'appPage'])->name('google.app');
Route::post('/auth/google/app/callback', [GoogleAuthController::class, 'appCallback'])->name('google.app.callback');

// Changement de langue (bouton FR / EN)
Route::get('/lang/{locale}', [LangController::class, 'switch'])->name('lang.switch');

// ================= AUTH ADMIN (session web) =================
Route::get('/admin/login', [AdminAuthController::class, 'showLogin'])->name('login');
Route::post('/admin/login', [AdminAuthController::class, 'login'])->name('login.post');
Route::post('/admin/logout', [AdminAuthController::class, 'logout'])->name('admin.logout');

// ================= PANNEAU ADMIN =================
Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');

    Route::resource('plans', PlanController::class)->except(['show']);

    Route::get('orders', [OrderController::class, 'index'])->name('orders.index');
    Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show');
    Route::post('orders/{order}/validate', [OrderController::class, 'validateOrder'])->name('orders.validate');
    Route::post('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel');

    Route::get('licenses', [LicenseController::class, 'index'])->name('licenses.index');
    Route::post('licenses/{license}/toggle', [LicenseController::class, 'toggle'])->name('licenses.toggle');

    Route::get('payments', [PaymentMethodController::class, 'index'])->name('payments.index');
    Route::post('payments', [PaymentMethodController::class, 'store'])->name('payments.store');
    Route::get('payments/{payment}/edit', [PaymentMethodController::class, 'edit'])->name('payments.edit');
    Route::put('payments/{payment}', [PaymentMethodController::class, 'update'])->name('payments.update');
    Route::post('payments/{payment}/toggle', [PaymentMethodController::class, 'toggle'])->name('payments.toggle');
    Route::delete('payments/{payment}', [PaymentMethodController::class, 'destroy'])->name('payments.destroy');

    // 🏪 Boutique : logo (reçus PDF) + infos
    Route::get('settings', [SettingsController::class, 'index'])->name('settings.index');
    Route::post('settings/logo', [SettingsController::class, 'updateLogo'])->name('settings.logo');
    Route::delete('settings/logo', [SettingsController::class, 'deleteLogo'])->name('settings.logo.delete');

    Route::get('users', [WebUserController::class, 'index'])->name('users.index');
    Route::post('users', [WebUserController::class, 'store'])->name('users.store');
    Route::delete('users/{user}', [WebUserController::class, 'destroy'])->name('users.destroy');
});
