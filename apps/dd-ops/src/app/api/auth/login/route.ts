import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'
import logger from '@/lib/logger'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      logger.warn({ route: '/api/auth/login' }, 'Missing credentials')
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user) {
      logger.info({ route: '/api/auth/login', email }, 'User not found')
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 401 }
      )
    }

    const isPasswordValid = await verifyPassword(password, user.password)

    if (!isPasswordValid) {
      logger.info({ route: '/api/auth/login', email }, 'Invalid password')
      return NextResponse.json(
        { error: 'パスワードが正しくありません' },
        { status: 401 }
      )
    }

    // JWTトークンを生成
    const token = generateToken({
      userId: user.id,
      email: user.email
    })

    // レスポンスを作成してクッキーにトークンを設定
    const response = NextResponse.json(
      {
        message: 'ログインに成功しました',
        user: { id: user.id, email: user.email }
      },
      { status: 200 }
    )

    // HTTPOnlyクッキーでトークンを設定
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7日間
      path: '/'
    })

    logger.info({ route: '/api/auth/login', userId: user.id }, 'Login success')
    return response
  } catch (error) {
    logger.error({ err: error, route: '/api/auth/login' }, 'Login error')
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
}