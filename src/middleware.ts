import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Solo proteger las rutas específicas del dashboard
  const protectedPaths = ['/dashboard', '/usuarios', '/ventas', '/retenciones', '/compras', '/liquidacion', '/chat-inteligente'];

  // Si no es una ruta protegida, permitir acceso
  if (!protectedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Verificar autenticación solo para rutas protegidas
  const isAuthenticated = request.cookies.get('isAuthenticated')?.value === 'true';

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/usuarios/:path*',
    '/ventas/:path*',
    '/retenciones/:path*',
    '/compras/:path*',
    '/liquidacion/:path*',
    '/chat-inteligente/:path*',
  ],
};
