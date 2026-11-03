import { describe, expect, it } from "vitest";
import {
  CLIENT_ID_STORAGE_KEY,
  clientIdProblem,
  maskClientId,
  readStoredClientId,
  removeStoredClientId,
  writeStoredClientId,
} from "./clientId";

const VALID_ID = `abcd${"e".repeat(24)}wxyz`;

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear() {
      items.clear();
    },
    getItem(key: string) {
      return items.has(key) ? (items.get(key) ?? null) : null;
    },
    key(index: number) {
      return Array.from(items.keys())[index] ?? null;
    },
    removeItem(key: string) {
      items.delete(key);
    },
    setItem(key: string, value: string) {
      items.set(key, String(value));
    },
  };
}

describe("clientIdProblem", () => {
  it("accepts 32 letters and digits, including surrounding whitespace", () => {
    expect(clientIdProblem(VALID_ID)).toBeNull();
    expect(clientIdProblem(`  ${VALID_ID}  `)).toBeNull();
    expect(clientIdProblem("A".repeat(16) + "1".repeat(16))).toBeNull();
  });

  it("rejects an empty or malformed client id", () => {
    expect(clientIdProblem("")).toBe("Enter a Spotify Client ID.");
    expect(clientIdProblem("   ")).toBe("Enter a Spotify Client ID.");
    expect(clientIdProblem("abc")).toMatch(/32 letters and digits/);
    expect(clientIdProblem("a".repeat(31))).toMatch(/32 letters and digits/);
    expect(clientIdProblem("a".repeat(33))).toMatch(/32 letters and digits/);
    expect(clientIdProblem(`${"a".repeat(31)}-`)).toMatch(/32 letters and digits/);
    expect(clientIdProblem(`${VALID_ID.slice(0, 8)} ${VALID_ID.slice(8)}`)).toMatch(
      /32 letters and digits/
    );
  });
});

describe("client id storage", () => {
  it("stores a trimmed id and masks the middle", () => {
    const storage = memoryStorage();
    expect(writeStoredClientId(storage, `  ${VALID_ID}\n`)).toBe(true);
    expect(storage.getItem(CLIENT_ID_STORAGE_KEY)).toBe(VALID_ID);
    expect(readStoredClientId(storage)).toBe(VALID_ID);
    expect(maskClientId(VALID_ID)).toBe("abcd…wxyz");
  });

  it("refuses to store a malformed id and drops one already stored", () => {
    const storage = memoryStorage();
    expect(writeStoredClientId(storage, "not-a-client-id")).toBe(false);
    expect(storage.getItem(CLIENT_ID_STORAGE_KEY)).toBeNull();

    storage.setItem(CLIENT_ID_STORAGE_KEY, "short");
    expect(readStoredClientId(storage)).toBeNull();
    expect(storage.getItem(CLIENT_ID_STORAGE_KEY)).toBeNull();
  });

  it("removes the stored id", () => {
    const storage = memoryStorage();
    writeStoredClientId(storage, VALID_ID);
    removeStoredClientId(storage);
    expect(readStoredClientId(storage)).toBeNull();
  });
});
