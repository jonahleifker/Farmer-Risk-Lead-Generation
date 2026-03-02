import NextAuth from 'next-auth';
import authConfig from '@/lib/auth.config';

// Middleware uses the edge-safe auth config (no Prisma imports)
export default NextAuth(authConfig).auth;

export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder assets
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
