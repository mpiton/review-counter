# Privacy Policy

Vates Review Counter is an internal browser extension for the Vates team.

The extension displays a small overlay on GitHub pages for the `vatesfr/xen-orchestra`
repository and counts open pull requests where team members are requested for review.

## Data Processed

The extension processes only the data required for this internal feature:

- the GitHub Personal Access Token provided by the user;
- public GitHub metadata from the `vatesfr/xen-orchestra` repository, limited to open pull
  requests and requested reviewers;
- the local overlay position chosen by the user.

## Storage and Transmission

- The GitHub token is stored locally in the browser using `browser.storage.local`.
- The token is not synchronized with `storage.sync`.
- The token is used only by the extension background script.
- The token is sent only to `https://api.github.com/graphql` to authenticate GitHub API requests.
- Pull request review counts are cached locally for a short period to reduce GitHub API calls.
- The extension does not send data to a Vates server or to any third party other than GitHub.

## Data Sharing

Vates Review Counter does not sell, share, or transfer user data.

User data is not used for advertising, creditworthiness checks, lending, or any purpose unrelated
to the extension's core review-counting feature.

## Permissions

- `storage`: stores the GitHub token and overlay position locally.
- `https://api.github.com/*`: calls the GitHub GraphQL API.
- `https://github.com/vatesfr/*`: injects the overlay only on Vates GitHub repository pages.
