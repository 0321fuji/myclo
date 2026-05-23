import NextAuth from "next-auth";
import { config } from "@/lib/auth";

const { auth } = NextAuth(config);

export default auth;

export const middlewareConfig = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
