import { getServerSession } from 'next-auth';
import { authOptions } from './auth-options';

// For server-side: use in API routes and server components
export async function auth() {
  return await getServerSession(authOptions);
}

// Re-export for client components
export { signIn, signOut } from 'next-auth';
