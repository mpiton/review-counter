import { describe, expect, it } from "vitest";
import {
  createFontFaceCss,
  createThemeCss,
  darkThemeTokens,
  lightThemeTokens,
  localFontAssets,
} from "./runtimeStyles";

describe("runtime UI styles", () => {
  it("defines the exact Vates theme tokens for dark and light system themes", () => {
    const css = createThemeCss(":host");

    expect(css).toContain(":host{");
    expect(css).toContain("@media (prefers-color-scheme: light)");

    for (const [token, value] of Object.entries(darkThemeTokens)) {
      expect(css).toContain(`${token}:${value};`);
    }

    for (const [token, value] of Object.entries(lightThemeTokens)) {
      expect(css).toContain(`${token}:${value};`);
    }
  });

  it("generates local font faces for Poppins and IBM Plex Mono", () => {
    const css = createFontFaceCss((path) => `extension://${path}`);

    expect(localFontAssets).toHaveLength(4);
    expect(css).toContain('font-family:"Poppins"');
    expect(css).toContain('font-family:"IBM Plex Mono"');
    expect(css).toContain("font-weight:400");
    expect(css).toContain("font-weight:600");
    expect(css).toContain('url("extension://fonts/poppins-latin-400.woff2")');
    expect(css).toContain('url("extension://fonts/ibm-plex-mono-latin-600.woff2")');
    expect(css).not.toContain("fonts.googleapis.com");
    expect(css).not.toContain("fonts.gstatic.com");
  });

  it("keeps text/background combinations at AA contrast or better", () => {
    const pairs = [
      [darkThemeTokens["--fg"], darkThemeTokens["--bg"]],
      [darkThemeTokens["--fg-muted"], darkThemeTokens["--bg"]],
      [darkThemeTokens["--fg"], darkThemeTokens["--surface"]],
      [darkThemeTokens["--fg-subtle"], darkThemeTokens["--surface"]],
      [lightThemeTokens["--fg"], lightThemeTokens["--bg"]],
      [lightThemeTokens["--fg-muted"], lightThemeTokens["--bg"]],
      [lightThemeTokens["--fg"], lightThemeTokens["--surface"]],
      [lightThemeTokens["--fg-subtle"], lightThemeTokens["--surface"]],
      [darkThemeTokens["--on-accent"], darkThemeTokens["--accent-fe"]],
      [darkThemeTokens["--on-accent"], darkThemeTokens["--accent-be"]],
      [darkThemeTokens["--on-badge-hot"], darkThemeTokens["--badge-hot"]],
    ] as const;

    for (const [foreground, background] of pairs) {
      expect(getContrastRatio(foreground, background)).toBeGreaterThanOrEqual(4.5);
    }
  });
});

function getContrastRatio(foreground: string, background: string): number {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function getRelativeLuminance(hexColor: string): number {
  const [red, green, blue] = parseHexColor(hexColor);

  return (
    0.2126 * getLinearChannel(red) +
    0.7152 * getLinearChannel(green) +
    0.0722 * getLinearChannel(blue)
  );
}

function getLinearChannel(channel: number): number {
  const normalized = channel / 255;

  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function parseHexColor(hexColor: string): readonly [number, number, number] {
  return [
    Number.parseInt(hexColor.slice(1, 3), 16),
    Number.parseInt(hexColor.slice(3, 5), 16),
    Number.parseInt(hexColor.slice(5, 7), 16),
  ];
}
