import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isY2d2Subdomain } from './utils/subdomain'
import { getClientIP } from './utils/ip'

/**
 * IP制限とJWT認証を確認するミドルウェア
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const hostname = request.headers.get('host') || request.nextUrl.hostname

  // 静的ファイルやNext.js内部ファイル、IP制限チェックAPIは最初に除外
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname === '/api/ip-check'
  ) {
    return NextResponse.next()
  }

  // Y2d2サブドメインの場合の処理
  // ポート番号を除去してサブドメイン判定
  const hostnameWithoutPort = hostname.split(':')[0]
  const isY2d2 = isY2d2Subdomain(hostname)
  console.log(`Middleware: hostname=${hostname}, hostnameWithoutPort=${hostnameWithoutPort}, isY2d2=${isY2d2}`)

  // y2d2サブドメイン以外のみIP制限チェック（全リクエストに適用）
  if (!isY2d2) {
    try {
      const proto = request.headers.get('x-forwarded-proto') || 'https';
      const fwdHost = request.headers.get('x-forwarded-host');
      const host = fwdHost || request.headers.get('host') || request.nextUrl.host;
      const origin = `${proto}://${host}`;

      const clientIP = getClientIP(request)

      const ipCheckUrl = `${origin}/api/ip-check`;


      // IP制限チェックAPIを呼び出し
      const ipCheckResponse = await fetch(ipCheckUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ip: clientIP }),
      })

      if (ipCheckResponse.ok) {
        const ipCheckResult = await ipCheckResponse.json()

        if (ipCheckResult.hasRestrictions && !ipCheckResult.allowed) {
          console.error(`IP制限によるアクセス拒否: IP=${clientIP}, パス=${pathname}`)

          // APIリクエストの場合は403エラーを返す
          if (pathname.startsWith('/api/')) {
            return NextResponse.json(
              { error: 'このIPアドレスからのアクセスは許可されていません' },
              { status: 403 }
            )
          }

          // 通常のページアクセスの場合は/loginにリダイレクト
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('error', 'ip_restricted')
          return NextResponse.redirect(loginUrl)
        }
      }
    } catch (error) {
      console.error('IP制限チェック中にエラーが発生:', error)
      // IP制限チェックでエラーが発生した場合は処理を続行
    }
  }

  // API routesは認証チェックをスキップ（各APIで個別にチェック）
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  if (isY2d2) {
    // ログインページの場合は許可（ログイン処理のため）
    if (pathname.startsWith('/login')) {
      return NextResponse.next()
    }

    // JWTトークンをチェック
    const authCookie = request.cookies.get('auth-token')
    const token = authCookie?.value

    if (!token || token.trim() === '') {
      // トークンがない場合はログインページにリダイレクト
      console.log(`No token found, redirecting to login`)
      const loginUrl = new URL('/login', request.url)
      return NextResponse.redirect(loginUrl)
    }

    // /administratorパス以外へのアクセスは/administratorにリダイレクト
    if (!pathname.startsWith('/administrator')) {
      console.log(`Redirecting to /administrator from ${pathname}`)
      const administratorUrl = new URL('/administrator', request.url)
      return NextResponse.redirect(administratorUrl)
    }
    // /administratorパスへのアクセスは許可
    return NextResponse.next()
  }

  // 通常のサブドメイン以外からの/administratorアクセスは拒否
  if (pathname.startsWith('/administrator')) {
    const homeUrl = new URL('/', request.url)
    return NextResponse.redirect(homeUrl)
  }

  // 認証が必要なパスを定義
  const protectedPaths = [
    '/',
    '/create-project',
    '/project',
    '/members',
    '/edit'
  ]

  // 認証不要なパスを定義
  const publicPaths = [
    '/login',
    '/register',
    '/api/auth/login',
    '/api/auth/register'
  ]

  // パブリックパスは認証チェックをスキップ
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // 保護されたパスかチェック
  const isProtectedPath = protectedPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  if (!isProtectedPath) {
    return NextResponse.next()
  }

  // JWTトークンを取得（現在のドメインのクッキーから）
  const authCookie = request.cookies.get('auth-token')
  const token = authCookie?.value

  if (!token || token.trim() === '') {
    // トークンがない場合はログインページにリダイレクト
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // トークンがあれば認証成功として続行（JWT検証は各APIで行う）
  return NextResponse.next()
}

export const config = {
  // ミドルウェアを適用するパスを指定
  matcher: [
    /*
     * 以下を除く全てのパスにマッチ:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}