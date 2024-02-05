import React, { useEffect, useState } from "react";
import { useSpotify } from "../hooks/useSpotify";
import { Scopes, UserProfile } from "@spotify/web-api-ts-sdk";
import { Avatar } from "antd";

const SpotifyUser = () => {
  const sdk = useSpotify(
    import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    import.meta.env.VITE_REDIRECT_TARGET,
    Scopes.userDetails
  );

  const [profileData, setProfileData] = useState<UserProfile>(null); // State variable to store profile data

  useEffect(() => {
    (async () => {
      const results = await sdk?.currentUser.profile();
      setProfileData(results); // Update the state variable with profile data
    })();
  }, [sdk]);

  return (
    <Avatar
      shape="square"
      src={profileData?.images.length ? profileData?.images[0]?.url : undefined}
      size={{ xs: 24, sm: 32, md: 40, lg: 64, xl: 80, xxl: 100 }}
    >
      {profileData?.display_name}
    </Avatar>
  );
};

export default SpotifyUser;
