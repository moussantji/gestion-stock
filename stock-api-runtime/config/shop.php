<?php

/*
|---------------------------------------------------------------
| Boutique — infos affichées sur les reçus PDF de vente
| Surchargeable via le .env : SHOP_NAME, SHOP_PHONE, etc.
|---------------------------------------------------------------
*/
return [
    'name' => env('SHOP_NAME', env('APP_NAME', 'StockFlow')),
    'phone' => env('SHOP_PHONE', '+223 70 00 00 00'),
    'email' => env('SHOP_EMAIL', 'contact@stockflow.app'),
    'address' => env('SHOP_ADDRESS', 'Bamako, Mali'),
    'slogan' => env('SHOP_SLOGAN', 'Merci de votre confiance !'),
];
