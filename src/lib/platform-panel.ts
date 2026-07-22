import { isPlatformFounder } from "@/lib/platform-admin";

export async function isPlatformPanelAdmin(userId: string): Promise<boolean> {
  const designated = process.env.PLATFORM_PANEL_ADMIN_ID?.trim();
  if (designated) {
    return userId === designated;
  }
  return isPlatformFounder(userId);
}
