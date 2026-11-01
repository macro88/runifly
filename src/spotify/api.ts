export const SPOTIFY_ROOT = "https://api.spotify.com/v1";
export const PLAYLIST_ITEMS_PAGE_LIMIT = 50;

export const PLAYLIST_ITEMS_ACCESS_MESSAGE =
  "Spotify only returns songs for playlists you own or collaborate on.";

export const PLAYLIST_REORDER_ACCESS_MESSAGE =
  "Spotify only lets you reorder playlists you own or collaborate on.";

export class PlaylistAccessError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlaylistAccessError";
  }
}

export class SpotifyRequestError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`Spotify returned ${status} for this playlist.`);
    this.name = "SpotifyRequestError";
    this.status = status;
  }
}

export interface SpotifyPlaylistTrack {
  id: string;
  name: string;
  duration_ms: number;
  type?: string;
  artists?: { name: string }[];
  album?: {
    name?: string;
    images?: { url: string }[];
  };
}

/** One page entry from GET /playlists/{id}/items. The track lives on `item`. */
export interface PlaylistItemPageEntry {
  item: SpotifyPlaylistTrack | null;
}

export interface PlaylistItemMove {
  rangeStart: number;
  insertBefore: number;
  rangeLength: number;
}

type FetchLike = typeof fetch;

interface PlaylistCountSource {
  items?: { total?: number } | null;
  tracks?: { total?: number } | null;
}

export function playlistItemTotal(playlist: PlaylistCountSource): number {
  const total = playlist.items?.total ?? playlist.tracks?.total;
  return typeof total === "number" ? total : 0;
}

/**
 * True when this user cannot be allowed to read the playlist's items.
 * A collaborative playlist might still 403 if they are only a follower.
 */
export function playlistItemsBlocked(
  userId: string | undefined,
  ownerId: string | undefined,
  collaborative: boolean | undefined
): boolean {
  if (!userId || !ownerId) return false;
  if (ownerId === userId) return false;
  return !collaborative;
}

export function playlistFailureMessage(error: unknown): string | null {
  if (error == null) return null;
  if (error instanceof PlaylistAccessError || error instanceof SpotifyRequestError) {
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Couldn't load songs from Spotify.";
}

function isPlaylistTrack(value: unknown): value is SpotifyPlaylistTrack {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<SpotifyPlaylistTrack>;
  return (
    typeof track.id === "string" &&
    typeof track.name === "string" &&
    typeof track.duration_ms === "number"
  );
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new SpotifyRequestError(response.status);
  }
}

async function spotifyRequest(
  fetchImpl: FetchLike,
  url: string,
  accessToken: string,
  method: "GET" | "PUT",
  body: string | undefined,
  accessMessage: string
): Promise<unknown> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
  };
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetchImpl(url, { method, headers, body });
  if (response.status === 403) {
    throw new PlaylistAccessError(accessMessage);
  }
  if (!response.ok) {
    throw new SpotifyRequestError(response.status);
  }
  return readJson(response);
}

function pageEntries(payload: unknown): {
  entries: PlaylistItemPageEntry[];
  total: number;
} {
  const page = (payload ?? {}) as {
    items?: unknown;
    total?: unknown;
  };
  const rawItems = Array.isArray(page.items) ? page.items : [];
  const entries = rawItems.map((entry) => {
    const item =
      entry && typeof entry === "object" && "item" in entry
        ? (entry as { item?: unknown }).item
        : undefined;
    return { item: isPlaylistTrack(item) ? item : null };
  });
  const total = typeof page.total === "number" ? page.total : entries.length;
  return { entries, total };
}

/**
 * Every item in the playlist. Spotify's default page is 20 and the max is 50,
 * so this follows offset until `total` is covered.
 */
export async function fetchAllPlaylistItems(
  playlistId: string,
  accessToken: string,
  fetchImpl: FetchLike = fetch
): Promise<PlaylistItemPageEntry[]> {
  const collected: PlaylistItemPageEntry[] = [];
  let offset = 0;
  let total = Number.POSITIVE_INFINITY;

  while (offset < total) {
    const url = `${SPOTIFY_ROOT}/playlists/${encodeURIComponent(playlistId)}/items?limit=${PLAYLIST_ITEMS_PAGE_LIMIT}&offset=${offset}`;
    const payload = await spotifyRequest(
      fetchImpl,
      url,
      accessToken,
      "GET",
      undefined,
      PLAYLIST_ITEMS_ACCESS_MESSAGE
    );
    const page = pageEntries(payload);
    collected.push(...page.entries);
    total = page.total;
    if (page.entries.length === 0 || collected.length >= total) break;
    offset += page.entries.length;
  }

  return collected;
}

/**
 * Moves that turn playlist order 0..n-1 into `desired`, one Spotify reorder at a time.
 * Each move is applied to the playlist produced by the previous move.
 * Walking from the start only moves an item upward, so `insert_before` is the target index.
 */
export function planSerialReorders(desired: readonly number[]): PlaylistItemMove[] {
  const current = desired.map((_, index) => index);
  const moves: PlaylistItemMove[] = [];

  for (let target = 0; target < desired.length; target++) {
    const wanted = desired[target];
    const from = current.indexOf(wanted);
    if (from === -1) {
      throw new Error("Playlist reorder is missing a song.");
    }
    if (from === target) continue;
    moves.push({ rangeStart: from, insertBefore: target, rangeLength: 1 });
    const [item] = current.splice(from, 1);
    current.splice(target, 0, item);
  }

  return moves;
}

interface SnapshotBody {
  snapshot_id?: unknown;
}

/**
 * PUT /playlists/{id}/items once per move. The next call uses the snapshot_id
 * from the previous response. Spotify rejects a stale snapshot, so the calls
 * have to run one after another.
 */
export async function reorderPlaylistItems(
  playlistId: string,
  accessToken: string,
  moves: readonly PlaylistItemMove[],
  snapshotId: string,
  fetchImpl: FetchLike = fetch
): Promise<string> {
  let snapshot = snapshotId;
  const url = `${SPOTIFY_ROOT}/playlists/${encodeURIComponent(playlistId)}/items`;

  for (const move of moves) {
    const payload = await spotifyRequest(
      fetchImpl,
      url,
      accessToken,
      "PUT",
      JSON.stringify({
        range_start: move.rangeStart,
        insert_before: move.insertBefore,
        range_length: move.rangeLength,
        snapshot_id: snapshot,
      }),
      PLAYLIST_REORDER_ACCESS_MESSAGE
    );
    const next = (payload as SnapshotBody | null)?.snapshot_id;
    if (typeof next !== "string" || next.length === 0) {
      throw new SpotifyRequestError(200);
    }
    snapshot = next;
  }

  return snapshot;
}
