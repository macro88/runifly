import { useState } from "react";
import { Avatar, Dropdown, Space } from "antd";
import type { MenuProps } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { isFixturesMode } from "../fixtures/playlist";
import { useSpotifyAuth } from "../spotify/auth";
import SpotifySettings from "./SpotifySettings";

const accountButtonStyle = {
  background: "transparent",
  border: 0,
  color: "inherit",
  cursor: "pointer",
  font: "inherit",
  padding: 0,
};

const SpotifyUser = () => {
  const { profile, clientId, sdk, error, oauthError, signIn, signOut } =
    useSpotifyAuth();
  const failure = error ?? oauthError;
  const [openedByUser, setOpenedByUser] = useState(false);
  const [dismissedFailure, setDismissedFailure] = useState<Error | string | null>(
    null
  );
  const settingsOpen =
    openedByUser || (failure != null && failure !== dismissedFailure);

  const closeSettings = () => {
    setOpenedByUser(false);
    setDismissedFailure(failure);
  };

  if (isFixturesMode()) {
    return (
      <Space>
        <Avatar shape="square" icon={<UserOutlined />} />
        Fixtures
      </Space>
    );
  }

  if (!clientId) return null;

  const imageUrl = profile?.images?.[0]?.url;
  const items: NonNullable<MenuProps["items"]> = [
    { key: "settings", label: "Settings" },
  ];
  if (!sdk) items.push({ key: "sign-in", label: "Sign in" });
  items.push({ key: "sign-out", label: "Sign out" });

  const onMenuClick: MenuProps["onClick"] = ({ key }) => {
    if (key === "settings") setOpenedByUser(true);
    if (key === "sign-in") signIn();
    if (key === "sign-out") signOut();
  };

  return (
    <>
      <Dropdown
        trigger={["click"]}
        placement="bottomRight"
        menu={{ items, onClick: onMenuClick }}
      >
        <button
          type="button"
          aria-haspopup="menu"
          aria-label={
            profile?.display_name
              ? `Spotify account, ${profile.display_name}`
              : "Spotify account"
          }
          style={accountButtonStyle}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            <Avatar
              shape="square"
              icon={imageUrl ? undefined : <UserOutlined />}
              src={imageUrl}
            >
              {profile?.display_name}
            </Avatar>
            {profile?.display_name ?? "Account"}
          </span>
        </button>
      </Dropdown>
      <SpotifySettings open={settingsOpen} onClose={closeSettings} />
    </>
  );
};

export default SpotifyUser;
