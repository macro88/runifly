import { describe, expect, it } from "vitest";
import { songsFromPlaylistItems } from "./useSpotifyPlaylist";

describe("songsFromPlaylistItems", () => {
  it("builds song rows from item and skips entries with no item", () => {
    const songs = songsFromPlaylistItems([
      {
        item: {
          id: "track-1",
          name: "From item",
          duration_ms: 180_000,
          artists: [{ name: "Ada" }],
          album: {
            name: "Hills",
            images: [{ url: "https://i.example/cover" }],
          },
        },
      },
      { item: null },
    ]);

    expect(songs).toEqual([
      {
        key: "0:track-1",
        originalIndex: 0,
        name: "From item",
        artistName: "Ada",
        albumName: "Hills",
        albumArt: "https://i.example/cover",
        songDuration: 180,
        raceTimeFrom: 0,
        raceTimeTo: 0,
        lapFrom: 0,
        lapTo: 0,
      },
    ]);
  });

  it("keeps the Spotify index when an entry is missing and separates repeated tracks", () => {
    const track = {
      id: "same",
      name: "Repeat",
      duration_ms: 1_000,
      artists: [{ name: "Ada" }],
      album: { name: "Hills", images: [] },
    };
    const songs = songsFromPlaylistItems([
      { item: track },
      { item: null },
      { item: track },
    ]);

    expect(songs.map((song) => song.key)).toEqual(["0:same", "2:same"]);
    expect(songs.map((song) => song.originalIndex)).toEqual([0, 2]);
  });
});
