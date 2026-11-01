import { describe, expect, it } from "vitest";
import {
  PLAYLIST_ITEMS_ACCESS_MESSAGE,
  PlaylistAccessError,
  fetchAllPlaylistItems,
  planSerialReorders,
  playlistItemTotal,
  playlistItemsBlocked,
  reorderPlaylistItems,
  type PlaylistItemMove,
} from "./api";
import { isSpotifyRedirectUri } from "./redirect";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

function track(id: string, name: string) {
  return {
    id,
    name,
    duration_ms: 1_000,
    type: "track",
    artists: [{ name: "Artist" }],
    album: { name: "Album", images: [{ url: `https://i.example/${id}` }] },
  };
}

function header(init: RequestInit | undefined, name: string): string | null {
  return new Headers(init?.headers).get(name);
}

/** Spotify counts insert_before on the playlist before the removal. */
function applySpotifyReorder(items: number[], move: PlaylistItemMove): number[] {
  const next = items.slice();
  const removed = next.splice(move.rangeStart, move.rangeLength);
  let insertAt = move.insertBefore;
  if (move.rangeStart < move.insertBefore) {
    insertAt -= removed.length;
  }
  next.splice(insertAt, 0, ...removed);
  return next;
}

describe("fetchAllPlaylistItems", () => {
  it("pages with limit 50 past the first page and reads item, not track", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input);
      calls.push({ url, init });
      if (calls.length === 1) {
        const items = Array.from({ length: 50 }, (_, index) => ({
          item: track(`item-${index}`, `From item ${index}`),
          track: track(`track-${index}`, `From track ${index}`),
        }));
        return jsonResponse({ items, total: 51, limit: 50, offset: 0, next: "next" });
      }
      return jsonResponse({
        items: [
          {
            item: track("item-50", "From item 50"),
            track: track("track-50", "From track 50"),
          },
        ],
        total: 51,
        limit: 50,
        offset: 50,
        next: null,
      });
    };

    const entries = await fetchAllPlaylistItems("playlist-1", "token-1", fetchImpl);

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.spotify.com/v1/playlists/playlist-1/items?limit=50&offset=0",
      "https://api.spotify.com/v1/playlists/playlist-1/items?limit=50&offset=50",
    ]);
    expect(calls[0].init?.method).toBe("GET");
    expect(header(calls[0].init, "Authorization")).toBe("Bearer token-1");
    expect(entries).toHaveLength(51);
    expect(entries[0].item).toEqual(track("item-0", "From item 0"));
    expect(entries[50].item?.name).toBe("From item 50");
    expect(entries[0]).not.toHaveProperty("track");
  });

  it("does not request another page after a 403", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return jsonResponse({ error: { status: 403, message: "Forbidden" } }, 403);
    };

    await expect(
      fetchAllPlaylistItems("playlist-1", "token-1", fetchImpl)
    ).rejects.toMatchObject({
      name: "PlaylistAccessError",
      message: PLAYLIST_ITEMS_ACCESS_MESSAGE,
    });
    expect(calls).toBe(1);
  });
});

describe("reorderPlaylistItems", () => {
  it("puts range_start and insert_before in serial calls and threads snapshot_id", async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    let releaseFirst: () => void = () => {};
    const firstGate = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const fetchImpl: typeof fetch = async (input, init) => {
      calls.push({ url: String(input), init });
      if (calls.length === 1) {
        await firstGate;
        return jsonResponse({ snapshot_id: "snap-b" });
      }
      return jsonResponse({ snapshot_id: "snap-c" });
    };

    const pending = reorderPlaylistItems(
      "playlist-1",
      "token-1",
      [
        { rangeStart: 2, insertBefore: 0, rangeLength: 1 },
        { rangeStart: 1, insertBefore: 0, rangeLength: 1 },
      ],
      "snap-a",
      fetchImpl
    );

    expect(calls).toHaveLength(1);
    releaseFirst();
    await expect(pending).resolves.toBe("snap-c");

    expect(calls.map((call) => call.url)).toEqual([
      "https://api.spotify.com/v1/playlists/playlist-1/items",
      "https://api.spotify.com/v1/playlists/playlist-1/items",
    ]);
    expect(calls[0].init?.method).toBe("PUT");
    expect(header(calls[0].init, "Authorization")).toBe("Bearer token-1");
    expect(header(calls[0].init, "Content-Type")).toBe("application/json");
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      range_start: 2,
      insert_before: 0,
      range_length: 1,
      snapshot_id: "snap-a",
    });
    expect(JSON.parse(String(calls[1].init?.body))).toMatchObject({
      range_start: 1,
      insert_before: 0,
      snapshot_id: "snap-b",
    });
  });

  it("returns the current snapshot without a request when nothing moves", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return jsonResponse({ snapshot_id: "unused" });
    };

    await expect(
      reorderPlaylistItems("playlist-1", "token-1", [], "snap-a", fetchImpl)
    ).resolves.toBe("snap-a");
    expect(calls).toBe(0);
  });

  it("does not send a later move after the first one is forbidden", async () => {
    let calls = 0;
    const fetchImpl: typeof fetch = async () => {
      calls += 1;
      return new Response("no", { status: 403 });
    };

    await expect(
      reorderPlaylistItems(
        "playlist-1",
        "token-1",
        [
          { rangeStart: 1, insertBefore: 0, rangeLength: 1 },
          { rangeStart: 1, insertBefore: 0, rangeLength: 1 },
        ],
        "snap-a",
        fetchImpl
      )
    ).rejects.toBeInstanceOf(PlaylistAccessError);
    expect(calls).toBe(1);
  });
});

describe("planSerialReorders", () => {
  it("reaches the desired order when each move is applied with Spotify's insert_before", () => {
    const desiredSets = [
      [0, 1, 2, 3],
      [1, 0, 2, 3],
      [3, 2, 1, 0],
      [1, 2, 3, 0],
      [2, 0, 3, 1],
    ];

    for (const desired of desiredSets) {
      let order = desired.map((_, index) => index);
      for (const move of planSerialReorders(desired)) {
        order = applySpotifyReorder(order, move);
      }
      expect(order).toEqual(desired);
    }
  });
});

describe("playlistItemTotal", () => {
  it("reads items.total from GET /me/playlists", () => {
    expect(playlistItemTotal({ items: { total: 12 }, tracks: { total: 3 } })).toBe(12);
    expect(playlistItemTotal({ items: { total: 0 } })).toBe(0);
    expect(playlistItemTotal({ tracks: { total: 4 } })).toBe(4);
    expect(playlistItemTotal({})).toBe(0);
  });
});

describe("playlistItemsBlocked", () => {
  it("blocks playlists the user does not own and cannot collaborate on", () => {
    expect(playlistItemsBlocked("me", "me", false)).toBe(false);
    expect(playlistItemsBlocked("me", "them", true)).toBe(false);
    expect(playlistItemsBlocked("me", "them", false)).toBe(true);
    expect(playlistItemsBlocked(undefined, "them", false)).toBe(false);
  });
});

describe("isSpotifyRedirectUri", () => {
  it("allows loopback with a port and https, and rejects localhost", () => {
    expect(isSpotifyRedirectUri("http://127.0.0.1:5173")).toBe(true);
    expect(isSpotifyRedirectUri("http://127.0.0.1:4173/")).toBe(true);
    expect(isSpotifyRedirectUri("https://runifly.example/callback")).toBe(true);
    expect(isSpotifyRedirectUri("http://localhost:5173")).toBe(false);
    expect(isSpotifyRedirectUri("http://127.0.0.1")).toBe(false);
  });
});
