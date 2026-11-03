import { useCallback, useEffect, useRef, useState } from "react";
import { fixtureSongRows, isFixturesMode } from "../fixtures/playlist";
import {
  PLAYLIST_ITEMS_ACCESS_MESSAGE,
  PlaylistAccessError,
  PlaylistReorderInterrupted,
  applyPlaylistMoves,
  fetchAllPlaylistItems,
  planPlaylistReorder,
  playlistItemsBlocked,
  reorderPlaylistItems,
  slotKeysFromEntries,
  trackOccurrenceKey,
  type PlaylistItemMove,
  type PlaylistItemPageEntry,
} from "../spotify/api";
import { useSpotifyAuth } from "../spotify/auth";
import { requireAccessToken } from "../spotify/token";

export interface RuniflySong {
  key: string;
  originalIndex: number;
  name: string;
  artistName: string;
  albumName: string;
  albumArt: string;
  songDuration: number;
  raceTimeFrom: number;
  raceTimeTo: number;
  lapFrom: number;
  lapTo: number;
}

export interface PlaylistWriteResult {
  snapshotId: string | undefined;
  complete: boolean;
}

export function songsFromPlaylistItems(
  entries: PlaylistItemPageEntry[]
): RuniflySong[] {
  const songs: RuniflySong[] = [];
  entries.forEach((entry, index) => {
    const track = entry.item;
    if (!track) return;
    const artists = Array.isArray(track.artists) ? track.artists : [];
    songs.push({
      key: trackOccurrenceKey(track.id, index),
      originalIndex: index,
      name: track.name,
      artistName: artists[0]?.name ?? "",
      albumName: track.album?.name ?? "",
      albumArt: track.album?.images?.[0]?.url ?? "",
      songDuration: track.duration_ms / 1000,
      raceTimeFrom: 0,
      raceTimeTo: 0,
      lapFrom: 0,
      lapTo: 0,
    });
  });
  return songs;
}

export function useRuniflyPlaylist(
  playlistKey: string | undefined,
  snapshotId: string | undefined,
  playlistOwnerId: string | undefined,
  playlistCollaborative: boolean
) {
  const loadSerial = useRef(0);
  const [pendingLoad, setPendingLoad] = useState<number | null>(null);
  const [settledLoad, setSettledLoad] = useState<number | null>(null);
  const loading = pendingLoad !== null && pendingLoad !== settledLoad;
  const [data, setData] = useState<RuniflySong[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [error, setError] = useState<unknown>();
  const { sdk, profile } = useSpotifyAuth();

  const startLoad = useCallback((): number => {
    const id = loadSerial.current + 1;
    loadSerial.current = id;
    setPendingLoad(id);
    return id;
  }, []);

  const finishLoad = useCallback((id: number) => {
    setSettledLoad((current) =>
      current !== null && current >= id ? current : id
    );
  }, []);

  const remember = useCallback((songs: RuniflySong[], slotKeys: string[]) => {
    setData(songs);
    setSlots(slotKeys);
  }, []);

  const updateData = useCallback(
    async (
      newData: RuniflySong[]
    ): Promise<PlaylistWriteResult | undefined> => {
      if (playlistKey === undefined) return;
      if (isFixturesMode()) {
        remember(newData, newData.map((song) => song.key));
        setError(undefined);
        return { snapshotId, complete: true };
      }

      const visibleKeys = newData.map((song) => song.key);
      let moves: PlaylistItemMove[];
      try {
        moves = planPlaylistReorder(slots, visibleKeys);
      } catch (reorderError) {
        setError(reorderError);
        return;
      }

      if (!sdk) {
        setError(new Error("Spotify is not signed in."));
        return;
      }
      if (moves.length > 0 && !snapshotId) {
        setError(
          new Error(
            "This playlist has no snapshot yet, so the new order was not saved."
          )
        );
        return;
      }

      const loadId = startLoad();
      setError(undefined);
      try {
        const token = await requireAccessToken(sdk);
        const nextSnapshot = await reorderPlaylistItems(
          playlistKey,
          token,
          moves,
          snapshotId ?? ""
        );
        remember(newData, applyPlaylistMoves(slots, moves));
        return { snapshotId: nextSnapshot, complete: true };
      } catch (reorderError) {
        console.error(reorderError);
        if (reorderError instanceof PlaylistReorderInterrupted) {
          setSlots(
            applyPlaylistMoves(slots, moves.slice(0, reorderError.appliedMoves))
          );
          setError(reorderError);
          return { snapshotId: reorderError.snapshotId, complete: false };
        }
        setError(reorderError);
        return;
      } finally {
        finishLoad(loadId);
      }
    },
    [finishLoad, playlistKey, remember, sdk, slots, snapshotId, startLoad]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const activeSdk = sdk;

      try {
        if (isFixturesMode()) {
          const rows = playlistKey === undefined ? [] : fixtureSongRows();
          setError(undefined);
          setPendingLoad(null);
          remember(rows, rows.map((song) => song.key));
          return;
        }

        if (playlistKey === undefined || !activeSdk) {
          setError(undefined);
          setPendingLoad(null);
          remember([], []);
          return;
        }

        const loadId = startLoad();
        setError(undefined);
        try {
          if (
            playlistItemsBlocked(
              profile?.id,
              playlistOwnerId,
              playlistCollaborative
            )
          ) {
            throw new PlaylistAccessError(PLAYLIST_ITEMS_ACCESS_MESSAGE);
          }
          const token = await requireAccessToken(activeSdk);
          const entries = await fetchAllPlaylistItems(playlistKey, token);
          if (cancelled) return;
          remember(songsFromPlaylistItems(entries), slotKeysFromEntries(entries));
        } finally {
          finishLoad(loadId);
        }
      } catch (loadError) {
        console.error(loadError);
        if (cancelled) return;
        remember([], []);
        setError(loadError);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    finishLoad,
    playlistCollaborative,
    playlistKey,
    playlistOwnerId,
    profile?.id,
    remember,
    sdk,
    startLoad,
  ]);

  return { loading, data, error, updateData };
}
