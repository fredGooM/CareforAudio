import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req: any) => {
    const { pathname } = req.nextUrl;

    // Public routes
    if (pathname.startsWith('/login') || pathname.startsWith('/api/auth')) {
        return NextResponse.next();
    }

    // Protected routes
    if (!req.auth) {
        return NextResponse.redirect(new URL('/login', req.url));
    }

    // Must change password
    if (req.auth?.user?.mustChangePassword && pathname !== '/change-password') {
        return NextResponse.redirect(new URL('/change-password', req.url));
    }

    // Admin & Teacher routes
    if (pathname.startsWith('/admin') && !['ADMIN', 'TEACHER'].includes(req.auth?.user?.role as string)) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
    }

    return NextResponse.next();
});

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
