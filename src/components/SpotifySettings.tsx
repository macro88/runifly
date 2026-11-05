import { Alert, Button, Drawer, Space, Switch, Typography } from "antd";
import { maskClientId, SPOTIFY_ACCOUNT_APPS_URL } from "../spotify/clientId";
import { REDIRECT_KEY_WARNING } from "../spotify/pkce";
import { STAY_SIGNED_IN_NOTE } from "../spotify/tokenStore";
import { useSpotifyAuth } from "../spotify/auth";

const SpotifySettings = ({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) => {
  const {
    clientId,
    sdk,
    error,
    oauthError,
    staySignedIn,
    signingIn,
    discardClientId,
    signIn,
    signOut,
    setStaySignedIn,
  } = useSpotifyAuth();

  if (!clientId) return null;

  return (
    <Drawer title="Spotify settings" open={open} onClose={onClose} destroyOnHidden>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        {oauthError ? (
          <Alert type="warning" showIcon title={oauthError} />
        ) : (
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {REDIRECT_KEY_WARNING}
          </Typography.Paragraph>
        )}
        {error && <Alert type="error" showIcon title={error.message} />}
        <Space wrap>
          <Typography.Text>
            Client ID <Typography.Text code>{maskClientId(clientId)}</Typography.Text>
          </Typography.Text>
          <Button onClick={discardClientId}>Change</Button>
          <Button onClick={discardClientId}>Remove</Button>
          <Button onClick={signOut}>Sign out</Button>
        </Space>
        <div>
          <Space align="center">
            <Switch
              id="stay-signed-in"
              checked={staySignedIn}
              onChange={setStaySignedIn}
            />
            <label htmlFor="stay-signed-in">Stay signed in</label>
          </Space>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {STAY_SIGNED_IN_NOTE}
          </Typography.Paragraph>
        </div>
        {!sdk && (
          <Button type="primary" onClick={signIn} loading={signingIn}>
            Sign in
          </Button>
        )}
        <Typography.Link href={SPOTIFY_ACCOUNT_APPS_URL} target="_blank" rel="noreferrer">
          Revoke this app on Spotify
        </Typography.Link>
      </Space>
    </Drawer>
  );
};

export default SpotifySettings;
