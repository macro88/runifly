import React, {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  ReactNode,
  Dispatch,
  SetStateAction,
} from "react";
import { RuniflySong, useRuniflyPlaylist } from "../hooks/useSpotifyPlaylist";
import { playlistFailureMessage } from "../spotify/api";
import { isFixturesMode } from "../fixtures/playlist";
import { useSpotifyAuth } from "../spotify/auth";
import { useCourseContext } from "./CourseContext";
import type { TimeDistanceCurve } from "./hillCurve";
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
  const { sdk } = useSpotifyAuth();
  const { pace, hillCurve } = useCourseContext();

  const { data, error, loading, updateData } = useRuniflyPlaylist(
    playlistKey,
    snapshotId,
    playlistOwnerId,
    playlistCollaborative
  );

  const setPlaylistOwner = useCallback(
    (ownerId: string | undefined, collaborative: boolean) => {
      setPlaylistOwnerId(ownerId);
      setPlaylistCollaborative(collaborative);
    },
    []
  );

  const timedSongs = useMemo(
    () => updateTimingData(data, pace, hillCurve),
    [data, hillCurve, pace]
  );
  // Drag and reset hold a list only while the fetched songs, pace, and hill
  // curve stay put. Drop the hold when any of them changes, so a later return
  // cannot bring back an order that change already discarded.
  const [songOverride, setSongOverride] = useState<{
    source: RuniflySong[];
    pace: number;
    hillCurve: TimeDistanceCurve | null;
    songs: RuniflySong[];
  } | null>(null);
  if (!isFixturesMode() && !sdk && playlistKey !== undefined) {
    setplaylistKey(undefined);
    setsnapshotId(undefined);
    setPlaylistOwnerId(undefined);
    setPlaylistCollaborative(false);
    setplaylistImage(undefined);
    setplaylistName(defaultValues.playlistName);
    sethoveredSong(undefined);
    setsyncRequired(false);
    setSongOverride(null);
  } else if (
    songOverride !== null &&
    (songOverride.source !== data ||
      songOverride.pace !== pace ||
      songOverride.hillCurve !== hillCurve)
  ) {
    setSongOverride(null);
  }
  const songs =
    songOverride !== null &&
    songOverride.source === data &&
    songOverride.pace === pace &&
    songOverride.hillCurve === hillCurve
      ? songOverride.songs
      : timedSongs;

  const sync = useCallback(async () => {
    const result = await updateData(songs);
    if (!result) return;
    if (result.snapshotId) setsnapshotId(result.snapshotId);
    if (result.complete) setsyncRequired(false);
  }, [songs, updateData]);

  const updateSongOrder = useCallback(
    (newSongs: RuniflySong[]) => {
      setsyncRequired(true);
      setSongOverride({
        source: data,
        pace,
        hillCurve,
        songs: updateTimingData(newSongs, pace, hillCurve),
      });
    },
    [data, hillCurve, pace]
  );

  const reset = useCallback(() => {
    setplaylistKey(defaultValues.playlistKey);
    sethoveredSong(defaultValues.hoveredSong);
    setSongOverride({ source: data, pace, hillCurve, songs: [] });
    setsyncRequired(false);
    setplaylistImage(undefined);
    setplaylistName(defaultValues.playlistName);
    setsnapshotId(undefined);
    setPlaylistOwnerId(undefined);
    setPlaylistCollaborative(false);
  }, [data, hillCurve, pace]);

  const value = useMemo(
    () => ({
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
    }),
    [
      hoveredSong,
      loading,
      playlistImage,
      playlistKey,
      playlistName,
      reset,
      setPlaylistOwner,
      snapshotId,
      songs,
      sync,
      syncRequired,
      updateSongOrder,
      error,
    ]
  );

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
