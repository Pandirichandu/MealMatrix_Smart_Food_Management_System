import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function proxy(request: NextRequest) {
    const token = request.cookies.get('token')?.value

    // Protected Routes
    const startPath = request.nextUrl.pathname;

    if (startPath.startsWith('/admin') || startPath.startsWith('/owner') || startPath.startsWith('/student')) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
    }

    return NextResponse.next()
}

export const config = {
    matcher: ['/admin/:path*', '/owner/:path*', '/student/:path*'],
}
