# Vates Review Counter - Guide d'installation

Ce guide explique comment installer l'extension en interne sur Chrome et Firefox.

## Prerequis

- Avoir un compte GitHub pouvant lire `vatesfr/xen-orchestra`.
- Creer un token GitHub avec le scope minimal `public_repo`.
- Installer la derniere version fournie dans la release GitHub du projet.

## Fichiers a utiliser

- Chrome : `vates-review-counter-0.1.1-chrome.zip`
- Firefox : `vates-review-counter-0.1.1-firefox-signed.xpi`
- Firefox AMO, si besoin de republier : `vates-review-counter-0.1.1-firefox-amo-upload.zip`
- Sources pour revue AMO : `vates-review-counter-0.1.1-firefox-source.zip`

## Installation Chrome

Option recommandee : Chrome Web Store prive, une fois la fiche validee.

1. Ouvrir le lien Chrome Web Store partage par l'equipe.
2. Cliquer sur **Ajouter a Chrome**.
3. Ouvrir `https://github.com/vatesfr/xen-orchestra`.
4. Cliquer sur **Ouvrir la configuration** dans l'overlay.
5. Coller le token GitHub, puis enregistrer.

Option manuelle si le Web Store n'est pas encore disponible :

1. Telecharger `vates-review-counter-0.1.1-chrome.zip`.
2. Extraire le zip dans un dossier local.
3. Ouvrir `chrome://extensions`.
4. Activer **Mode developpeur**.
5. Cliquer sur **Charger l'extension non empaquetee**.
6. Selectionner le dossier extrait.
7. Ouvrir `https://github.com/vatesfr/xen-orchestra`.
8. Configurer le token depuis l'overlay.

## Installation Firefox

Utiliser uniquement le fichier `.xpi` signe par Mozilla.

1. Telecharger `vates-review-counter-0.1.1-firefox-signed.xpi`.
2. Ouvrir Firefox.
3. Aller sur `about:addons`.
4. Cliquer sur la roue dentee.
5. Choisir **Installer un module depuis un fichier...**.
6. Selectionner le fichier `.xpi`.
7. Accepter l'installation.
8. Ouvrir `https://github.com/vatesfr/xen-orchestra`.
9. Configurer le token depuis l'overlay.

## Utilisation

Sur les pages du repository `vatesfr/xen-orchestra`, l'extension affiche un overlay en haut a
droite. Il compte les pull requests ouvertes ou les membres Vates sont demandes en review, avec
un regroupement frontend, backend et autres reviewers.

Le token GitHub reste stocke localement dans le navigateur et sert uniquement a appeler l'API
GitHub.

## Depannage

- Si l'overlay n'apparait pas, verifier que l'URL commence par
  `https://github.com/vatesfr/xen-orchestra`.
- Si les compteurs ne chargent pas, verifier que le token GitHub est encore valide.
- Si Firefox refuse le fichier, verifier que c'est bien le `.xpi` signe par Mozilla, pas le zip
  AMO non signe.
- Si Chrome refuse le chargement manuel, reextraire le zip dans un dossier propre puis relancer
  **Charger l'extension non empaquetee**.
