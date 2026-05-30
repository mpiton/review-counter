/** Prevents storing accidental pasted payloads while staying above current GitHub PAT lengths. */
export const GITHUB_TOKEN_MAX_LENGTH = 100;

/** Limits shoulder-surfing exposure after the user temporarily reveals the token. */
export const TOKEN_REVEAL_DURATION_MS = 15_000;

/** Pre-filled GitHub settings URL for creating a PAT with the required public_repo scope. */
export const TOKEN_SETTINGS_URL =
  "https://github.com/settings/tokens/new?scopes=public_repo&description=Vates%20Review%20Counter";

/** Vates planet mark used in the compact popup header. */
export const PLANET_LOGO_URL =
  "https://vates.tech/blog/content/images/2022/12/png-vates-planetonly.png";
