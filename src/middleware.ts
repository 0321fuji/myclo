import NextAuth from "next-auth";
import { config as authConfig } from "@/lib/auth";

const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
