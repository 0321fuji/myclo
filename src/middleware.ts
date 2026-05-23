export { auth as middleware } from "@/lib/auth";

export const config = {
  matcher: [
    "/",
    "/closet/:path*",
    "/settings/:path*",
    "/api/clothing/:path*",
    "/api/outfit/:path*",
    "/api/upload/:path*",
  ],
};
