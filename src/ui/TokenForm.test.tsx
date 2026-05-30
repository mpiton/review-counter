/**
 * @vitest-environment happy-dom
 */
import { act } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TokenForm } from "../../entrypoints/popup/TokenForm";

const mountedRoots: MountedRoot[] = [];

interface MountedRoot {
  readonly container: HTMLDivElement;
  readonly root: Root;
}

describe("TokenForm", () => {
  afterEach(() => {
    for (const mountedRoot of mountedRoots.splice(0)) {
      act(() => mountedRoot.root.unmount());
      mountedRoot.container.remove();
    }
    vi.restoreAllMocks();
  });

  it("labels the token visibility toggle for assistive technology", () => {
    const { container } = renderTokenForm();
    const toggle = getButton(container, "Afficher le token");

    expect(toggle).not.toBeNull();

    act(() => toggle.click());

    expect(getButton(container, "Masquer le token")).not.toBeNull();
  });
});

function renderTokenForm(): MountedRoot {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);

  act(() =>
    root.render(
      <TokenForm
        onSaveToken={async () => "connected"}
        onStatusChange={() => undefined}
        status="idle"
      />,
    ),
  );

  const mountedRoot = { container, root } satisfies MountedRoot;
  mountedRoots.push(mountedRoot);

  return mountedRoot;
}

function getButton(container: HTMLElement, name: string): HTMLButtonElement {
  const button = [...container.querySelectorAll("button")].find(
    (candidate) => candidate.getAttribute("aria-label") === name,
  );

  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Button not found: ${name}`);
  }

  return button;
}
