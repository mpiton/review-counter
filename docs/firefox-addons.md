# Firefox Add-ons Submission

## Upload Package

Upload the Firefox build artifact:

- `.output/vates-review-counter-0.1.0-firefox.zip`

## Source Package

Because the extension is built from TypeScript, React, Tailwind, and WXT/Vite, attach the source
package for AMO review:

- `.output/vates-review-counter-0.1.0-source.zip`

Reviewer build instructions:

```bash
pnpm install --frozen-lockfile
pnpm zip:firefox
```

The generated add-on package is written to `.output/vates-review-counter-0.1.0-firefox.zip`.

Dependencies are restored from the public npm registry through `pnpm` using `pnpm-lock.yaml`.

## Listing

Name:

```text
Vates Review Counter
```

Summary:

```text
Compte les PR ouvertes où les membres Vates sont demandés en review.
```

Description:

```text
Vates Review Counter est une extension interne pour l'équipe Vates.

Sur les pages GitHub du repository vatesfr/xen-orchestra, l'extension affiche un overlay discret qui compte les pull requests ouvertes où chaque membre est demandé en review. Les compteurs sont regroupés par équipe frontend, backend et autres reviewers non configurés.

L'extension est entièrement client-side : il n'y a aucun serveur Vates entre le navigateur et GitHub.
```

Category:

```text
Developer Tools
```

## Privacy

Privacy policy URL:

```text
https://github.com/mpiton/review-counter/blob/main/docs/privacy-policy.md
```

Required data categories declared in the Firefox manifest:

- `authenticationInfo`: the GitHub Personal Access Token is sent only to GitHub's GraphQL API.
- `websiteContent`: public GitHub pull request and requested reviewer data is processed to display
  team review counts.

Minimum Firefox version:

```text
140.0
```

This uses Firefox's built-in data collection consent screen instead of adding a custom consent flow
for older Firefox versions.

Optional data categories:

- none

Data sale or unrelated transfer:

```text
No
```

Notes for reviewers:

```text
The GitHub token is stored locally in browser.storage.local and is used only by the background script to call https://api.github.com/graphql. The extension does not send data to a Vates server or to any third party other than GitHub.
```
