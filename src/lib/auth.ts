import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// We use a credential-based approach for the sandbox.
// In production, swap this with GoogleProvider.
// The Google login flow is simulated here for demo.
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Google',
      credentials: {
        email: { label: 'Email', type: 'email' },
        name: { label: 'Name', type: 'text' },
        image: { label: 'Avatar URL', type: 'text' },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null;
        // In production: verify Google token server-side
        // Here we accept any Google email for sandbox demo
        return {
          id: crypto.randomUUID(),
          email: credentials.email as string,
          name: (credentials.name as string) || credentials.email.split('@')[0],
          image: (credentials.image as string) || null,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
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
  },
  pages: {
    signIn: '/',
  },
};
