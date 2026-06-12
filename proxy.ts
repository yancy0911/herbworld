import { NextRequest, NextResponse } from 'next/server';

function unauthorized(message = 'Authentication required') {
  return new NextResponse(message, {
    status: 401,
    headers: {
      'Cache-Control': 'no-store',
      'WWW-Authenticate': 'Basic realm="Global Dispatch Admin"',
    },
  });
}

export function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // Customer submissions remain public. Every read or administrative mutation is protected.
  if (pathname === '/api/leads' && req.method === 'POST') {
    return NextResponse.next();
  }

  const acceptedPasswords = [process.env.ADMIN_PASSWORD, process.env.OPS_KEY].filter(Boolean);
  if (!acceptedPasswords.length) {
    return new NextResponse('Admin access is not configured', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' },
    });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization?.startsWith('Basic ')) return unauthorized();

  try {
    const [username, suppliedPassword] = atob(authorization.slice(6)).split(':');
    if (username !== 'admin' || !acceptedPasswords.includes(suppliedPassword)) return unauthorized();
  } catch {
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/leads/:path*', '/api/leads/:path*', '/operations/:path*', '/api/community/operations/:path*'],
};
