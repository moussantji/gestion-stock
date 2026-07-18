<?php

// 👤 v2.14 — « Se connecter avec Google » (portail + apps, jeton d'ID GIS).
// Crée un « Client ID Web » sur https://console.cloud.google.com → identifiants
// avec l'origine JS autorisée = ton domaine (ex. https://stockflow.app),
// puis renseigne GOOGLE_CLIENT_ID dans le .env. Vide → boutons masqués/501.
return [
    'client_id' => env('GOOGLE_CLIENT_ID'),
];
