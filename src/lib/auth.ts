import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

const useGoogle = !!process.env.GOOGLE_CLIENT_ID && !!process.env.GOOGLE_CLIENT_SECRET;

const providers = useGoogle
  ? [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        authorization: {
          params: {
            prompt: 'consent',
            access_type: 'offline',
            scope: 'openid email profile',
          },
        },
      }),
    ]
  : [];

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      // Store Google OAuth ID when available
      if (account?.provider === 'google') {
        token.googleId = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      // When Google OAuth is used, sync user to our DB
      if (account?.provider === 'google' && user.email) {
        const { db } = await import('@/lib/db');
        const existingUser = await db.user.findUnique({ where: { email: user.email } });
        if (!existingUser) {
          await db.user.create({
            data: {
              id: user.id,
              googleId: account.providerAccountId,
              email: user.email,
              name: user.name || 'Player',
              image: user.image,
            },
          });
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET || 'arushiko-stt-dev-secret-change-in-production',
};

export const isGoogleAuthConfigured = useGoogle;
