<?php

use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CashOperationController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\AccountingExportController;
use App\Http\Controllers\Api\ExportController;
use App\Http\Controllers\Api\InventoryController;
use App\Http\Controllers\Api\LabelController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\PushTokenController;
use App\Http\Controllers\Api\ReceiptController;
use App\Http\Controllers\Api\RecurringSaleController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\ShopController;
use App\Http\Controllers\Api\ShopsController;
use App\Http\Controllers\Api\StatsController;
use App\Http\Controllers\Api\StockAlertsController;
use App\Http\Controllers\Api\StockMovementController;
use App\Http\Controllers\Api\SupplierController;
use App\Http\Controllers\Api\TransfersController;
use App\Http\Controllers\Api\UserController;
use Illuminate\Support\Facades\Route;

// ---------------- Public ----------------
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
// 👤 v2.14 : échange du code « Se connecter avec Google » (browser → code → session app)
Route::post('/auth/google/exchange', [AuthController::class, 'exchangeGoogleCode'])->middleware('throttle:20,1');

// ---------------- Authentifié (token Sanctum) ----------------
Route::middleware('auth:sanctum')->group(function () {

    // Auth
    Route::get('/me', [AuthController::class, 'me']);
    Route::put('/password', [AuthController::class, 'updatePassword']);
    Route::post('/logout', [AuthController::class, 'logout']);

    // Tableau de bord
    Route::get('/dashboard', DashboardController::class);

    // Produits (les routes spécifiques AVANT apiResource pour éviter les conflits)
    Route::get('/products/low-stock', [ProductController::class, 'lowStock']);
    Route::get('/products/restock-forecast', [ProductController::class, 'restockForecast']); // 📈 rupture prévue
    Route::get('/products/barcode/{barcode}', [ProductController::class, 'findByBarcode']);
    Route::get('/products-labels.pdf', [LabelController::class, 'pdf']); // 🏷️ planche A4 d'étiquettes
    Route::post('/products/import', [ProductController::class, 'import']); // 📥 v2.13 : import CSV en masse (rapport détaillé)
    Route::post('/products/bulk-price', [ProductController::class, 'bulkPrice']) // 💰 v2.16 : mise à jour prix en lot
        ->middleware('role:admin,manager');
    Route::get('/products/{product}/price-history', [ProductController::class, 'priceHistory']); // 📈 v2.16 : historique des prix
    Route::delete('/products/{product}', [ProductController::class, 'destroy'])
        ->middleware('role:admin,manager');
    Route::apiResource('products', ProductController::class)->except(['destroy']);

    // Catégories & fournisseurs
    Route::delete('/categories/{category}', [CategoryController::class, 'destroy'])
        ->middleware('role:admin,manager');
    Route::apiResource('categories', CategoryController::class)->except(['destroy']);

    Route::delete('/suppliers/{supplier}', [SupplierController::class, 'destroy'])
        ->middleware('role:admin,manager');
    Route::apiResource('suppliers', SupplierController::class)->except(['destroy']);

    // Mouvements de stock
    Route::apiResource('movements', StockMovementController::class)->only(['index', 'store', 'show']);
    Route::delete('/movements/{movement}', [StockMovementController::class, 'destroy'])
        ->middleware('role:admin,manager');

    // Reçus de vente (boutique → ses clients)
    Route::get('/receipts', [ReceiptController::class, 'index']);
    Route::post('/receipts', [ReceiptController::class, 'store']);
    // 💳 Crédits clients (⚠️ AVANT /receipts/{receipt} pour éviter le conflit)
    Route::get('/receipts/credits', [ReceiptController::class, 'credits']);
    Route::get('/receipts/{receipt}', [ReceiptController::class, 'show']);
    Route::post('/receipts/{receipt}/payments', [ReceiptController::class, 'addPayment']); // 💳 versement
    Route::post('/receipts/by-uuid/{uuid}/payments', [ReceiptController::class, 'addPaymentByUuid']); // 🔁 v2.1 : versement file hors ligne

    // 👥 CRM clients (tout utilisateur connecté : consultation + ventes)
    Route::get('/customers', [CustomerController::class, 'index']);
    Route::post('/customers', [CustomerController::class, 'store']);
    Route::get('/customers/{customer}', [CustomerController::class, 'show']);
    Route::put('/customers/{customer}', [CustomerController::class, 'update']);
    Route::get('/receipts/{receipt}/pdf', [ReceiptController::class, 'pdf']);
    Route::get('/receipts/{receipt}/ticket', [ReceiptController::class, 'ticket']); // 🖨 80mm thermique

    // 🏪 Infos boutique (nom, contacts, logo) — pour l'app
    Route::get('/shop', [ShopController::class, 'show']);

    // 🏬 Boutiques (multi-boutiques) — lecture tout le staff, écriture admin
    Route::get('/shops', [ShopsController::class, 'index']);
    // 📍 v14 : alertes de stock par emplacement (boutique du user, siège, ou ?shop_id= admin/manager)
    Route::get('/stock-alerts', [StockAlertsController::class, 'index']);

    // 🔔 Tokens Expo Push du téléphone (login → store / logout → delete)
    Route::post('/push-tokens', [PushTokenController::class, 'store']);
    Route::delete('/push-tokens', [PushTokenController::class, 'destroy']);

    // Exports CSV (admin/manager)
    Route::middleware('role:admin,manager')->group(function () {
        Route::get('/export/products', [ExportController::class, 'products']);
        Route::get('/export/movements', [ExportController::class, 'movements']);
        Route::get('/accounting/export', [AccountingExportController::class, 'export']); // 🧾 v1.6 : CSV comptables mensuels
        Route::get('/accounting/summary', [AccountingExportController::class, 'summary']); // 📄 v1.7 : agrégats récap PDF
        Route::post('/accounting/email-pack', [AccountingExportController::class, 'emailPack']); // 📧 v2.1 : pack du jour par email (patron)
        Route::post('/accounting/email-weekly', [AccountingExportController::class, 'emailWeekly']); // 📧🧮 v2.3 : bilan hebdo par email (lundi)
        // 📊 Stats des ventes : par produit, vendeur, catégorie + détail produit
        Route::get('/stats/sales', [StatsController::class, 'sales']);
        Route::get('/stats/product-movements', [StatsController::class, 'productMovements']);
        Route::get('/stats/export.xlsx', [StatsController::class, 'exportSales']); // 📊 classeur Excel
        Route::get('/stats/margins', [StatsController::class, 'margins']); // 💰 rapport de marge
        Route::post('/receipts/{receipt}/refund', [ReceiptController::class, 'refund']); // ↩️ avoir
        Route::delete('/customers/{customer}', [CustomerController::class, 'destroy']);
        Route::post('/customers/notify-segment', [CustomerController::class, 'notifySegment']); // 👥 push segment
        // 💵 Z de caisse
        Route::get('/cash-ops/closings', [CashOperationController::class, 'closings']);
        Route::post('/cash-ops/close', [CashOperationController::class, 'close']);
        Route::get('/cash-closings/{cashClosing}/pdf', [CashOperationController::class, 'closingPdf']); // 📄 PDF du Z
        // 💵 Caisse (dépenses / sorties / apports)
        Route::get('/cash-ops', [CashOperationController::class, 'index']);
        Route::get('/cash-ops/summary', [CashOperationController::class, 'summary']);
        Route::get('/cash-ops/chart', [CashOperationController::class, 'chart']); // 📊 courbe trésorerie
        Route::post('/cash-ops', [CashOperationController::class, 'store']);
        Route::delete('/cash-ops/{cash_operation}', [CashOperationController::class, 'destroy']);
        // 🎯 Réglages boutique (seuils segments + rappels configurables)
        Route::get('/settings', [SettingController::class, 'index']);
        Route::put('/settings', [SettingController::class, 'update']);
        // 🔁 Ventes récurrentes / abonnements clients
        Route::post('/recurring-sales/{recurringSale}/run', [RecurringSaleController::class, 'runNow']);
        Route::apiResource('recurring-sales', RecurringSaleController::class)
            ->only(['index', 'store', 'update', 'destroy']);
        // 🔄 Inventaires physiques (snapshot → comptage/scan → validation)
        Route::get('/inventories', [InventoryController::class, 'index']);
        Route::post('/inventories', [InventoryController::class, 'store']);
        Route::get('/inventories/{inventory}', [InventoryController::class, 'show']);
        Route::post('/inventories/{inventory}/count', [InventoryController::class, 'count']);
        Route::post('/inventories/{inventory}/finish', [InventoryController::class, 'finish']);
        Route::delete('/inventories/{inventory}', [InventoryController::class, 'destroy']);
        // 📦 Bons de commande fournisseurs
        Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
        Route::post('/purchase-orders/generate', [PurchaseOrderController::class, 'generate']);
        Route::get('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'show']);
        Route::put('/purchase-orders/{purchaseOrder}/items/{item}', [PurchaseOrderController::class, 'updateItem']);
        Route::post('/purchase-orders/{purchaseOrder}/send', [PurchaseOrderController::class, 'send']);
        Route::post('/purchase-orders/{purchaseOrder}/receive', [PurchaseOrderController::class, 'receive']);
        Route::delete('/purchase-orders/{purchaseOrder}', [PurchaseOrderController::class, 'destroy']);
        Route::get('/purchase-orders/{purchaseOrder}/pdf', [PurchaseOrderController::class, 'pdf']);
        // 🔁 Transferts de stock inter-boutiques (siège ⇆ boutiques)
        Route::get('/transfers', [TransfersController::class, 'index']);
        Route::post('/transfers', [TransfersController::class, 'store']);
        Route::get('/transfers/{stockTransfer}', [TransfersController::class, 'show']);
        // 🚚 v14 : cycle en transit → réception validée (par la destination) + annulation (par la source)
        Route::post('/transfers/{stockTransfer}/receive', [TransfersController::class, 'receive']);
        Route::post('/transfers/{stockTransfer}/cancel', [TransfersController::class, 'cancel']);
    });

    // 🏬 Gestion des boutiques (admin uniquement)
    Route::middleware('role:admin')->group(function () {
        Route::post('/shops', [ShopsController::class, 'store']);
        Route::put('/shops/{shop}', [ShopsController::class, 'update']);
        Route::delete('/shops/{shop}', [ShopsController::class, 'destroy']);
    });

    // Utilisateurs (admin uniquement)
    Route::apiResource('users', UserController::class)->middleware('role:admin');

    // ---------- Administration mobile (admin uniquement) ----------
    Route::prefix('admin')->middleware('role:admin')->group(function () {
        Route::get('/overview', [AdminController::class, 'overview']);
        Route::get('/orders', [AdminController::class, 'orders']);
        Route::post('/orders/{order}/validate', [AdminController::class, 'validateOrder']);
        Route::post('/orders/{order}/cancel', [AdminController::class, 'cancelOrder']);
        Route::get('/licenses', [AdminController::class, 'licenses']);
        Route::post('/licenses/{license}/toggle', [AdminController::class, 'toggleLicense']);
        Route::post('/licenses/{license}/password-reset', [AdminController::class, 'resetLicensePassword']); // 👤 v2.14
        // 🏪 Logo de la boutique (sur les reçus PDF)
        Route::post('/shop-logo', [ShopController::class, 'uploadLogo']);
    });
});
