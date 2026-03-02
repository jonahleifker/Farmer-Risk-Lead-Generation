import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

/**
 * Edge-safe auth configuration.
 * This file must NOT import Prisma or any Node.js-only modules,
 * because it is used in middleware which runs on Edge runtime (Vercel).
 *
 * The actual credential validation (bcrypt + Prisma) happens in auth.ts
 * which is only used in server-side API routes (Node.js runtime).
 */
export default {
    providers: [
        Credentials({
            name: 'credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            // authorize is intentionally omitted here — it's defined in auth.ts
            // The middleware only needs to check the JWT, not validate credentials
            authorize: () => null,
        }),
    ],
    session: {
        strategy: 'jwt',
    },
    pages: {
        signIn: '/login',
    },
    trustHost: true,
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
        async authorized({ auth, request: { nextUrl } }) {
            const isLoggedIn = !!auth?.user;
            const publicPaths = ['/login', '/register', '/api/auth', '/api/register'];
            const isPublicPath = publicPaths.some((path) => nextUrl.pathname.startsWith(path));

            if (isPublicPath) {
                if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
                    return Response.redirect(new URL('/dashboard', nextUrl));
                }
                return true;
            }

            if (!isLoggedIn) {
                return false; // Redirects to signIn page automatically
            }

            return true;
        },
    },
} satisfies NextAuthConfig;
