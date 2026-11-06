// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import {
  CLIENT_ID_STORAGE_KEY,
  maskClientId,
  SPOTIFY_ACCOUNT_APPS_URL,
} from "../spotify/clientId";
import { OAUTH_ERROR_MESSAGE } from "../spotify/pkce";
import { STAY_SIGNED_IN_KEY } from "../spotify/tokenStore";

const { loadSignedInSdk } = vi.hoisted(() => ({
  loadSignedInSdk: vi.fn(),
}));

vi.mock("../spotify/session", () => ({
  abandonSpotifyConnection: () => {},
  loadSignedInSdk,
}));

const VALID_ID = `abcd${"e".repeat(24)}wxyz`;

function installBrowserShims() {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false;
      },
    }),
  });
  if (!("ResizeObserver" in window)) {
    class ResizeObserverShim {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      configurable: true,
      value: ResizeObserverShim,
    });
  }
  if (!HTMLElement.prototype.scrollIntoView) {
    HTMLElement.prototype.scrollIntoView = () => {};
  }
}

installBrowserShims();

let root: Root | null = null;
let container: HTMLDivElement | null = null;

function content(): HTMLElement {
  const found = document.querySelector(".ant-layout-content");
  if (!(found instanceof HTMLElement)) throw new Error("missing page content");
  return found;
}

function header(): HTMLElement {
  const found = document.querySelector(".ant-layout-header");
  if (!(found instanceof HTMLElement)) throw new Error("missing header");
  return found;
}

function accountButton(): HTMLButtonElement | null {
  const found = document.querySelector('button[aria-label^="Spotify account"]');
  return found instanceof HTMLButtonElement ? found : null;
}

function menuItems(): HTMLElement[] {
  return [...document.querySelectorAll('[role="menuitem"]')].filter(
    (item): item is HTMLElement => item instanceof HTMLElement
  );
}

function menuItem(name: string): HTMLElement {
  const found = menuItems().find((item) => item.textContent?.trim() === name);
  if (!found) {
    throw new Error(
      `missing menu item ${name}; saw ${menuItems()
        .map((item) => item.textContent?.trim())
        .join(", ")}`
    );
  }
  return found;
}

function settingsDialog(): HTMLElement {
  const found = [...document.querySelectorAll('[role="dialog"]')].find(
    (dialog) => dialog.textContent?.includes("Spotify settings")
  );
  if (!(found instanceof HTMLElement)) throw new Error("missing Spotify settings panel");
  return found;
}

function buttonNamed(name: string, scope: ParentNode = document): HTMLButtonElement {
  const found = [...scope.querySelectorAll("button")].find(
    (button) => button.textContent?.trim() === name
  );
  if (!(found instanceof HTMLButtonElement)) {
    throw new Error(`missing button ${name}`);
  }
  return found;
}

async function click(element: HTMLElement) {
  await act(async () => {
    element.click();
  });
}

async function waitFor(label: string, ready: () => boolean) {
  const started = Date.now();
  while (Date.now() - started < 2000) {
    if (ready()) return;
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
  }
  throw new Error(`timed out waiting for ${label}`);
}

async function mount(href: string, prepare?: () => void) {
  window.location.href = href;
  window.localStorage.clear();
  window.sessionStorage.clear();
  prepare?.();
  vi.resetModules();
  const { default: App } = await import("../App.tsx");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root?.render(<App />);
  });
}

async function unmount() {
  const current = root;
  root = null;
  if (current) {
    await act(async () => {
      current.unmount();
    });
  }
  container?.remove();
  container = null;
  document.querySelectorAll(".ant-drawer, .ant-dropdown").forEach((node) => {
    node.remove();
  });
}

async function openMenu() {
  const button = accountButton();
  if (!button) throw new Error("missing Spotify account control");
  await click(button);
  await waitFor("account menu", () => menuItems().length > 0);
}

async function openSettings() {
  await openMenu();
  await click(menuItem("Settings"));
  await waitFor(
    "settings panel",
    () => document.body.textContent?.includes("Spotify settings") ?? false
  );
}

describe("Spotify account menu", () => {
  afterEach(async () => {
    await unmount();
    loadSignedInSdk.mockReset();
  });

  it("keeps the setup screen when no Client ID is stored", async () => {
    await mount("http://127.0.0.1:5173/");

    expect(content().textContent).toContain("Connect Spotify");
    expect(content().querySelector('[aria-label="Spotify Client ID"]')).not.toBeNull();
    expect(content().querySelector('[aria-label="Course GPX file"]')).toBeNull();
    expect(accountButton()).toBeNull();
    expect(document.body.textContent).not.toContain("Spotify settings");
    expect(menuItems()).toHaveLength(0);
  });

  it("opens settings from the header when a Client ID is set but signed out", async () => {
    await mount("http://127.0.0.1:5173/", () => {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, VALID_ID);
    });

    expect(content().querySelector('[aria-label="Course GPX file"]')).not.toBeNull();
    expect(content().textContent).toContain("Select a Playlist");
    expect(content().textContent).not.toContain("Connect Spotify");
    expect(content().textContent).not.toContain("Spotify settings");
    expect(document.body.textContent).not.toContain("Revoke this app on Spotify");
    expect(accountButton()?.textContent).toContain("Account");

    await openMenu();
    expect(menuItems().map((item) => item.textContent?.trim())).toEqual([
      "Settings",
      "Sign in",
      "Sign out",
    ]);

    await click(menuItem("Settings"));
    const panel = settingsDialog();
    expect(content().textContent).not.toContain("Spotify settings");
    expect(panel.textContent).toContain("Spotify settings");
    expect(panel.textContent).toContain(maskClientId(VALID_ID));
    expect(panel.textContent).not.toContain(VALID_ID);
    expect(panel.textContent).toContain(
      "If Spotify rejects the sign-in, the Client ID is wrong or the Redirect URI does not match exactly."
    );
    expect(buttonNamed("Change", panel)).toBeInstanceOf(HTMLButtonElement);
    expect(buttonNamed("Remove", panel)).toBeInstanceOf(HTMLButtonElement);
    expect(buttonNamed("Sign out", panel)).toBeInstanceOf(HTMLButtonElement);
    expect(buttonNamed("Sign in", panel)).toBeInstanceOf(HTMLButtonElement);

    const staySignedIn = panel.querySelector("#stay-signed-in");
    expect(staySignedIn?.getAttribute("role")).toBe("switch");
    expect(staySignedIn?.getAttribute("aria-checked")).toBe("false");
    expect(window.localStorage.getItem(STAY_SIGNED_IN_KEY)).toBeNull();
    expect(panel.textContent).toContain("Stay signed in");

    const revoke = [...panel.querySelectorAll("a")].find((link) =>
      link.textContent?.includes("Revoke this app on Spotify")
    );
    expect(revoke?.getAttribute("href")).toBe(SPOTIFY_ACCOUNT_APPS_URL);
    expect(revoke?.getAttribute("target")).toBe("_blank");

    await click(staySignedIn as HTMLElement);
    expect(staySignedIn?.getAttribute("aria-checked")).toBe("true");
    expect(window.localStorage.getItem(STAY_SIGNED_IN_KEY)).toBe("1");

    await click(buttonNamed("Sign out", panel));
    expect(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)).toBe(VALID_ID);
    expect(accountButton()).not.toBeNull();

    await click(buttonNamed("Remove", settingsDialog()));
    await waitFor(
      "setup screen",
      () => content().textContent?.includes("Connect Spotify") ?? false
    );
    expect(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)).toBeNull();
    expect(accountButton()).toBeNull();
    expect(content().querySelector('[aria-label="Course GPX file"]')).toBeNull();
  });

  it("shows the signed-in menu and keeps the Client ID on sign out", async () => {
    loadSignedInSdk.mockResolvedValue({
      sdk: {
        logOut() {},
        currentUser: {
          playlists: {
            playlists: async () => ({ items: [], total: 0 }),
          },
        },
      },
      profile: { display_name: "Runner", id: "runner", images: [] },
      error: null,
    });
    await mount("http://127.0.0.1:5173/", () => {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, VALID_ID);
    });

    await openMenu();
    await click(menuItem("Sign in"));
    await waitFor("signed-in name", () => header().textContent?.includes("Runner") ?? false);
    expect(loadSignedInSdk).toHaveBeenCalledWith(VALID_ID);
    expect(accountButton()?.textContent).toContain("Runner");

    await openMenu();
    expect(menuItems().map((item) => item.textContent?.trim())).toEqual([
      "Settings",
      "Sign out",
    ]);

    await click(menuItem("Settings"));
    const panel = settingsDialog();
    expect(panel.textContent).toContain(maskClientId(VALID_ID));
    expect(panel.querySelector("#stay-signed-in")?.getAttribute("aria-checked")).toBe(
      "false"
    );
    expect(
      [...panel.querySelectorAll("button")].some(
        (button) => button.textContent?.trim() === "Sign in"
      )
    ).toBe(false);
    expect(buttonNamed("Sign out", panel)).toBeInstanceOf(HTMLButtonElement);

    await openMenu();
    await click(menuItem("Sign out"));
    await waitFor(
      "signed-out account control",
      () => accountButton()?.textContent?.includes("Account") ?? false
    );
    expect(header().textContent).not.toContain("Runner");
    expect(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)).toBe(VALID_ID);
    expect(content().querySelector('[aria-label="Course GPX file"]')).not.toBeNull();

    await openSettings();
    await click(buttonNamed("Change", settingsDialog()));
    await waitFor(
      "setup screen after change",
      () => content().textContent?.includes("Connect Spotify") ?? false
    );
    expect(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)).toBeNull();
    expect(accountButton()).toBeNull();
  });

  it("opens settings when Spotify sends the browser back with an error", async () => {
    await mount("http://127.0.0.1:5173/?error=access_denied", () => {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, VALID_ID);
    });

    await waitFor(
      "oauth settings",
      () => document.body.textContent?.includes(OAUTH_ERROR_MESSAGE) ?? false
    );
    const panel = settingsDialog();
    expect(panel.textContent).toContain(OAUTH_ERROR_MESSAGE);
    expect(content().textContent).not.toContain("Spotify settings");

    const close = panel.querySelector("button[aria-label='Close']");
    if (!(close instanceof HTMLButtonElement)) throw new Error("missing close button");
    await click(close);
    await waitFor(
      "closed settings",
      () => !document.body.textContent?.includes("Revoke this app on Spotify")
    );
  });

  it("opens settings when Sign in from the menu fails", async () => {
    loadSignedInSdk.mockRejectedValue(new Error("token exchange failed"));
    await mount("http://127.0.0.1:5173/", () => {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, VALID_ID);
    });

    expect(document.body.textContent).not.toContain("token exchange failed");
    await openMenu();
    await click(menuItem("Sign in"));
    await waitFor(
      "sign-in error",
      () => document.body.textContent?.includes("token exchange failed") ?? false
    );
    expect(settingsDialog().textContent).toContain("token exchange failed");
    expect(window.localStorage.getItem(CLIENT_ID_STORAGE_KEY)).toBe(VALID_ID);
  });

  it("leaves fixtures mode on the playlist UI without an account menu", async () => {
    await mount("http://127.0.0.1:5173/?fixtures=1", () => {
      window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, VALID_ID);
    });

    expect(header().textContent).toContain("Fixtures");
    expect(accountButton()).toBeNull();
    expect(menuItems()).toHaveLength(0);
    expect(document.body.textContent).not.toContain("Spotify settings");
    expect(content().textContent).not.toContain("Connect Spotify");
    expect(content().querySelector('[aria-label="Course GPX file"]')).not.toBeNull();
    expect(content().textContent).toContain("Fixture Songs");
  });
});
