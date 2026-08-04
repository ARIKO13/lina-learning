import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

export const authOptions: NextAuthOptions = {
  providers: [
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
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user, account }) {
      // First login: store Google sub as the user ID
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      // Store Google OAuth provider account ID (Google sub)
      if (account?.provider === 'google') {
        token.googleSub = account.providerAccountId;
        token.id = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id || token.sub || '') as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const { db } = await import('@/lib/db');
        const googleSub = account.providerAccountId;

        // Check if user exists by googleId
        let existingUser = await db.user.findUnique({ where: { googleId: googleSub } });

        if (!existingUser) {
          // Check by email in case of migration
          existingUser = await db.user.findUnique({ where: { email: user.email } });
          if (existingUser) {
            // Update existing user with Google ID
            await db.user.update({
              where: { id: existingUser.id },
              data: { googleId: googleSub, image: user.image },
            });
          } else {
            // Create new user
            await db.user.create({
              data: {
                id: googleSub,
                googleId: googleSub,
                email: user.email,
                name: user.name || 'Player',
                image: user.image,
              },
            });
          }
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
