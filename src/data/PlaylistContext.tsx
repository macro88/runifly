import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
} from "react";
import { RuniflySong, useRuniflyPlaylist } from "../hooks/useSpotifyPlaylist";
import { useCourseContext } from "./CourseContext";

interface PlaylistContextType {
  playlistKey: string;
  setplaylistKey: (playlistKey: string) => void;

  playlistName: string;
  setplaylistName: (playlistName: string) => void;

  playlistImage: string;
  setplaylistImage: (playlistImage: string) => void;

  hoveredSong: RuniflySong;
  sethoveredSong: (songKey: RuniflySong) => void;
  reset: () => void;

  syncRequired: boolean;
  setsyncRequired: (syncRequired: boolean) => void;

  songs: RuniflySong[];
  setSongs: (songs: RuniflySong[]) => void;

  updateSongOrder: (newSongs: RuniflySong[]) => void;
}

const defaultValues = {
  hoveredSong: undefined,
  playlistKey: undefined,
};

const PlaylistContext = createContext<PlaylistContextType | undefined>(
  undefined
);

interface PlaylistProviderProps {
  children: ReactNode;
}

const updateTimingData = (songs: RuniflySong[], pace: number) => {
  let cumlTime = 0;
  console.log("updating time data");
  songs.forEach((song) => {
    song.raceTimeFrom = parseFloat(cumlTime.toFixed(2));
    song.raceTimeTo = parseFloat((cumlTime + song.songDuration).toFixed(2));
    song.lapFrom = parseFloat((song.raceTimeFrom / pace).toFixed(2));
    song.lapTo = parseFloat((song.raceTimeTo / pace).toFixed(2));
    cumlTime += song.songDuration;
  });
};

export const PlaylistProvider: React.FC<PlaylistProviderProps> = ({
  children,
}) => {
  const [playlistKey, setplaylistKey] = useState<string>();
  const [playlistName, setplaylistName] = useState<string>();
  const [playlistImage, setplaylistImage] = useState<string>();

  const [hoveredSong, sethoveredSong] = useState<RuniflySong>();
  const [syncRequired, setsyncRequired] = useState<boolean>(false);
  const [songs, setSongs] = useState<RuniflySong[]>([]);
  const { pace, distance } = useCourseContext();
  const { data, error, loading } = useRuniflyPlaylist(
    playlistKey,
    pace,
    distance
  );

  useEffect(() => {
    if (data) {
      updateTimingData(data, pace);
      setSongs(data);
    }
  }, [data]);

  useEffect(() => {
    if (!loading) {
      //console.log("songs changed");
      //updateTimingData(songs, pace);
    }
  }, [songs]);

  const updateSongOrder = (newSongs: RuniflySong[]) => {
    console.log("updating song order");

    setsyncRequired(true);
    setSongs(newSongs);
    updateTimingData(newSongs, pace);
  };

  const reset = () => {
    setplaylistKey(defaultValues.playlistKey);
    sethoveredSong(defaultValues.hoveredSong);
    setSongs([]);
    setsyncRequired(false);
    setplaylistImage(undefined);
    setplaylistName(undefined);
  };

  const value = {
    playlistKey,
    hoveredSong,
    syncRequired,
    playlistName,
    playlistImage,
    songs,
    error,
    loading,
    setplaylistKey,
    sethoveredSong,
    reset,
    setsyncRequired,
    setSongs,
    updateSongOrder,
    setplaylistName,
    setplaylistImage,
  };

  return (
    <PlaylistContext.Provider value={value}>
      {children}
    </PlaylistContext.Provider>
  );
};

export const usePlaylistContext = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error(
      "usePlaylistContextContext must be used within a PlaylistContextProvider"
    );
  }
  return context;
};
