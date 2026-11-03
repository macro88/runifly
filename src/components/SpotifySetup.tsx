import { useMemo, useState } from "react";
import { Alert, Button, Card, Input, Space, Typography } from "antd";
import {
  PRODUCTION_REDIRECT_URI,
  SPOTIFY_DASHBOARD_URL,
} from "../spotify/clientId";
import { REDIRECT_KEY_WARNING } from "../spotify/pkce";
import { useSpotifyAuth } from "../spotify/auth";
import { resolveSpotifyRedirectUri } from "../spotify/redirect";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <Button
      size="small"
      type="default"
      aria-label={label}
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
        });
      }}
    >
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function openSampleData() {
  const url = new URL(window.location.href);
  url.searchParams.set("fixtures", "1");
  url.searchParams.delete("code");
  url.searchParams.delete("state");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  window.location.assign(url.href);
}

const SpotifySetup = () => {
  const { saveClientId, oauthError } = useSpotifyAuth();
  const [draft, setDraft] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const localRedirect = useMemo(
    () =>
      resolveSpotifyRedirectUri(
        import.meta.env.VITE_REDIRECT_TARGET,
        import.meta.env.BASE_URL,
        window.location.href
      ),
    []
  );

  const save = () => {
    const problem = saveClientId(draft);
    setFieldError(problem);
  };

  return (
    <Card title="Connect Spotify" style={{ marginTop: 24 }}>
      <Space orientation="vertical" size="middle" style={{ width: "100%" }}>
        <Alert
          type="warning"
          showIcon
          title={oauthError ?? REDIRECT_KEY_WARNING}
        />
        <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          <li>
            Go to{" "}
            <Typography.Link href={SPOTIFY_DASHBOARD_URL} target="_blank" rel="noreferrer">
              the Spotify Developer Dashboard
            </Typography.Link>
            . You need Spotify Premium.
          </li>
          <li>Create an app and tick Web API.</li>
          <li>
            Add the Redirect URI exactly as{" "}
            <Typography.Text code>{PRODUCTION_REDIRECT_URI}</Typography.Text>{" "}
            <CopyButton value={PRODUCTION_REDIRECT_URI} label="Copy redirect URI" />
          </li>
          <li>Save, then copy the Client ID (not the secret) and paste it below.</li>
          <li>If you get a 403, add your Spotify email under User Management.</li>
        </ol>
        {localRedirect && localRedirect !== PRODUCTION_REDIRECT_URI && (
          <Typography.Paragraph style={{ marginBottom: 0 }}>
            On this computer, also register{" "}
            <Typography.Text code>{localRedirect}</Typography.Text>{" "}
            <CopyButton value={localRedirect} label="Copy local redirect URI" />
          </Typography.Paragraph>
        )}
        <div>
          <Input
            value={draft}
            aria-label="Spotify Client ID"
            autoComplete="off"
            spellCheck={false}
            status={fieldError ? "error" : undefined}
            placeholder="Spotify Client ID"
            onChange={(event) => {
              setDraft(event.target.value);
              setFieldError(null);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
            }}
            style={{ maxWidth: 420 }}
          />
          {fieldError && (
            <div>
              <Typography.Text type="danger">{fieldError}</Typography.Text>
            </div>
          )}
        </div>
        <Space>
          <Button type="primary" onClick={save}>
            Save Client ID
          </Button>
          <Button onClick={openSampleData}>Try with sample data</Button>
        </Space>
      </Space>
    </Card>
  );
};

export default SpotifySetup;
