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
  playlistKey: string | undefined;
  setplaylistKey: (playlistKey: string | undefined) => void;

  snapshotId: string | undefined;
  setsnapshotId: (snapshotId: string | undefined) => void;

  playlistName: string;
  setplaylistName: (playlistName: string) => void;

  playlistImage: string;
  setplaylistImage: (playlistImage: string) => void;

  hoveredSong: RuniflySong;
  sethoveredSong: (songKey: RuniflySong | null) => void;
  reset: () => void;

  loading: boolean;

  syncRequired: boolean;
  setsyncRequired: (syncRequired: boolean) => void;
  songs: RuniflySong[];
  setSongs: (songs: RuniflySong[]) => void;

  sync: () => void;
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
  const [playlistKey, setplaylistKey] = useState<string | undefined>();
  const [playlistName, setplaylistName] = useState<string>();
  const [playlistImage, setplaylistImage] = useState<string>();
  const [snapshotId, setsnapshotId] = useState<string | undefined>();
  const [hoveredSong, sethoveredSong] = useState<RuniflySong>();
  const [syncRequired, setsyncRequired] = useState<boolean>(false);
  const [songs, setSongs] = useState<RuniflySong[]>([]);
  const { pace, distance } = useCourseContext();

  const { data, error, loading, updateData } = useRuniflyPlaylist(
    playlistKey,
    pace,
    distance
  );

  const sync = async () => {
    const snapshotId = await updateData(songs);
    setsnapshotId(snapshotId);
    setsyncRequired(false);
  };

  useEffect(() => {
    if (data) {
      updateTimingData(data, pace);
      setSongs(data);
    }
  }, [data]);

  const updateSongOrder = (newSongs: RuniflySong[]) => {
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
    snapshotId,
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
    setsnapshotId,
    sync,
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
