import {
  MaxInt,
  Page,
  SimplifiedPlaylist,
  SpotifyApi,
} from "@spotify/web-api-ts-sdk";
import React, { useEffect, useState } from "react";
import { useSpotifyAuth } from "../spotify/auth";
import { playlistItemTotal } from "../spotify/api";
import { Avatar, Space, Table, Typography } from "antd";
import { ColumnsType, TablePaginationConfig, TableProps } from "antd/es/table";
import { usePlaylistContext } from "../data/PlaylistContext";
import {
  FIXTURE_PLAYLIST_DESCRIPTION,
  FIXTURE_PLAYLIST_KEY,
  FIXTURE_PLAYLIST_NAME,
  FIXTURE_TRACKS,
  isFixturesMode,
} from "../fixtures/playlist";

interface DataType {
  key: string;
  name: string;
  description: string;
  image: string | undefined;
  songs: number;
  snapshotId: string;
  ownerId: string;
  collaborative: boolean;
}

interface TableParams {
  pagination?: TablePaginationConfig;
}

const FIXTURE_PLAYLIST_ROWS: DataType[] = [
  {
    key: FIXTURE_PLAYLIST_KEY,
    name: FIXTURE_PLAYLIST_NAME,
    description: FIXTURE_PLAYLIST_DESCRIPTION,
    snapshotId: "fixture-snapshot",
    image: undefined,
    songs: FIXTURE_TRACKS.length,
    ownerId: "",
    collaborative: false,
  },
];

const showingFixtures = isFixturesMode();

const columns: ColumnsType<DataType> = [
  {
    title: "Select a Playlist",
    dataIndex: "name",
    ellipsis: true,
    render: (name: string, record: DataType) => (
      <Space>
        <Avatar shape="square" src={record.image}>
          {name}
        </Avatar>
        <Space orientation="vertical" size={0}>
          <strong>{name}</strong>
          {record.description}
          <Typography.Text type="secondary">
            {record.songs} songs
          </Typography.Text>
        </Space>
      </Space>
    ),
  },
];

const Playlists: React.FC = () => {
  const [fetchedPlaylists, setFetchedPlaylists] = useState<DataType[]>([]);
  const [openLoads, setOpenLoads] = useState(0);
  const dataSource = showingFixtures ? FIXTURE_PLAYLIST_ROWS : fetchedPlaylists;
  const loading = openLoads > 0;
  const {
    setplaylistKey,
    setplaylistImage,
    setplaylistName,
    setsnapshotId,
    setPlaylistOwner,
  } = usePlaylistContext();

  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 50,
    },
  });

  const { sdk }: { sdk: SpotifyApi | null } = useSpotifyAuth();
  const page = tableParams.pagination?.current ?? 1;
  const pageSize = tableParams.pagination?.pageSize ?? 50;

  useEffect(() => {
    if (showingFixtures || !sdk) return;

    let cancelled = false;

    (async () => {
      setOpenLoads((count) => count + 1);
      try {
        const playlistPage: Page<SimplifiedPlaylist> | undefined =
          await sdk.currentUser.playlists.playlists(
            Math.min(50, pageSize) as MaxInt<50>,
            pageSize * (page - 1)
          );

        if (cancelled) return;

        if (playlistPage && playlistPage.items) {
          setFetchedPlaylists(
            playlistPage.items.map((playlist) => {
              const counted = playlist as SimplifiedPlaylist & {
                items?: { total?: number } | null;
              };
              return {
                key: playlist.id,
                name: playlist.name,
                description: playlist.description ?? "",
                snapshotId: playlist.snapshot_id,
                image:
                  playlist.images && playlist.images.length
                    ? playlist.images[0].url
                    : undefined,
                songs: playlistItemTotal(counted),
                ownerId: playlist.owner?.id ?? "",
                collaborative: playlist.collaborative,
              };
            })
          );
          setTableParams((current) => ({
            ...current,
            pagination: {
              ...current.pagination,
              total: playlistPage.total,
            },
          }));
        } else {
          setFetchedPlaylists([]);
        }
      } finally {
        setOpenLoads((count) => count - 1);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, pageSize, sdk]);

  const handleTableChange: TableProps<DataType>["onChange"] = (
    pagination,

    sorter
  ) => {
    setTableParams({
      pagination,

      ...sorter,
    });

    // `dataSource` is useless since `pageSize` changed
    if (pagination.pageSize !== tableParams.pagination?.pageSize) {
      setFetchedPlaylists([]);
    }
  };

  return (
    <Table
      rowKey="key"
      columns={columns}
      dataSource={dataSource}
      pagination={tableParams.pagination}
      loading={loading}
      onChange={handleTableChange}
      scroll={{ y: 400 }}
      size="small"
      onRow={(record: DataType) => {
        return {
          onClick: () => {
            setplaylistImage(record.image);
            setplaylistName(record.name);
            setplaylistKey(record.key);
            setsnapshotId(record.snapshotId);
            setPlaylistOwner(record.ownerId, record.collaborative);
          },
        };
      }}
      //sticky={true}
    />
  );
};

export default Playlists;
