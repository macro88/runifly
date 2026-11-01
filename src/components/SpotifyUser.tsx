import { Avatar, Space, Typography } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { isFixturesMode } from "../fixtures/playlist";
import { useSpotifyAuth } from "../spotify/auth";

const SpotifyUser = () => {
  const { profile, error } = useSpotifyAuth();

  if (isFixturesMode()) {
    return (
      <Space>
        <Avatar shape="square" icon={<UserOutlined />} />
        Fixtures
      </Space>
    );
  }

  if (error) {
    return <Typography.Text type="danger">{error.message}</Typography.Text>;
  }

  const imageUrl = profile?.images?.[0]?.url;

  return (
    <Space>
      <Avatar
        shape="square"
        icon={imageUrl ? undefined : <UserOutlined />}
        src={imageUrl}
      >
        {profile?.display_name}
      </Avatar>
      {profile?.display_name}
    </Space>
  );
};

export default SpotifyUser;
