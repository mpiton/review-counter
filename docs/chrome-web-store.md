# Chrome Web Store Listing

## Short Description

Compteur interne des reviews GitHub demandées sur `vatesfr/xen-orchestra`, regroupées par équipe.

## Detailed Description

Vates Review Counter est une extension interne pour l'équipe Vates.

Sur les pages GitHub du repository `vatesfr/xen-orchestra`, l'extension affiche un overlay discret
qui compte les pull requests ouvertes où chaque membre est demandé en review. Les compteurs sont
regroupés par équipe frontend, backend et autres reviewers non configurés.

Fonctionnalités principales :

- comptage des reviewers demandés sur les pull requests ouvertes ;
- regroupement frontend, backend et autres ;
- rafraîchissement manuel ;
- cache local court pour limiter les appels API GitHub ;
- configuration d'un Personal Access Token GitHub depuis le popup de l'extension.

L'extension est entièrement client-side : il n'y a aucun serveur Vates entre le navigateur et GitHub.

## Privacy Text

Vates Review Counter traite uniquement les données nécessaires à son fonctionnement interne.

Données traitées :

- Personal Access Token GitHub fourni par l'utilisateur ;
- données publiques du repository GitHub `vatesfr/xen-orchestra`, notamment les pull requests ouvertes
  et les reviewers demandés ;
- position locale de l'overlay dans l'interface.

Stockage et transmission :

- le token GitHub est stocké dans `browser.storage.local` du navigateur ;
- le token n'est jamais synchronisé via `storage.sync` ;
- le token est utilisé uniquement par le background script de l'extension ;
- le token est transmis uniquement à `https://api.github.com/graphql` pour interroger l'API GitHub ;
- les données ne sont pas envoyées à un serveur Vates ou à un tiers autre que GitHub ;
- l'extension ne vend pas, ne partage pas et ne transfère pas les données utilisateur.

Permissions :

- `storage` : stocker localement le token GitHub et la position de l'overlay ;
- `https://api.github.com/*` : appeler l'API GitHub GraphQL ;
- `https://github.com/vatesfr/*` : injecter l'overlay uniquement sur les pages GitHub Vates.

## Store Assets

Extension icons use the Vates planet mark, stored locally in `public/icons/vates-planet.png`,
with a small review badge added for the extension:

- `public/icons/icon-16.png`
- `public/icons/icon-32.png`
- `public/icons/icon-48.png`
- `public/icons/icon-128.png`

Source asset:

- `docs/chrome-web-store-assets/vates-planet-source.png`

Chrome Web Store upload assets:

- Store icon: `public/icons/icon-128.png`
- Screenshot: `docs/chrome-web-store-assets/screenshot-1280x800.png`
- Small promotional image: `docs/chrome-web-store-assets/small-promo-440x280.png`
- Marquee promotional image: `docs/chrome-web-store-assets/marquee-promo-1400x560.png`
