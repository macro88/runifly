import {
  MaxInt,
  Page,
  Scopes,
  SimplifiedPlaylist,
  SpotifyApi,
} from "@spotify/web-api-ts-sdk";
import React, { useEffect, useState } from "react";
import { useSpotify } from "../hooks/useSpotify";
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
}

interface TableParams {
  pagination?: TablePaginationConfig;
}

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
        <Space direction="vertical" size={0}>
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
  const [dataSource, setDataSource] = useState<DataType[]>([]);
  const [loading, setLoading] = useState(false);
  const { setplaylistKey, setplaylistImage, setplaylistName, setsnapshotId } =
    usePlaylistContext();

  const [tableParams, setTableParams] = useState<TableParams>({
    pagination: {
      current: 1,
      pageSize: 50,
    },
  });

  const sdk: SpotifyApi | null = useSpotify(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    import.meta.env.VITE_REDIRECT_TARGET,
    Scopes.playlist
  );

  const fetchData = async () => {
    setLoading(true);

    const page: Page<SimplifiedPlaylist> | undefined =
      await sdk?.currentUser.playlists.playlists(
        Math.min(50, tableParams?.pagination?.pageSize ?? 50) as MaxInt<50>,
        (tableParams?.pagination?.pageSize ?? 50) *
          ((tableParams?.pagination?.current ?? 0) - 1)
      );

    if (page && page.items) {
      setDataSource(
        page.items.map((playlist) => ({
          key: playlist.id,
          name: playlist.name,
          description: playlist.description,
          snapshotId: playlist.snapshot_id,
          image:
            playlist.images && playlist.images.length
              ? playlist.images[0].url
              : undefined,
          songs: playlist.tracks?.total ?? 0,
        }))
      );
      setTableParams({
        ...tableParams,
        pagination: {
          ...tableParams.pagination,
          total: page.total,
        },
      });
    } else {
      setDataSource([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isFixturesMode()) {
      setDataSource([
        {
          key: FIXTURE_PLAYLIST_KEY,
          name: FIXTURE_PLAYLIST_NAME,
          description: FIXTURE_PLAYLIST_DESCRIPTION,
          snapshotId: "fixture-snapshot",
          image: undefined,
          songs: FIXTURE_TRACKS.length,
        },
      ]);
      setLoading(false);
      return;
    }

    fetchData();
    // fetchData closes over the latest params. The serialised key is the dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(tableParams), sdk]);

  const handleTableChange: TableProps["onChange"] = (
    pagination,

    sorter
  ) => {
    setTableParams({
      pagination,

      ...sorter,
    });

    // `dataSource` is useless since `pageSize` changed
    if (pagination.pageSize !== tableParams.pagination?.pageSize) {
      setDataSource([]);
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
          },
        };
      }}
      //sticky={true}
    />
  );
};

export default Playlists;
