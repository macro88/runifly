import { MenuOutlined } from "@ant-design/icons";
import type { DragEndEvent } from "@dnd-kit/core";
import { DndContext } from "@dnd-kit/core";
import dayjs from "dayjs";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  arrayMove,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar, Layout, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";

import { usePlaylistContext } from "../data/PlaylistContext";
import { RuniflySong, useRuniflyPlaylist } from "../hooks/useSpotifyPlaylist";
import { useCourseContext } from "../data/CourseContext";

const columns: ColumnsType<RuniflySong> = [
  {
    key: "sort",
    width: 50,
  },
  {
    title: "#",
    dataIndex: "index",
    render: (_: any, __: any, index: number) => index + 1,
    width: 50,
  },
  {
    title: "Title",
    dataIndex: "name",
    ellipsis: true,
    render: (name: string, record: RuniflySong) => (
      <Space>
        <Avatar shape="square" src={record.albumArt}></Avatar>
        <Space direction="vertical" size="compact">
          <strong>{name}</strong>
          {record.artistName}
        </Space>
      </Space>
    ),
  },
  {
    title: "Album",
    dataIndex: "albumName",
    ellipsis: true,
  },
  {
    title: "Song Time",
    dataIndex: "songDuration", //ms
    render: (songDuration: number) => formatTimeFromSeconds(songDuration),
    width: 100,
  },
  {
    title: "KM",
    dataIndex: "lapFrom",
    render: (lapFrom: number, record: RuniflySong) => {
      return lapFrom + " - " + record.lapTo;
    },
    width: 130,
  },
  {
    title: "Race Time",

    render: (record: RuniflySong) =>
      `${formatTimeFromSeconds(record.raceTimeFrom)} - ${formatTimeFromSeconds(
        record.raceTimeTo
      )}`,
    width: 120,
  },
];

function formatTimeFromSeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  let timeString = "";

  if (hours > 0) {
    timeString += `${hours}:`;
  }

  timeString += `${minutes.toString()}:`;
  timeString += `${Math.round(remainingSeconds).toString().padStart(2, "0")}`;

  return timeString;
}
function formatTimeFromMilliseconds(ms: number) {
  return formatTimeFromSeconds(ms / 1000);
}

interface RowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  "data-row-key": string;
}

const Row = ({ children, ...props }: RowProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props["data-row-key"],
  });

  const style: React.CSSProperties = {
    ...props.style,
    transform: CSS.Transform.toString(transform && { ...transform, scaleY: 1 }),
    transition,
    ...(isDragging ? { position: "relative", zIndex: 9999 } : {}),
  };

  return (
    <tr {...props} ref={setNodeRef} style={style} {...attributes}>
      {React.Children.map(children, (child) => {
        if ((child as React.ReactElement).key === "sort") {
          return React.cloneElement(child as React.ReactElement, {
            children: (
              <MenuOutlined
                ref={setActivatorNodeRef}
                style={{ touchAction: "none", cursor: "move" }}
                {...listeners}
              />
            ),
          });
        }
        return child;
      })}
    </tr>
  );
};

const SongList: React.FC = () => {
  const {
    playlistKey,
    sethoveredSong,
    hoveredSong,
    setsyncRequired,
    songs,
    setSongs,
    loading,
    updateSongOrder,
  } = usePlaylistContext();

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      const activeIndex = songs.findIndex((i) => i.key === active.id);
      const overIndex = songs.findIndex((i) => i.key === over?.id);

      const newSongs = arrayMove(songs, activeIndex, overIndex);

      updateSongOrder(newSongs, active.id, overIndex);

      // (previous) => {
      //   const activeIndex = previous.findIndex((i) => i.key === active.id);
      //   const overIndex = previous.findIndex((i) => i.key === over?.id);
      //   return arrayMove(previous, activeIndex, overIndex);
      // }
    }
  };

  const [tableHeight, setTableHeight] = useState(400);
  // ref is the Table ref.
  const tableRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const node = tableRef.current;
    const { top } = node.getBoundingClientRect();

    // normally TABLE_HEADER_HEIGHT would be 55.
    setTableHeight(window.innerHeight - top - 65);
  }, [songs]);

  return (
    <div ref={tableRef}>
      <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
        <SortableContext
          // rowKey array
          items={songs.map((i) => i.key)}
          strategy={verticalListSortingStrategy}
        >
          <Table
            components={{
              body: {
                row: Row,
              },
            }}
            onRow={(record: RuniflySong) => {
              return {
                onMouseEnter: () => {
                  sethoveredSong(record);
                },
                onMouseLeave: () => {
                  sethoveredSong(undefined);
                },
                className:
                  record.key === hoveredSong?.key ? "ant-table-row-hover" : "",
              };
            }}
            rowKey="key"
            columns={columns}
            dataSource={songs}
            loading={loading}
            scroll={{ y: tableHeight }}
            sticky={true}
            pagination={false}
            size="small"
          />
        </SortableContext>
      </DndContext>
    </div>
  );
};

export default SongList;
