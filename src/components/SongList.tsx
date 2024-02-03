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
import React, { useState } from "react";
import { Avatar, Layout, Space, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import Paragraph from "antd/es/typography/Paragraph";

interface DataType {
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
  address: string;
  age: number;
}

const columns: ColumnsType<DataType> = [
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
    render: (name: string, record: DataType) => (
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
    render: (songDuration: number) => formatTimeFromMilliseconds(songDuration),
    width: 100,
  },
  {
    title: "KM",
    dataIndex: "lapFrom",
    render: (lapFrom: number, record: DataType) => {
      return lapFrom + " - " + record.lapTo;
    },
    width: 130,
  },
  {
    title: "Race Time",
    render: (songDuration: number) => formatTimeFromSeconds(songDuration),
    width: 100,
  },
];

function formatTimeFromSeconds(seconds: number) {
  if (seconds === 0) return "0:00:00";
  const time = dayjs.duration(seconds);
  const hours = String(time.hours()).padStart(2, "0");
  const minutes = String(time.minutes()).padStart(2, "0");
  const secs = String(time.seconds()).padStart(2, "0");
  return `${hours}:${minutes}:${secs}`;
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
  const [dataSource, setDataSource] = useState([
    {
      key: "1",
      name: "Seven Nation Army",
      artistName: "The White Stripes",
      songDuration: 232106,
      albumName: "Elephant",
      albumArt:
        "https://i.scdn.co/image/ab67616d00004851a69f71a8794e2d867a52f98f",
      raceTimeFrom: 600,
      raceTimeTo: 660,
      lapFrom: 195.5,
      lapTo: 122.5,
    },
    {
      key: "3232",
      name: "Seven Nation Army 2",
      artistName: "The White Stripes 2",
      songDuration: 232106,
      albumName: "Elephant 2",
      albumArt:
        "https://i.scdn.co/image/ab67616d00004851a69f71a8794e2d867a52f98f",
      raceTimeFrom: 600,
      raceTimeTo: 660,
      lapFrom: 195.5,
      lapTo: 122.5,
    },
  ]);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (active.id !== over?.id) {
      setDataSource((previous) => {
        const activeIndex = previous.findIndex((i) => i.key === active.id);
        const overIndex = previous.findIndex((i) => i.key === over?.id);
        return arrayMove(previous, activeIndex, overIndex);
      });
    }
  };

  return (
    <DndContext modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
      <SortableContext
        // rowKey array
        items={dataSource.map((i) => i.key)}
        strategy={verticalListSortingStrategy}
      >
        <Table
          components={{
            body: {
              row: Row,
            },
          }}
          rowKey="key"
          columns={columns}
          dataSource={dataSource}
          //scroll={{ y: 200 }}
          //sticky={true}
          pagination={false}
        />
      </SortableContext>
    </DndContext>
  );
};

export default SongList;
