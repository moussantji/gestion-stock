<?php

use App\Http\Controllers\Web\Admin\DashboardController;
use App\Http\Controllers\Web\Admin\LicenseController;
use App\Http\Controllers\Web\Admin\OrderController;
use App\Http\Controllers\Web\Admin\ProductController;
use App\Http\Controllers\Web\Admin\MovementController;
use App\Http\Controllers\Web\Admin\PaymentMethodController;
use App\Http\Controllers\Web\Admin\SaleController;
use App\Http\Controllers\Web\Admin\CustomerController;
use App\Http\Controllers\Web\Admin\PlanController;
use App\Http\Controllers\Web\Admin\SettingsController;
use App\Http\Controllers\Web\Admin\StatsController;
use App\Http\Controllers\Web\Admin\SupplierController;
use App\Http\Controllers\Web\Admin\InventoryController;
use App\Http\Controllers\Web\Admin\PurchaseOrderController;
use App\Http\Controllers\Web\Admin\CashController;
use App\Http\Controllers\Web\Admin\AlertController;
use App\Http\Controllers\Web\Admin\ExportController;
use App\Http\Controllers\Web\Admin\WebUserController;
use App\Http\Controllers\Web\AdminAuthController;
use App\Http\Controllers\Web\ClientAuthController;
use App\Http\Controllers\Web\ClientPortalController;
use App\Http\Controllers\Web\HomeController;
use App\Http\Controllers\Web\LangController;
use App\Http\Controllers\Web\MediaController;
use Illuminate\Support\Facades\Route;

// ================= SITE PUBLIC =================
Route::get('/', [HomeController::class, 'home'])->name('home');
Route::get('/media/products/{path}', [MediaController::class, 'product'])->where('path', '.*')->name('media.product');
Route::get('/acheter/{plan:slug}', [HomeController::class, 'checkout'])->name('checkout');
Route::post('/acheter/{plan:slug}', [HomeController::class, 'purchase'])->name('purchase');
Route::get('/commande/{order:reference}', [HomeController::class, 'confirmation'])->name('order.confirmation');
Route::get('/commande/{order:reference}/recu', [\App\Http\Controllers\Web\ReceiptController::class, 'orderReceipt'])->name('order.receipt');
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
Route::get('/auth/google/app', [\App\Http\Controllers\Web\GoogleAuthController::class, 'appPage'])->name('google.app');
Route::post('/auth/google/app/callback', [\App\Http\Controllers\Web\GoogleAuthController::class, 'appCallback'])->name('google.app.callback');

// Changement de langue (bouton FR / EN)
Route::get('/lang/{locale}', [LangController::class, 'switch'])->name('lang.switch');

// ================= AUTH ADMIN (session web) =================
Route::get('/admin/login', [AdminAuthController::class, 'showLogin'])->name('login');
Route::post('/admin/login', [AdminAuthController::class, 'login'])->name('login.post');
Route::post('/admin/logout', [AdminAuthController::class, 'logout'])->name('admin.logout');

// ================= PANNEAU ADMIN =================
Route::middleware(['auth', 'role:admin,manager,employee'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('products', [ProductController::class, 'index'])->name('products.index');
    Route::get('products/create', [ProductController::class, 'create'])->name('products.create')->middleware('role:admin,manager');
    Route::post('products', [ProductController::class, 'store'])->name('products.store')->middleware('role:admin,manager');
    Route::get('products/{product}', [ProductController::class, 'show'])->name('products.show');
    Route::get('products/{product}/edit', [ProductController::class, 'edit'])->name('products.edit')->middleware('role:admin,manager');
    Route::put('products/{product}', [ProductController::class, 'update'])->name('products.update')->middleware('role:admin,manager');
    Route::get('movements', [MovementController::class, 'index'])->name('movements.index');
    Route::get('movements/create', [MovementController::class, 'create'])->name('movements.create')->middleware('role:admin,manager');
    Route::post('movements', [MovementController::class, 'store'])->name('movements.store')->middleware('role:admin,manager');
    Route::get('sales', [SaleController::class, 'index'])->name('sales.index');
    Route::get('sales/create', [SaleController::class, 'create'])->name('sales.create');
    Route::post('sales', [SaleController::class, 'store'])->name('sales.store');
    Route::get('sales/{sale}', [SaleController::class, 'show'])->name('sales.show');
    Route::get('sales/{sale}/pdf', [SaleController::class, 'pdf'])->name('sales.pdf');
    Route::get('customers', [CustomerController::class, 'index'])->name('customers.index');
    Route::get('customers/create', [CustomerController::class, 'create'])->name('customers.create')->middleware('role:admin,manager');
    Route::post('customers', [CustomerController::class, 'store'])->name('customers.store')->middleware('role:admin,manager');
    Route::get('customers/{customer}', [CustomerController::class, 'show'])->name('customers.show');
    Route::get('stats', [StatsController::class, 'index'])->name('stats.index');
    Route::get('suppliers', [SupplierController::class, 'index'])->name('suppliers.index');
    Route::get('suppliers/create', [SupplierController::class, 'create'])->name('suppliers.create')->middleware('role:admin,manager');
    Route::post('suppliers', [SupplierController::class, 'store'])->name('suppliers.store')->middleware('role:admin,manager');
    Route::get('suppliers/{supplier}/edit', [SupplierController::class, 'edit'])->name('suppliers.edit')->middleware('role:admin,manager');
    Route::put('suppliers/{supplier}', [SupplierController::class, 'update'])->name('suppliers.update')->middleware('role:admin,manager');
    Route::get('inventories', [InventoryController::class, 'index'])->name('inventories.index');
    Route::get('inventories/create', [InventoryController::class, 'create'])->name('inventories.create');
    Route::post('inventories', [InventoryController::class, 'store'])->name('inventories.store')->middleware('role:admin,manager');
    Route::get('inventories/{inventory}', [InventoryController::class, 'show'])->name('inventories.show');
    Route::put('inventories/{inventory}', [InventoryController::class, 'update'])->name('inventories.update')->middleware('role:admin,manager');
    Route::get('purchase-orders', [PurchaseOrderController::class, 'index'])->name('purchase-orders.index');
    Route::get('purchase-orders/create', [PurchaseOrderController::class, 'create'])->name('purchase-orders.create');
    Route::post('purchase-orders', [PurchaseOrderController::class, 'store'])->name('purchase-orders.store')->middleware('role:admin,manager');
    Route::get('purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show'])->name('purchase-orders.show');
    Route::post('purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive'])->name('purchase-orders.receive')->middleware('role:admin,manager');
    Route::get('cash', [CashController::class, 'index'])->name('cash.index');
    Route::get('cash/create', [CashController::class, 'create'])->name('cash.create');
    Route::post('cash', [CashController::class, 'store'])->name('cash.store')->middleware('role:admin,manager');
    Route::post('cash/close', [CashController::class, 'close'])->name('cash.close')->middleware('role:admin,manager');
    Route::get('alerts', [AlertController::class, 'index'])->name('alerts.index');
    Route::get('exports/products.csv', [ExportController::class, 'products'])->name('exports.products');
    Route::get('exports/movements.csv', [ExportController::class, 'movements'])->name('exports.movements');
    Route::get('exports/sales.csv', [ExportController::class, 'sales'])->name('exports.sales');
    Route::get('customers/{customer}/edit', [CustomerController::class, 'edit'])->name('customers.edit')->middleware('role:admin,manager');
    Route::put('customers/{customer}', [CustomerController::class, 'update'])->name('customers.update')->middleware('role:admin,manager');

    Route::resource('plans', PlanController::class)->except(['show'])->middleware('role:admin');

    Route::get('orders', [OrderController::class, 'index'])->name('orders.index')->middleware('role:admin');
    Route::get('orders/{order}', [OrderController::class, 'show'])->name('orders.show')->middleware('role:admin');
    Route::post('orders/{order}/validate', [OrderController::class, 'validateOrder'])->name('orders.validate')->middleware('role:admin');
    Route::post('orders/{order}/cancel', [OrderController::class, 'cancel'])->name('orders.cancel')->middleware('role:admin');

    Route::get('licenses', [LicenseController::class, 'index'])->name('licenses.index')->middleware('role:admin');
    Route::post('licenses/{license}/toggle', [LicenseController::class, 'toggle'])->name('licenses.toggle')->middleware('role:admin');

    Route::get('payments', [PaymentMethodController::class, 'index'])->name('payments.index')->middleware('role:admin');
    Route::post('payments', [PaymentMethodController::class, 'store'])->name('payments.store')->middleware('role:admin');
    Route::get('payments/{payment}/edit', [PaymentMethodController::class, 'edit'])->name('payments.edit');
    Route::put('payments/{payment}', [PaymentMethodController::class, 'update'])->name('payments.update');
    Route::post('payments/{payment}/toggle', [PaymentMethodController::class, 'toggle'])->name('payments.toggle');
    Route::delete('payments/{payment}', [PaymentMethodController::class, 'destroy'])->name('payments.destroy');

    // 🏪 Boutique : logo (reçus PDF) + infos
    Route::get('settings', [SettingsController::class, 'index'])->name('settings.index')->middleware('role:admin');
    Route::post('settings/logo', [SettingsController::class, 'updateLogo'])->name('settings.logo')->middleware('role:admin');
    Route::delete('settings/logo', [SettingsController::class, 'deleteLogo'])->name('settings.logo.delete')->middleware('role:admin');

    Route::get('users', [WebUserController::class, 'index'])->name('users.index')->middleware('role:admin');
    Route::get('users/{user}/edit', [WebUserController::class, 'edit'])->name('users.edit')->middleware('role:admin');
    Route::post('users', [WebUserController::class, 'store'])->name('users.store')->middleware('role:admin');
    Route::put('users/{user}', [WebUserController::class, 'update'])->name('users.update')->middleware('role:admin');
    Route::delete('users/{user}', [WebUserController::class, 'destroy'])->name('users.destroy')->middleware('role:admin');
});
