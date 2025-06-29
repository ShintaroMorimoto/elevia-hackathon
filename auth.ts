import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';
import { users, verificationTokens, accounts, sessions } from '@/lib/db/schema';
import type { Provider } from 'next-auth/providers';
import Google from 'next-auth/providers/google';

const providers: Provider[] = [
  Google({
    clientId: process.env.AUTH_GOOGLE_ID,
    clientSecret: process.env.AUTH_GOOGLE_SECRET,
  }),
];

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers,
  pages: {
    signIn: '/signin',
  },
  session: {
    strategy: 'database', // セッション戦略を "database" に変更
  },
  trustHost: true, // NextAuth v5でCloud Runなどの動的ホストを信頼
  callbacks: {
    // データベース戦略の場合、sessionコールバックの引数は session と user (DBから取得されたユーザー)
    async session({ session, user }) {
      if (session.user) {
        session.user.id = user.id; // user.id (DBから) をセッションに含める
      }
      return session;
    },

    authorized: async ({ auth }) => {
      // Logged in users are authenticated, otherwise redirect to login page
      return !!auth;
    },
  },
});
