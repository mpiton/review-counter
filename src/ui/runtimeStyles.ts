export const darkThemeTokens = {
  "--accent-be": "#31a88c",
  "--accent-fe": "#8f82ff",
  "--badge-hot": "#be1622",
  "--bg": "#1a1b38",
  "--border": "#33356a",
  "--fg": "#fffce4",
  "--fg-muted": "#9b9cc4",
  "--fg-subtle": "#9b9cc4",
  "--on-accent": "#1a1b38",
  "--on-badge-hot": "#fffce4",
  "--surface": "#25274c",
} as const;

export const lightThemeTokens = {
  "--accent-be": "#31a88c",
  "--accent-fe": "#8f82ff",
  "--badge-hot": "#be1622",
  "--bg": "#fffdf2",
  "--border": "#e6e0c4",
  "--fg": "#1a1b38",
  "--fg-muted": "#6c6d8c",
  "--fg-subtle": "#666783",
  "--on-accent": "#1a1b38",
  "--on-badge-hot": "#fffce4",
  "--surface": "#f4f0dc",
} as const;

export const localFontAssets = [
  {
    family: "Poppins",
    path: "fonts/poppins-latin-400.woff2",
    weight: 400,
  },
  {
    family: "Poppins",
    path: "fonts/poppins-latin-600.woff2",
    weight: 600,
  },
  {
    family: "IBM Plex Mono",
    path: "fonts/ibm-plex-mono-latin-400.woff2",
    weight: 400,
  },
  {
    family: "IBM Plex Mono",
    path: "fonts/ibm-plex-mono-latin-600.woff2",
    weight: 600,
  },
] as const;

export function createThemeCss(selector: string, leadingDeclarations = ""): string {
  return [
    `${selector}{${leadingDeclarations}${createTokenDeclarations(
      darkThemeTokens,
    )}color-scheme:dark;font-family:var(--font-sans);font-size:16px;}`,
    `@media (prefers-color-scheme: light){${selector}{${createTokenDeclarations(
      lightThemeTokens,
    )}color-scheme:light;}}`,
  ].join("\n");
}

export function createFontFaceCss(resolveAssetUrl: (path: string) => string): string {
  return localFontAssets
    .map(
      (font) =>
        `@font-face{font-family:"${font.family}";font-style:normal;font-weight:${font.weight};font-display:swap;src:url("${resolveAssetUrl(
          font.path,
        )}") format("woff2");}`,
    )
    .join("\n");
}

export function installRuntimeStyles(document: Document, id: string, css: string): void {
  const existingStyle = document.getElementById(id);

  if (existingStyle instanceof HTMLStyleElement) {
    existingStyle.textContent = css;
    return;
  }

  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.append(style);
}

function createTokenDeclarations(tokens: Record<string, string>): string {
  return Object.entries(tokens)
    .map(([token, value]) => `${token}:${value};`)
    .join("");
}
