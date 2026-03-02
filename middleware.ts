import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
    const { nextUrl } = req;
    const isLoggedIn = !!req.auth;

    // Public routes that don't require authentication
    const publicPaths = ['/login', '/register', '/api/auth', '/api/register'];
    const isPublicPath = publicPaths.some((path) => nextUrl.pathname.startsWith(path));

    // Allow public assets and API auth routes
    if (isPublicPath) {
        // If logged in and trying to access login/register, redirect to dashboard
        if (isLoggedIn && (nextUrl.pathname === '/login' || nextUrl.pathname === '/register')) {
            return NextResponse.redirect(new URL('/dashboard', nextUrl));
        }
        return NextResponse.next();
    }

    // Protect all other routes — redirect to login if not authenticated
    if (!isLoggedIn) {
        const loginUrl = new URL('/login', nextUrl);
        loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next();
});

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
