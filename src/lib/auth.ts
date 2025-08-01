import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './db';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          // First, try to authenticate against the database
          const user = await prisma.user.findUnique({
            where: {
              username: credentials.username as string,
            },
          });

          if (user) {
            const isPasswordValid = await bcrypt.compare(
              credentials.password as string,
              user.password
            );

            if (isPasswordValid) {
              return {
                id: user.id,
                username: user.username,
                name: user.username, // NextAuth expects name field
              };
            }
          }

          // Fallback: Check against environment variables
          const envUsername = process.env.APP_USERNAME || 'admin';
          const envPassword = process.env.APP_PASSWORD || 'password123';

          if (credentials.username === envUsername && credentials.password === envPassword) {
            return {
              id: 'env-admin',
              username: envUsername,
              name: envUsername,
            };
          }

          return null;
        } catch (error) {
          console.error('Auth error:', error);
          
          // If database fails, fallback to environment variables
          const envUsername = process.env.APP_USERNAME || 'admin';
          const envPassword = process.env.APP_PASSWORD || 'password123';

          if (credentials.username === envUsername && credentials.password === envPassword) {
            return {
              id: 'env-admin',
              username: envUsername,
              name: envUsername,
            };
          }

          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.username = user.username;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.sub as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
});