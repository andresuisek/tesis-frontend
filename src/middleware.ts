import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rutas públicas que no requieren autenticación
  const publicPaths = ['/login', '/registro', '/'];
  const pathname = request.nextUrl.pathname;

  // Si está en la ruta raíz, permitir que el componente page.tsx maneje la redirección
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Si está en una ruta pública, permitir acceso
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // Verificar si hay token de autenticación en las cookies
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';

  // Si no está autenticado y trata de acceder a una ruta protegida
  if (!isAuthenticated && !publicPaths.includes(pathname)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Si está autenticado y trata de acceder a login/registro, redirigir al dashboard
  if (isAuthenticated && (pathname === '/login' || pathname === '/registro')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
