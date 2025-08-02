import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Para demo: permitir acceso a todas las rutas sin verificación
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
