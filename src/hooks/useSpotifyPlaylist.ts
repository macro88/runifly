import { useState, useEffect } from "react";
import { useSpotify } from "./useSpotify";
import { Scopes, SimplifiedTrack, SpotifyApi } from "@spotify/web-api-ts-sdk";

export interface RuniflySong {
  key: string;
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
  pace: number
) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [error, setError] = useState(null);
  const [spotifyData, setSpotifyData] = useState();

  const sdk: SpotifyApi = useSpotify(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    import.meta.env.VITE_REDIRECT_TARGET,
    Scopes.playlist
  );

  const fetchData = async () => {
    console.log(playlistKey);
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

  const mapData = () => {
    if (spotifyData && spotifyData.items.length) {
      //let cumlTime = 0;

      const updatedData = spotifyData.items.map((song) => {
        const key = song.track.id;
        const name = song.track.name;
        const artistName = song.track.artists[0].name;
        const albumName = song.track.album.name;
        const albumArt = song.track.album.images[0].url;
        const songDuration = song.track.duration_ms / 1000;
        // const raceTimeFrom = parseFloat(cumlTime.toFixed(2));
        // const raceTimeTo = parseFloat((cumlTime + songDuration).toFixed(2));
        // const lapFrom = parseFloat((raceTimeFrom / pace).toFixed(2));
        // const lapTo = parseFloat((raceTimeTo / pace).toFixed(2));

        //cumlTime += songDuration;
        return {
          key,
          name,
          artistName,
          albumName,
          albumArt,
          // raceTimeFrom,
          // raceTimeTo,
          // lapFrom,
          // lapTo,
          songDuration: songDuration,
        };
      });
      setData(updatedData);
    }
  };

  const loadPlaylist = () => {
    fetchData();
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

  return { loading, data, error };
}
