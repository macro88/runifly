import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  Dispatch,
  SetStateAction,
} from "react";
import { RuniflySong, useRuniflyPlaylist } from "../hooks/useSpotifyPlaylist";
import { useCourseContext } from "./CourseContext";
import { updateTimingData } from "./timing";

interface PlaylistContextType {
  playlistKey: string | undefined;
  setplaylistKey: (playlistKey: string | undefined) => void;

  snapshotId: string | undefined;
  setsnapshotId: (snapshotId: string | undefined) => void;

  playlistName: string | undefined;
  setplaylistName: (playlistName: string | undefined) => void;

  playlistImage: string | undefined;
  setplaylistImage: (playlistImage: string | undefined) => void;

  hoveredSong: RuniflySong | undefined;
  //sethoveredSong: (songKey: RuniflySong | null) => void;
  sethoveredSong: Dispatch<SetStateAction<RuniflySong | undefined>>; // Update the type here
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
  playlistName: "Runifly Playlist",
};

const PlaylistContext = createContext<PlaylistContextType>({
  playlistKey: undefined,
  setplaylistKey: () => {},
  snapshotId: undefined,
  setsnapshotId: () => {},
  playlistName: defaultValues.playlistName,
  setplaylistName: () => {},
  playlistImage: undefined,
  setplaylistImage: () => {},
  hoveredSong: undefined,
  sethoveredSong: () => {},
  reset: () => {},
  loading: false,
  syncRequired: false,
  setsyncRequired: () => {},
  songs: [],
  setSongs: () => {},
  sync: () => {},
  updateSongOrder: () => {},
});

interface PlaylistProviderProps {
  children: ReactNode;
}

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
    console.log("PlaylistProvider: useEffect");
    if (data) {
      setSongs(updateTimingData(data, pace));
    }
  }, [data, pace]);

  const updateSongOrder = (newSongs: RuniflySong[]) => {
    setsyncRequired(true);
    setSongs(updateTimingData(newSongs, pace));
  };

  const reset = () => {
    setplaylistKey(defaultValues.playlistKey);
    sethoveredSong(defaultValues.hoveredSong);
    setSongs([]);
    setsyncRequired(false);
    setplaylistImage(undefined);
    setplaylistName(defaultValues.playlistName);
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

// Hook lives next to its provider.
// eslint-disable-next-line react-refresh/only-export-components
export const usePlaylistContext = () => {
  const context = useContext(PlaylistContext);
  if (context === undefined) {
    throw new Error(
      "usePlaylistContextContext must be used within a PlaylistContextProvider"
    );
  }
  return context;
};
