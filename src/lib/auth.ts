import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    // Microsoft provider will be added when Azure AD is configured
    // AzureADProvider({
    //   clientId: process.env.AZURE_AD_CLIENT_ID || "",
    //   clientSecret: process.env.AZURE_AD_CLIENT_SECRET || "",
    //   tenantId: process.env.AZURE_AD_TENANT_ID || "",
    // }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Fetch full user with role from database
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email! },
          select: { id: true, role: true },
        });
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
};
