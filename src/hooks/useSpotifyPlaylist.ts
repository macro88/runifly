import { useEffect, useState } from "react";
import { fixtureSongRows, isFixturesMode } from "../fixtures/playlist";
import {
  PLAYLIST_ITEMS_ACCESS_MESSAGE,
  PlaylistAccessError,
  fetchAllPlaylistItems,
  planSerialReorders,
  playlistItemsBlocked,
  reorderPlaylistItems,
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

export function songsFromPlaylistItems(
  entries: PlaylistItemPageEntry[]
): RuniflySong[] {
  const songs: RuniflySong[] = [];
  for (const entry of entries) {
    const track = entry.item;
    if (!track) continue;
    const artists = Array.isArray(track.artists) ? track.artists : [];
    songs.push({
      key: track.id,
      originalIndex: songs.length,
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
  }
  return songs;
}

export function useRuniflyPlaylist(
  playlistKey: string | undefined,
  snapshotId: string | undefined,
  playlistOwnerId: string | undefined,
  playlistCollaborative: boolean
) {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<RuniflySong[]>([]);
  const [error, setError] = useState<unknown>();
  const { sdk, profile } = useSpotifyAuth();

  async function updateData(
    newData: RuniflySong[]
  ): Promise<string | undefined> {
    if (playlistKey === undefined) return;
    if (isFixturesMode()) {
      setData(newData);
      setError(undefined);
      return snapshotId;
    }

    const originalPositions = new Map(
      data.map((song, index) => [song.key, index])
    );
    const desired = newData.map((song) => originalPositions.get(song.key));
    if (desired.some((position) => position === undefined)) {
      setError(new Error("Playlist reorder is missing a song."));
      return;
    }

    const moves = planSerialReorders(desired as number[]);
    if (!sdk) {
      setError(new Error("Spotify is not signed in."));
      return;
    }
    if (moves.length > 0 && !snapshotId) {
      setError(new Error("This playlist has no snapshot yet, so the new order was not saved."));
      return;
    }

    setLoading(true);
    setError(undefined);
    try {
      const token = await requireAccessToken(sdk);
      const nextSnapshot = await reorderPlaylistItems(
        playlistKey,
        token,
        moves,
        snapshotId ?? ""
      );
      setData(newData);
      return nextSnapshot;
    } catch (reorderError) {
      console.error(reorderError);
      setError(reorderError);
      return undefined;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!isFixturesMode() && playlistKey !== undefined && !sdk) return;
      const activeSdk = sdk;

      try {
        if (isFixturesMode()) {
          setError(undefined);
          setData(playlistKey === undefined ? [] : fixtureSongRows());
          return;
        }

        if (playlistKey === undefined || !activeSdk) {
          setError(undefined);
          setData([]);
          return;
        }

        setLoading(true);
        setError(undefined);
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
        setData(songsFromPlaylistItems(entries));
      } catch (loadError) {
        console.error(loadError);
        if (cancelled) return;
        setData([]);
        setError(loadError);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [playlistKey, sdk, profile?.id, playlistOwnerId, playlistCollaborative]);

  return { loading, data, error, updateData };
}
