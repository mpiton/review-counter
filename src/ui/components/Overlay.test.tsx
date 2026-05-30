/**
 * @vitest-environment happy-dom
 */
import { act } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { TeamReviewCounts } from "../../domain";
import { Overlay, PlanetButton } from "./index";
import type { OverlayStateKind } from "./types";

const planetImageUrl = "https://example.com/planet.png";
const position = { right: 24, bottom: 24 };
const counts = {
  frontend: [
    { login: "alice-gh", displayName: "Alice", count: 4 },
    { login: "chloe-gh", displayName: "Chloe", count: 0 },
  ],
  backend: [{ login: "dan-gh", displayName: "Daniel", count: 2 }],
  others: [{ login: "ext-gh", displayName: "ext-gh", count: 1 }],
} satisfies TeamReviewCounts;

const mountedRoots: MountedRoot[] = [];

interface MountedRoot {
  readonly container: HTMLDivElement;
  readonly root: Root;
}

describe("overlay components", () => {
  afterEach(() => {
    for (const mountedRoot of mountedRoots.splice(0)) {
      act(() => mountedRoot.root.unmount());
      mountedRoot.container.remove();
    }
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders team sections, others, footer metadata, and hot badges", () => {
    const { container } = renderOverlay({ state: "ok" });

    expect(container.textContent).toContain("FRONTEND");
    expect(container.textContent).toContain("BACKEND");
    expect(container.textContent).toContain("AUTRES");
    expect(container.textContent).toContain("Alice");
    expect(container.textContent).toContain("4");
    expect(container.textContent).toContain("12 PR ouvertes · maj il y a 30 s");
    expect(container.querySelector("[title='Charge élevée']")?.className).toContain("badge-hot");
  });

  it("renders zero open pull requests with plural wording", () => {
    const { container } = renderOverlay({
      openPullRequestCount: 0,
      state: "empty",
    });

    expect(container.textContent).toContain("0 PR ouvertes");
  });

  it.each([
    ["empty", "Aucune PR ouverte"],
    ["no-token", "Configurez votre token GitHub"],
    ["auth-error", "Token invalide ou expiré"],
    ["rate-limit", "Limite API atteinte"],
    ["network-error", "Connexion impossible"],
  ] satisfies readonly [OverlayStateKind, string][])("renders the %s state", (state, title) => {
    const { container } = renderOverlay({ state });

    expect(container.textContent).toContain(title);
  });

  it("runs degraded state actions", async () => {
    const onOpenConfiguration = vi.fn();
    const onRefresh = vi.fn(async () => undefined);
    let rendered = renderOverlay({ onOpenConfiguration, state: "no-token" });

    clickButton(rendered.container, "Ouvrir la configuration");

    expect(onOpenConfiguration).toHaveBeenCalledTimes(1);

    rendered = renderOverlay({ onRefresh, state: "network-error" });
    clickButton(rendered.container, "Réessayer");
    await flushMicrotasks();

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    renderOverlay({ onClose, state: "ok" });

    act(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" })));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is focusable and exposes accessible labels for icon controls", () => {
    const { container } = renderOverlay({ state: "ok" });
    const dialog = container.querySelector("[role='dialog']");

    expect(dialog?.getAttribute("tabindex")).toBe("0");
    expect(getButton(container, "Rafraîchir")).not.toBeNull();
    expect(getButton(container, "Fermer (Esc)")).not.toBeNull();
  });

  it("keeps badge values readable without relying only on color", () => {
    const { container } = renderOverlay({ state: "ok" });
    const hotBadge = container.querySelector("[aria-label='4 reviews en attente, charge élevée']");
    const regularBadge = container.querySelector("[aria-label='2 reviews en attente']");
    const zeroBadge = container.querySelector("[aria-label='Aucune review en attente']");

    expect(hotBadge?.textContent).toBe("4");
    expect(hotBadge?.className.toString()).toContain("bg-[var(--badge-hot)]");
    expect(hotBadge?.className.toString()).toContain("text-[var(--on-badge-hot)]");
    expect(regularBadge?.textContent).toBe("2");
    expect(regularBadge?.className.toString()).toContain("text-[var(--on-accent)]");
    expect(zeroBadge?.textContent).toBe("0");
  });

  it("shows a refresh spinner while refresh is in progress", async () => {
    const onRefresh = vi.fn(async () => undefined);
    const { container } = renderOverlay({ onRefresh, state: "ok" });

    clickButton(container, "Rafraîchir");
    await flushMicrotasks();

    const refreshIcon = getButton(container, "Rafraîchir").querySelector("span");
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(refreshIcon?.className).toContain("animate-spin");
  });

  it("handles refresh rejection and resets the spinner", async () => {
    vi.useFakeTimers();
    const onRefresh = vi.fn(async () => {
      throw new Error("refresh failed");
    });
    const { container } = renderOverlay({ onRefresh, state: "ok" });

    clickButton(container, "Rafraîchir");
    await act(async () => undefined);

    const refreshIcon = getButton(container, "Rafraîchir").querySelector("span");
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(refreshIcon?.className).toContain("animate-spin");

    act(() => vi.advanceTimersByTime(850));

    expect(refreshIcon?.className).not.toContain("animate-spin");
  });

  it("renders the collapsed launcher count and alert marker", () => {
    const { container, root } = render(
      <PlanetButton
        onClick={() => undefined}
        planetImageUrl={planetImageUrl}
        position={position}
        state="ok"
        total={7}
      />,
    );

    expect(container.textContent).toContain("7");

    act(() => {
      root.render(
        <PlanetButton
          onClick={() => undefined}
          planetImageUrl={planetImageUrl}
          position={position}
          state="auth-error"
          total={0}
        />,
      );
    });

    expect(hasElementWithClass(container, "bg-[#be1622]")).toBe(true);

    act(() => {
      root.render(
        <PlanetButton
          onClick={() => undefined}
          planetImageUrl={planetImageUrl}
          position={position}
          state="rate-limit"
          total={0}
        />,
      );
    });

    expect(hasElementWithClass(container, "bg-[#be1622]")).toBe(true);
  });
});

function renderOverlay(overrides: Partial<Parameters<typeof Overlay>[0]> = {}): MountedRoot {
  return render(
    <Overlay
      data={counts}
      freshness="il y a 30 s"
      onClose={() => undefined}
      onOpenConfiguration={() => undefined}
      onPositionChange={() => undefined}
      onRefresh={async () => undefined}
      openPullRequestCount={12}
      planetImageUrl={planetImageUrl}
      position={position}
      state="ok"
      {...overrides}
    />,
  );
}

function render(element: ReactNode): MountedRoot {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() => root.render(element));

  const mountedRoot = { container, root } satisfies MountedRoot;
  mountedRoots.push(mountedRoot);

  return mountedRoot;
}

function hasElementWithClass(container: HTMLElement, className: string): boolean {
  return [...container.querySelectorAll("*")].some((element) =>
    element.className.toString().includes(className),
  );
}

function clickButton(container: HTMLElement, name: string): void {
  act(() => getButton(container, name).click());
}

async function flushMicrotasks(): Promise<void> {
  await act(async () => undefined);
}

function getButton(container: HTMLElement, name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) =>
      candidate.textContent?.includes(name) || candidate.getAttribute("aria-label") === name,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${name}`);
  }

  return button;
}
