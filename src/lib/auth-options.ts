import GoogleProvider from 'next-auth/providers/google';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt' as const,
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
      if (account?.provider === 'google') {
        token.googleSub = account.providerAccountId;
        token.id = account.providerAccountId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).id = (token.id || token.sub || '') as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.image = token.picture as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        try {
          const { db } = await import('@/lib/db');
          const googleSub = account.providerAccountId;
          let existingUser = await db.user.findUnique({ where: { googleId: googleSub } });
          if (!existingUser) {
            existingUser = await db.user.findUnique({ where: { email: user.email } });
            if (existingUser) {
              await db.user.update({
                where: { id: existingUser.id },
                data: { googleId: googleSub, image: user.image },
              });
            } else {
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
        } catch (dbError) {
          console.error('signIn DB error (non-blocking):', dbError);
        }
      }
      return true;
    },
  },
  pages: {
    signIn: '/',
    error: '/auth-error',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
