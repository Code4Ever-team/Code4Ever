import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { isLocale, locales, defaultLocale } from "@/i18n/routing";
import { verifySession } from "@/lib/session";

const handleI18n = createMiddleware({
  locales: [...locales],
  defaultLocale,
  localePrefix: "always",
});

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const localeRelay = pathname.match(/^\/(tr|en)\/relay(\/.*)?$/);
  if (localeRelay) {
    const suffix = localeRelay[2] ?? "";
    const url = req.nextUrl.clone();
    url.pathname = `/api/relay${suffix}`;
    return NextResponse.rewrite(url);
  }

  const i18nResponse = handleI18n(req);

  if (i18nResponse && i18nResponse.headers.get("location")) {
    return i18nResponse;
  }

  const localeSegment = pathname.split("/")[1] ?? "";
  const locale = isLocale(localeSegment) ? localeSegment : defaultLocale;
  const basePath = pathname.replace(new RegExp(`^/(${locales.join("|")})(?=/|$)`), "") || "/";

  const isAuthPage = basePath.startsWith("/login") || basePath.startsWith("/register");
  const isProtected =
    basePath.startsWith("/dashboard") ||
    basePath.startsWith("/chat") ||
    basePath.startsWith("/settings") ||
    basePath.startsWith("/admin");

  if (!isAuthPage && !isProtected) {
    return NextResponse.next();
  }

  const session = await verifySession(req);
  const isLoggedIn = session !== null;

  if (isAuthPage && isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (isProtected && !isLoggedIn) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    url.searchParams.set("redirect", `/${locale}${basePath}`);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};

