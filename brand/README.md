# 🎨 StockFlow — Identité visuelle (brand kit)

Logo **v2** (17/07/2026) : boîte ouverte blanche + flèche de flux ascendante, dégradé violet
`#4C32D8 → #7C5CFF`, barre accent cyan `#22D3EE`.

## Fichiers sources

| Fichier | Rôle |
|---|---|
| `brand/icon-master.png` | **Master 1024×1024** (tuile plein cadre, fond dégradé) — source de toutes les dérivations |
| `brand/icon-master-src.png` | Rendu IA d'origine (avec marges), conservé pour archive |
| `brand/showcase.png` | Image vitrine 3 appareils (marketing, site, réseaux) |
| `stock-api/public/icon.svg` | **Version vectorielle** du logo (recréée à la main, remplace l'ancien « SF ») |

## Où chaque icône vit (déjà en place)

### 🖥 App PC (`stock-pc/`)
- `electron/icon.png` — 512×512 (Linux/Mac, configuré dans `package.json`)
- `electron/icon.ico` — multi-tailles 16→256 (**Windows**, `win.icon` dans `package.json`)
- ⚠️ Rebuild l'installateur (`npm run pack:win`…) pour graver la nouvelle icône dans l'exécutable.

### 📱 App mobile (`stock-app/` — ton projet Expo)
- `assets/icon.png` — 1024×1024 (iOS masque les coins tout seul)
- `assets/adaptive-icon.png` — foreground Android (glyphe 66 %, fond transparent)
- `assets/splash-icon.png` — écran de démarrage
- `assets/favicon.png` — build web Expo

Branche-les dans ton `app.json` si ce n'est pas déjà fait :

```json
{
  "expo": {
    "icon": "./assets/icon.png",
    "splash": { "image": "./assets/splash-icon.png", "backgroundColor": "#4C32D8" },
    "android": { "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png", "backgroundColor": "#4C32D8" } },
    "web": { "favicon": "./assets/favicon.png" }
  }
}
```

### 🌐 Site + admin (`stock-api/public/`)
Tout est **déjà branché** dans `resources/views/layouts/` (aucun layout à modifier) :
- `icon.svg` (vectoriel), `favicon.ico` (16/32/48), `favicon-16.png`, `favicon-32.png`
- `apple-touch-icon.png` (180, coins arrondis façon iOS)
- `icon-192.png`, `icon-512.png`, `icon-512-maskable.png` (PWA, safe-zone 80 %)
- `manifest.webmanifest` — `theme_color` harmonisé `#7C5CFF`

## Régénérer toutes les tailles

Tout est dérivé du master par script (Pillow, poste de build uniquement — **zéro dépendance ajoutée aux applications**) :
`python3` + `PIL` → crop de la tuile, `resize` LANCZOS, masque coins arrondis (22,4 %),
safe-zone maskable 80 %, `icon.ico` multi-résolutions.
