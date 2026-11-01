import { useState, useEffect } from "react";
import { fixtureSongRows, isFixturesMode } from "../fixtures/playlist";
import { useSpotify } from "./useSpotify";
import {
  Page,
  PlaylistedTrack,
  Scopes,
  SnapshotReference,
  SpotifyApi,
  Track,
  TrackItem,
} from "@spotify/web-api-ts-sdk";

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

export function useRuniflyPlaylist(
  playlistKey: string | undefined,
  distance: number,
  pace: number
) {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<RuniflySong[]>([]);
  const [error, setError] = useState<Error | unknown>();
  const [spotifyData, setSpotifyData] =
    useState<Page<PlaylistedTrack<TrackItem>>>();

  const sdk: SpotifyApi | null = useSpotify(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    import.meta.env.VITE_REDIRECT_TARGET,
    Scopes.playlist
  );

  async function updateData(
    newData: RuniflySong[]
  ): Promise<string | undefined> {
    if (playlistKey === undefined) return;

    const originalPositions = new Map(
      data.map((song, index) => [song.key, index])
    );
    const updatedPositions = newData.map((song) =>
      originalPositions.get(song.key)
    );

    setLoading(true);
    let response: SnapshotReference | undefined = undefined;

    const itemsToMove = calculateMoves(
      Array.from(originalPositions.values()),
      updatedPositions.filter((position) => position !== undefined) as number[]
    );

    await Promise.all(
      itemsToMove.map(async (songMove) => {
        response = await sdk?.playlists.movePlaylistItems(
          playlistKey,
          songMove.originalIndex,
          1,
          songMove.insertBeforeIndex
        );
        await new Promise((resolve) => setTimeout(resolve, 250));
      })
    );

    setData(newData);
    setLoading(false);
    return response!.snapshot_id;
  }

  type ApiCall = {
    originalIndex: number;
    insertBeforeIndex: number;
  };

  //Todo: move this to a helper file
  function findLIS(sequence: number[]): number[] {
    const predecessors: number[] = new Array(sequence.length);
    const indexes: number[] = new Array(sequence.length + 1);
    let length = 0;

    for (let i = 0; i < sequence.length; i++) {
      let low = 1;
      let high = length;
      while (low <= high) {
        const mid = Math.ceil((low + high) / 2);
        if (sequence[indexes[mid]] < sequence[i]) {
          low = mid + 1;
        } else {
          high = mid - 1;
        }
      }

      const newLength = low;
      predecessors[i] = indexes[newLength - 1];
      indexes[newLength] = i;

      if (newLength > length) {
        length = newLength;
      }
    }

    const lis: number[] = new Array(length);
    let k = indexes[length];
    for (let i = length - 1; i >= 0; i--) {
      lis[i] = sequence[k];
      k = predecessors[k];
    }

    return lis;
  }

  //Todo: move this to a helper file
  function calculateMoves(original: number[], updated: number[]): ApiCall[] {
    const indexMap = new Map<number, number>();
    original.forEach((item, index) => indexMap.set(item, index));

    const updatedIndices = updated.map((item) => indexMap.get(item)!);
    const lis = findLIS(updatedIndices);

    const lisSet = new Set(lis);
    const moves: ApiCall[] = [];

    updated.forEach((item, index) => {
      if (!lisSet.has(indexMap.get(item)!)) {
        const insertBeforeIndex =
          index + 1 < updated.length
            ? indexMap.get(updated[index + 1])
            : undefined;
        if (insertBeforeIndex !== undefined) {
          moves.push({
            originalIndex: indexMap.get(item)!,
            insertBeforeIndex,
          });
        }
      }
    });

    return moves;
  }

  function isTrack(obj: unknown): obj is Track {
    return (
      obj !== undefined &&
      (obj as Track).artists &&
      Array.isArray((obj as Track).artists)
    );
  }

  const mapData = () => {
    if (spotifyData && spotifyData.items.length) {
      const updatedData: RuniflySong[] = spotifyData.items.map(
        (song, index: number) => {
          return {
            key: song.track.id,
            name: song.track.name,
            artistName: isTrack(song.track) ? song.track.artists[0].name : "",
            albumName: isTrack(song.track) ? song.track.album.name : "",
            albumArt: isTrack(song.track) ? song.track.album.images[0].url : "",
            originalIndex: index,
            songDuration: song.track.duration_ms / 1000,
            raceTimeFrom: 0,
            raceTimeTo: 0,
            lapFrom: 0,
            lapTo: 0,
          };
        }
      );
      setData(updatedData);
    }
  };

  useEffect(() => {
    if (spotifyData) mapData();
    // mapData is recreated every render and only reads spotifyData.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [distance, pace, spotifyData]);

  useEffect(() => {
    (async () => {
      if (isFixturesMode()) {
        setData(playlistKey === undefined ? [] : fixtureSongRows());
        setLoading(false);
        return;
      }

      if (playlistKey === undefined) {
        setData([]);
        return;
      }
      setLoading(true);

      try {
        const data = await sdk?.playlists.getPlaylistItems(playlistKey);
        setSpotifyData(data);
      } catch (error) {
        console.error(error);
        setError(error);
      }
      setLoading(false);
    })();
    // Fixtures return before the SDK. Adding sdk would refetch when auth completes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playlistKey]);

  return { loading, data, error, updateData };
}
