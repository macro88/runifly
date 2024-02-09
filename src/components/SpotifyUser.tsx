import { useEffect, useState } from "react";
import { useSpotify } from "../hooks/useSpotify";
import { Scopes, UserProfile } from "@spotify/web-api-ts-sdk";
import { Avatar, Space } from "antd";
import { UserOutlined } from "@ant-design/icons";

const SpotifyUser = () => {
  const sdk = useSpotify(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    import.meta.env.VITE_REDIRECT_TARGET,
    Scopes.userDetails
  );

  const [profileData, setProfileData] = useState<UserProfile>(); // State variable to store profile data

  useEffect(() => {
    (async () => {
      const results = await sdk?.currentUser.profile();
      setProfileData(results); // Update the state variable with profile data
    })();
  }, [sdk]);

  return (
    <Space>
      <Avatar
        shape="square"
        icon={profileData?.images.length ? undefined : <UserOutlined />}
        src={
          profileData?.images.length ? profileData?.images[0]?.url : undefined
        }
      >
        {profileData?.display_name}
      </Avatar>
      {profileData?.display_name}
    </Space>
  );
};

export default SpotifyUser;
