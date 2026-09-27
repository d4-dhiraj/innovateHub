import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: any) {
          res.cookies.delete({ name, ...options })
        },
      },
    }
  )

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // Protected routes that require authentication
  const protectedPaths = ['/citizen', '/university', '/admin']
  const isProtectedPath = protectedPaths.some(path => 
    req.nextUrl.pathname.startsWith(path)
  )

  // If trying to access protected route without session, redirect to login
  if (isProtectedPath && !session) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // If authenticated, check role-based access
  if (isProtectedPath && session) {
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (!profile) {
      return NextResponse.redirect(new URL('/login', req.url))
    }

    // Role-based access control
    const userRole = profile.role
    const pathname = req.nextUrl.pathname

    // Citizen trying to access non-citizen routes
    if (userRole === 'citizen' && (pathname.startsWith('/university') || pathname.startsWith('/admin'))) {
      return NextResponse.redirect(new URL('/citizen/dashboard', req.url))
    }

    // University trying to access non-university routes
    if (userRole === 'university' && (pathname.startsWith('/citizen') || pathname.startsWith('/admin'))) {
      return NextResponse.redirect(new URL('/university/dashboard', req.url))
    }

    // Admin trying to access non-admin routes
    if (userRole === 'admin' && (pathname.startsWith('/citizen') || pathname.startsWith('/university'))) {
      return NextResponse.redirect(new URL('/admin/dashboard', req.url))
    }
  }

  return res
}

export const config = {
  matcher: ['/citizen/:path*', '/university/:path*', '/admin/:path*']
}
