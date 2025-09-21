import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'

export const dynamic = 'force-dynamic'

/**
 * Get all users in the same workspace as the current user
 * TODO: Implement proper authentication to get current user's workspace
 * @param request - NextRequest object
 * @returns JSON response with users list
 */
export async function GET(request: NextRequest) {
  try {
    // JWTトークンから認証情報を取得
    const token = request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json(
        { error: '認証が必要です' },
        { status: 401 }
      )
    }

    const decoded = verifyToken(token)
    const userId = decoded.userId

    // WorkspaceUserから現在ユーザーのワークスペースIDを取得
    const userWorkspaces = await (prisma as any).workspaceUser.findMany({
      where: { userId },
      select: { workspaceId: true }
    })

    if (userWorkspaces.length === 0) {
      return NextResponse.json(
        { users: [] },
        { status: 200 }
      )
    }

    const workspaceIds = userWorkspaces.map((wu: any) => wu.workspaceId)

    // 同じワークスペースのWorkspaceUserからユーザーIDを取得
    const workspaceUsers = await (prisma as any).workspaceUser.findMany({
      where: {
        workspaceId: { in: workspaceIds }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    })

    const userIds = workspaceUsers.map((wu: any) => wu.userId)

    // ユーザー情報を取得
    const users = await prisma.user.findMany({
      where: {
        id: { in: userIds }
      },
      select: {
        id: true,
        email: true
      },
      orderBy: {
        email: 'asc'
      }
    })

    return NextResponse.json(
      { users },
      { status: 200 }
    )
  } catch (error) {
    console.error('Get users error:', error)

    // JWTトークンエラーの場合は401を返す
    if (error instanceof Error && error.message.includes('jwt')) {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'ユーザー一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}