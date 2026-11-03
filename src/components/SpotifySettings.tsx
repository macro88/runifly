import { Alert, Button, Card, Checkbox, Space, Typography } from "antd";
import { maskClientId, SPOTIFY_ACCOUNT_APPS_URL } from "../spotify/clientId";
import { REDIRECT_KEY_WARNING } from "../spotify/pkce";
import { STAY_SIGNED_IN_NOTE } from "../spotify/tokenStore";
import { useSpotifyAuth } from "../spotify/auth";

const SpotifySettings = () => {
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
    <Card title="Spotify settings" style={{ marginTop: 24 }}>
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
          <Checkbox
            checked={staySignedIn}
            onChange={(event) => setStaySignedIn(event.target.checked)}
          >
            Stay signed in
          </Checkbox>
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
    </Card>
  );
};

export default SpotifySettings;
