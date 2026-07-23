// Bu Kod Şuanlık Hata Dolu O Yüzden Kapalı Olacak.

const JUBBIO_CLIENT_ID = process.env.JUBBIO_CLIENT_ID;
const JUBBIO_CLIENT_SECRET = process.env.JUBBIO_CLIENT_SECRET;
const JUBBIO_REDIRECT_URI = process.env.JUBBIO_REDIRECT_URI || "http://localhost:3000/api/auth/jubbio/callback";

if (!JUBBIO_CLIENT_ID || !JUBBIO_CLIENT_SECRET) {
  throw new Error("Jubbio client ID and secret must be provided.");
}

export function getJubbioAuthUrl(): string {
  const params = new URLSearchParams({
    client_id: JUBBIO_CLIENT_ID,
    redirect_uri: JUBBIO_REDIRECT_URI,
    response_type: "code",
    scope: "identify email presences.read activities.read rpc",
  });

  return `https://jubbio.com/oauth2/authorize?${params.toString()}`;
}

export async function getJubbioTokens(code: string): Promise<any> {
  const params = new URLSearchParams({
    client_id: JUBBIO_CLIENT_ID,
    client_secret: JUBBIO_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: JUBBIO_REDIRECT_URI,
  });

  const response = await fetch("https://jubbio.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to fetch Jubbio tokens.");
  }

  return response.json();
}

export async function getJubbioUserProfile(accessToken: string): Promise<any> {
  const response = await fetch("https://jubbio.com/api/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error_description || "Failed to fetch Jubbio user profile.");
  }

  return response.json();
}
