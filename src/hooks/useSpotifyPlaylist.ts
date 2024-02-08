import { useState, useEffect } from "react";
import { useSpotify } from "./useSpotify";
import {
  Scopes,
  SimplifiedTrack,
  SnapshotReference,
  SpotifyApi,
} from "@spotify/web-api-ts-sdk";

export interface RuniflySong {
  key: string;
  originalIndex: number;
  name: string;
  artistName: string;
  albumName: string;
  almumArt: string;
  songDuration: number;
  raceTimeFrom: number;
  raceTimeTo: number;
  lapFrom: number;
  lapTo: number;
}

export function useRuniflyPlaylist(
  playlistKey: string,
  distance: number,
  pace: number,
  snapShotId: string
) {
  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<RuniflySong[]>([]);
  const [error, setError] = useState(null);
  const [spotifyData, setSpotifyData] = useState();

  const sdk: SpotifyApi = useSpotify(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    import.meta.env.VITE_REDIRECT_TARGET,
    Scopes.playlist
  );

  const fetchData = async () => {
    if (playlistKey === undefined) return;
    setLoading(true);

    try {
      const data = await sdk?.playlists.getPlaylistItems(playlistKey);
      setSpotifyData(data);
    } catch (error) {
      setError(error);
    }
    setLoading(false);
  };

  async function updateData(newData: RuniflySong[]): string {
    const originalPositions = new Map(
      data.map((song, index) => [song.key, index])
    );
    const updatedPositions = newData.map((song) =>
      originalPositions.get(song.key)
    );

    setLoading(true);
    let response: SnapshotReference = undefined;

    const itemsToMove = calculateMoves(
      Array.from(originalPositions.values()),
      updatedPositions
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
    return response?.snapshot_id;
  }

  type ApiCall = {
    originalIndex: number;
    insertBeforeIndex: number;
  };

  //Todo: move this to a helper file
  function findLIS(sequence: number[]): number[] {
    const piles: number[] = [];
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
        moves.push({
          originalIndex: indexMap.get(item)!,
          insertBeforeIndex:
            index + 1 < updated.length
              ? indexMap.get(updated[index + 1])
              : null,
        });
      }
    });

    return moves;
  }

  const mapData = () => {
    if (spotifyData && spotifyData.items.length) {
      const updatedData = spotifyData.items.map((song, index) => {
        return {
          key: song.track.id,
          name: song.track.name,
          artistName: song.track.artists[0].name,
          albumName: song.track.album.name,
          albumArt: song.track.album.images[0].url,
          originalIndex: index,
          songDuration: song.track.duration_ms / 1000,
        };
      });
      setData(updatedData);
    }
  };

  useEffect(() => {
    if (spotifyData) mapData();
  }, [distance, pace, spotifyData]);

  useEffect(() => {
    (async () => {
      if (playlistKey === undefined) setData([]);
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
  }, [playlistKey]);

  return { loading, data, error, updateData };
}
