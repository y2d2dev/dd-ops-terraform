import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import logger from '@/lib/logger'

/**
 * Get all projects for the current user
 * @param request - NextRequest object
 * @returns JSON response with projects list
 */
export async function GET(request: NextRequest) {
  try {
    logger.debug({ route: '/api/projects' }, 'List projects')

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

    // ログインユーザーが作成したプロジェクト または メンバーとして参加しているプロジェクトを取得
    const projects = await prisma.project.findMany({
      where: {
        OR: [
          { userId: userId },  // 作成者
          {
            projectUsers: {
              some: { userId: userId }  // メンバー
            }
          }
        ],
        deletedAt: null
      },
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            projectUsers: true,
            contracts: true
          }
        },
        ocrPageCounts: {
          select: {
            pageCount: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // userIdがnullのプロジェクトがあればエラーログを出力
    const nullUserIdProjects = await prisma.project.findMany({
      where: { userId: null },
      select: { id: true, name: true }
    })

    if (nullUserIdProjects.length > 0) {
      logger.error(
        {
          route: '/api/projects',
          nullUserIdProjects: nullUserIdProjects.map(p => ({ id: p.id, name: p.name }))
        },
        'Projects with null userId found - these will not be visible to users'
      )
    }

    // OCRページカウントを月別に集計
    const projectsWithMonthlyOcrCounts = projects.map(project => {
      const monthlyOcrCounts: { [key: string]: number } = {}

      project.ocrPageCounts.forEach(count => {
        const monthKey = count.createdAt.toISOString().slice(0, 7) // YYYY-MM形式
        monthlyOcrCounts[monthKey] = (monthlyOcrCounts[monthKey] || 0) + count.pageCount
      })

      // 月別集計をソート
      const sortedMonthlyOcrCounts = Object.fromEntries(
        Object.entries(monthlyOcrCounts).sort(([a], [b]) => a.localeCompare(b))
      )

      return {
        ...project,
        ocrPageCounts: sortedMonthlyOcrCounts,
        totalPageCount: Object.values(monthlyOcrCounts).reduce((sum, count) => sum + count, 0)
      }
    })

    return NextResponse.json(
      { projects: projectsWithMonthlyOcrCounts },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error, route: '/api/projects' }, 'Get projects error')

    // JWTトークンエラーの場合は401を返す
    if (error instanceof Error && error.message.includes('jwt')) {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'プロジェクト一覧の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Create a new project
 * @param request - NextRequest object
 * @returns JSON response with created project
 */
export async function POST(request: NextRequest) {
  try {
    logger.info({ route: '/api/projects', action: 'create' }, 'Create project')

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

    const { name, description, targetCompany } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'プロジェクト名は必須です' },
        { status: 400 }
      )
    }

    if (!targetCompany || targetCompany.trim().length === 0) {
      return NextResponse.json(
        { error: '対象会社は必須です' },
        { status: 400 }
      )
    }

    // JWTトークンから取得したuserIdでユーザーを取得
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        projectUsers: {
          include: {
            project: {
              include: {
                workspace: true
              }
            }
          }
        }
      }
    })

    if (!currentUser) {
      return NextResponse.json(
        { error: 'ユーザーが見つかりません' },
        { status: 404 }
      )
    }

    // ユーザーが所属するワークスペースを取得
    let userWorkspaceId: number
    if (currentUser.projectUsers.length > 0) {
      // 既存のプロジェクトからワークスペースを取得
      userWorkspaceId = currentUser.projectUsers[0].project.workspaceId
    } else {
      // ユーザーがプロジェクトに所属していない場合は最初に作成されたワークスペースを使用
      const firstWorkspace = await prisma.workSpace.findFirst({
        orderBy: { id: 'asc' }
      })
      if (!firstWorkspace) {
        return NextResponse.json(
          { error: 'ワークスペースが見つかりません' },
          { status: 404 }
        )
      }
      userWorkspaceId = firstWorkspace.id
    }

    // トランザクションでプロジェクト作成とユーザー関連付けを実行
    const result = await prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          workspaceId: userWorkspaceId,
          name: name.trim(),
          description: description?.trim() || null,
          targetCompany: targetCompany.trim(),
          userId: currentUser.id
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      // ユーザーをプロジェクトに関連付け
      await tx.projectUser.create({
        data: {
          userId: currentUser.id,
          projectId: project.id
        }
      })

      return project
    })

    return NextResponse.json(
      {
        message: 'プロジェクトを作成しました',
        project: result
      },
      { status: 201 }
    )
  } catch (error) {
    logger.error({ err: error, route: '/api/projects' }, 'Create project error')

    // JWTトークンエラーの場合は401を返す
    if (error instanceof Error && error.message.includes('jwt')) {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'プロジェクトの作成に失敗しました' },
      { status: 500 }
    )
  }
}