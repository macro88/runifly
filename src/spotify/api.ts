import { messageForSpotifyError, spotifyStatusMessage } from "./httpStatus";

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

  constructor(status: number, message = `Spotify returned ${status} for this playlist.`) {
    super(message);
    this.name = "SpotifyRequestError";
    this.status = status;
  }
}

/** A later PUT failed after Spotify had already saved earlier moves. */
export class PlaylistReorderInterrupted extends Error {
  readonly snapshotId: string;
  readonly appliedMoves: number;

  constructor(snapshotId: string, appliedMoves: number) {
    super("Spotify saved only part of the new order. Sync again to finish it.");
    this.name = "PlaylistReorderInterrupted";
    this.snapshotId = snapshotId;
    this.appliedMoves = appliedMoves;
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
  const statusMessage = messageForSpotifyError(error);
  if (statusMessage) return statusMessage;
  if (
    error instanceof PlaylistAccessError ||
    error instanceof SpotifyRequestError ||
    error instanceof PlaylistReorderInterrupted
  ) {
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return "Couldn't load songs from Spotify.";
}

/** Stable per occurrence. The same track can appear twice in one playlist. */
export function trackOccurrenceKey(trackId: string, index: number): string {
  return `${index}:${trackId}`;
}

export function gapSlotKey(index: number): string {
  return `gap:${index}`;
}

export function isGapSlot(key: string): boolean {
  return key.startsWith("gap:");
}

export function slotKeysFromEntries(
  entries: readonly { item: { id: string } | null }[]
): string[] {
  return entries.map((entry, index) =>
    entry.item ? trackOccurrenceKey(entry.item.id, index) : gapSlotKey(index)
  );
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
  if (response.status === 403 || response.status === 429) {
    const responseBody = await response.text();
    const hint = spotifyStatusMessage(response.status, responseBody);
    if (hint) throw new SpotifyRequestError(response.status, hint);
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

function sameOrder(left: readonly number[], right: readonly number[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

/** Spotify's insert_before counts the playlist before the removal. */
export function applyPlaylistMove<T>(
  items: readonly T[],
  move: PlaylistItemMove
): T[] {
  const next = items.slice();
  const removed = next.splice(move.rangeStart, move.rangeLength);
  let insertAt = move.insertBefore;
  if (move.rangeStart < move.insertBefore) {
    insertAt -= removed.length;
  }
  next.splice(insertAt, 0, ...removed);
  return next;
}

export function applyPlaylistMoves<T>(
  items: readonly T[],
  moves: readonly PlaylistItemMove[]
): T[] {
  return moves.reduce<T[]>(
    (order, move) => applyPlaylistMove(order, move),
    items.slice()
  );
}

function blockMove(
  from: number,
  len: number,
  finalDest: number,
  length: number
): PlaylistItemMove | null {
  if (len <= 0 || from === finalDest) return null;
  if (from < 0 || finalDest < 0 || from + len > length || finalDest + len > length) {
    return null;
  }
  const insertBefore = from < finalDest ? finalDest + len : finalDest;
  return { rangeStart: from, insertBefore, rangeLength: len };
}

/** One contiguous move that turns `order` into `desired`, if a single drag can. */
function findSolvingMove(
  order: readonly number[],
  desired: readonly number[]
): PlaylistItemMove | null {
  const positionInDesired = new Map(desired.map((value, index) => [value, index]));
  let best: PlaylistItemMove | null = null;

  for (let from = 0; from < order.length; from++) {
    const finalDest = positionInDesired.get(order[from]);
    if (finalDest === undefined) return null;
    let len = 1;
    while (from + len < order.length) {
      const nextDest = positionInDesired.get(order[from + len]);
      if (nextDest !== finalDest + len) break;
      len += 1;
    }
    if (finalDest === from) continue;
    const move = blockMove(from, len, finalDest, order.length);
    if (!move) continue;
    if (!sameOrder(applyPlaylistMove(order, move), desired)) continue;
    if (!best || move.rangeLength < best.rangeLength) best = move;
  }

  return best;
}

/**
 * Moves that turn playlist order 0..n-1 into `desired`.
 * A single dragged item, in either direction, is one request.
 * Anything else is applied one step at a time against the order so far.
 */
export function planSerialReorders(desired: readonly number[]): PlaylistItemMove[] {
  const length = desired.length;
  if (new Set(desired).size !== length || desired.some((value) => value < 0 || value >= length)) {
    throw new Error("Playlist reorder is missing a song.");
  }

  const order = desired.map((_, index) => index);
  const moves: PlaylistItemMove[] = [];
  let steps = 0;

  while (!sameOrder(order, desired)) {
    if (steps++ > length) {
      throw new Error("Playlist reorder is missing a song.");
    }
    const solving = findSolvingMove(order, desired);
    if (solving) {
      moves.push(solving);
      return moves;
    }
    const mismatch = order.findIndex((value, index) => value !== desired[index]);
    const from = order.indexOf(desired[mismatch]);
    const step = blockMove(from, 1, mismatch, order.length);
    if (!step) throw new Error("Playlist reorder is missing a song.");
    moves.push(step);
    const next = applyPlaylistMove(order, step);
    order.splice(0, order.length, ...next);
  }

  return moves;
}

function placeVisibleSongs(slots: readonly string[], visibleKeys: readonly string[]): string[] {
  const currentVisible = new Set(slots.filter((key) => !isGapSlot(key)));
  const wanted = new Set(visibleKeys);
  if (
    currentVisible.size !== visibleKeys.length ||
    wanted.size !== visibleKeys.length ||
    visibleKeys.some((key) => !currentVisible.has(key))
  ) {
    throw new Error("Playlist reorder is missing a song.");
  }
  let cursor = 0;
  return slots.map((slot) => (isGapSlot(slot) ? slot : visibleKeys[cursor++]));
}

/**
 * Reorder the full playlist, including unavailable entries, into the visible order.
 * Gap slots stay in their places. Indexes passed to Spotify are positions in that full list.
 */
export function planPlaylistReorder(
  slots: readonly string[],
  visibleKeys: readonly string[]
): PlaylistItemMove[] {
  const desiredSlots = placeVisibleSongs(slots, visibleKeys);
  const indexByKey = new Map(slots.map((key, index) => [key, index]));
  const desired = desiredSlots.map((key) => {
    const index = indexByKey.get(key);
    if (index === undefined) throw new Error("Playlist reorder is missing a song.");
    return index;
  });
  return planSerialReorders(desired);
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
  let applied = 0;
  const url = `${SPOTIFY_ROOT}/playlists/${encodeURIComponent(playlistId)}/items`;

  for (const move of moves) {
    try {
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
      applied += 1;
    } catch (error) {
      if (applied === 0) throw error;
      throw new PlaylistReorderInterrupted(snapshot, applied);
    }
  }

  return snapshot;
}
