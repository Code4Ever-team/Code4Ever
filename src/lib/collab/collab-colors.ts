/** Collab kullanıcı renkleri — cyberpunk palet */
export const COLLAB_COLORS = [
  "#007acc",
  "#51cf66",
  "#ff6b6b",
  "#fcc419",
  "#cc5de8",
  "#20c997",
  "#ff922b",
  "#748ffc",
] as const;

export function collabColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i += 1) {
    hash = (hash << 5) - hash + userId.charCodeAt(i);
    hash |= 0;
  }
  return COLLAB_COLORS[Math.abs(hash) % COLLAB_COLORS.length]!;
}

export function collabWsUrl(): string {
  if (typeof window === "undefined") return "";
  const env = process.env.NEXT_PUBLIC_COLLAB_WS_URL;
  if (env) return env;
  const { protocol, hostname } = window.location;
  const wsProto = protocol === "https:" ? "wss:" : "ws:";
  const port = process.env.NEXT_PUBLIC_COLLAB_WS_PORT ?? "3002";
  return `${wsProto}//${hostname}:${port}/collab`;
}
