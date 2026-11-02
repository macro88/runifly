import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { RuniflySong, useRuniflyPlaylist } from "../hooks/useSpotifyPlaylist";
import { playlistFailureMessage } from "../spotify/api";
import { useCourseContext } from "./CourseContext";
import { updateTimingData } from "./timing";

interface PlaylistContextType {
  playlistKey: string | undefined;
  setplaylistKey: (playlistKey: string | undefined) => void;

  snapshotId: string | undefined;
  setsnapshotId: (snapshotId: string | undefined) => void;

  setPlaylistOwner: (ownerId: string | undefined, collaborative: boolean) => void;

  playlistName: string | undefined;
  setplaylistName: (playlistName: string | undefined) => void;

  playlistImage: string | undefined;
  setplaylistImage: (playlistImage: string | undefined) => void;

  hoveredSong: RuniflySong | undefined;
  //sethoveredSong: (songKey: RuniflySong | null) => void;
  sethoveredSong: Dispatch<SetStateAction<RuniflySong | undefined>>; // Update the type here
  reset: () => void;

  loading: boolean;
  playlistError: string | null;

  syncRequired: boolean;
  setsyncRequired: (syncRequired: boolean) => void;
  songs: RuniflySong[];

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
  setPlaylistOwner: () => {},
  playlistName: defaultValues.playlistName,
  setplaylistName: () => {},
  playlistImage: undefined,
  setplaylistImage: () => {},
  hoveredSong: undefined,
  sethoveredSong: () => {},
  reset: () => {},
  loading: false,
  playlistError: null,
  syncRequired: false,
  setsyncRequired: () => {},
  songs: [],
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
  const [playlistOwnerId, setPlaylistOwnerId] = useState<string | undefined>();
  const [playlistCollaborative, setPlaylistCollaborative] = useState(false);
  const [hoveredSong, sethoveredSong] = useState<RuniflySong>();
  const [syncRequired, setsyncRequired] = useState<boolean>(false);
  const { pace } = useCourseContext();

  const { data, error, loading, updateData } = useRuniflyPlaylist(
    playlistKey,
    snapshotId,
    playlistOwnerId,
    playlistCollaborative
  );

  const setPlaylistOwner = (
    ownerId: string | undefined,
    collaborative: boolean
  ) => {
    setPlaylistOwnerId(ownerId);
    setPlaylistCollaborative(collaborative);
  };

  const timedSongs = useMemo(
    () => updateTimingData(data, pace),
    [data, pace]
  );
  // Drag and reset hold a list until the fetched songs or the pace change.
  // A pace change retimes the fetched order, matching the old effect.
  const [songOverride, setSongOverride] = useState<{
    source: RuniflySong[];
    pace: number;
    songs: RuniflySong[];
  } | null>(null);
  const songs =
    songOverride && songOverride.source === data && songOverride.pace === pace
      ? songOverride.songs
      : timedSongs;

  const sync = async () => {
    const result = await updateData(songs);
    if (!result) return;
    if (result.snapshotId) setsnapshotId(result.snapshotId);
    if (result.complete) setsyncRequired(false);
  };

  const updateSongOrder = (newSongs: RuniflySong[]) => {
    setsyncRequired(true);
    setSongOverride({
      source: data,
      pace,
      songs: updateTimingData(newSongs, pace),
    });
  };

  const reset = () => {
    setplaylistKey(defaultValues.playlistKey);
    sethoveredSong(defaultValues.hoveredSong);
    setSongOverride({ source: data, pace, songs: [] });
    setsyncRequired(false);
    setplaylistImage(undefined);
    setplaylistName(defaultValues.playlistName);
    setsnapshotId(undefined);
    setPlaylistOwnerId(undefined);
    setPlaylistCollaborative(false);
  };

  const value = {
    playlistKey,
    hoveredSong,
    syncRequired,
    snapshotId,
    playlistName,
    playlistImage,
    songs,
    loading,
    playlistError: playlistFailureMessage(error),
    setplaylistKey,
    sethoveredSong,
    reset,
    setsyncRequired,
    updateSongOrder,
    setplaylistName,
    setplaylistImage,
    setsnapshotId,
    setPlaylistOwner,
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
