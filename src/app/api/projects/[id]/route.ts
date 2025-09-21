import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import logger from '@/lib/logger'

/**
 * Get project details by ID
 * @param request - NextRequest object
 * @param params - Route parameters
 * @returns JSON response with project details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.debug({ route: '/api/projects/[id]', id: params.id }, 'Get project')
    const projectId = parseInt(params.id)

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: '無効なプロジェクトIDです' },
        { status: 400 }
      )
    }

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

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
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
            contracts: true,
            projectUsers: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'プロジェクトが見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: project },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error, route: '/api/projects/[id]' }, 'Get project error')

    // JWTトークンエラーの場合は401を返す
    if (error instanceof Error && error.message.includes('jwt')) {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'プロジェクトの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Delete project by ID
 * @param request - NextRequest object
 * @param params - Route parameters
 * @returns JSON response
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info({ route: '/api/projects/[id]', id: params.id, action: 'delete' }, 'Archive project')
    const projectId = parseInt(params.id)

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: '無効なプロジェクトIDです' },
        { status: 400 }
      )
    }

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

    // プロジェクトの存在確認と権限チェック（作成者またはメンバーが削除可能）
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: userId },  // 作成者
          {
            projectUsers: {
              some: { userId: userId }  // メンバー
            }
          }
        ],
        deletedAt: null
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'プロジェクトが見つかりません、または削除権限がありません' },
        { status: 404 }
      )
    }

    // 論理削除（deletedAtにタイムスタンプを設定）
    await prisma.project.update({
      where: { id: projectId },
      data: {
        deletedAt: new Date().toISOString()
      }
    })

    return NextResponse.json(
      { message: 'プロジェクトをアーカイブしました' },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error, route: '/api/projects/[id]' }, 'Delete project error')

    // JWTトークンエラーの場合は401を返す
    if (error instanceof Error && error.message.includes('jwt')) {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'プロジェクトの削除に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Update project by ID
 * @param request - NextRequest object
 * @param params - Route parameters
 * @returns JSON response with updated project
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    logger.info({ route: '/api/projects/[id]', id: params.id, action: 'update' }, 'Update project')
    const projectId = parseInt(params.id)

    if (isNaN(projectId)) {
      return NextResponse.json(
        { error: '無効なプロジェクトIDです' },
        { status: 400 }
      )
    }

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

    const body = await request.json()
    const { name, description, targetCompany } = body

    // プロジェクトの存在確認と権限チェック（作成者またはメンバーが更新可能）
    const existingProject = await prisma.project.findFirst({
      where: {
        id: projectId,
        OR: [
          { userId: userId },  // 作成者
          {
            projectUsers: {
              some: { userId: userId }  // メンバー
            }
          }
        ],
        deletedAt: null
      }
    })

    if (!existingProject) {
      return NextResponse.json(
        { error: 'プロジェクトが見つかりません、または更新権限がありません' },
        { status: 404 }
      )
    }

    // 更新データを準備
    const updateData: any = {}
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (targetCompany !== undefined) updateData.targetCompany = targetCompany

    // プロジェクトを更新
    const updatedProject = await prisma.project.update({
      where: { id: projectId },
      data: updateData,
      include: {
        workspace: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            contracts: true,
            projectUsers: true
          }
        }
      }
    })

    return NextResponse.json(
      { data: updatedProject },
      { status: 200 }
    )
  } catch (error) {
    logger.error({ err: error, route: '/api/projects/[id]' }, 'Update project error')

    // JWTトークンエラーの場合は401を返す
    if (error instanceof Error && error.message.includes('jwt')) {
      return NextResponse.json(
        { error: '認証エラー' },
        { status: 401 }
      )
    }

    return NextResponse.json(
      { error: 'プロジェクトの更新に失敗しました' },
      { status: 500 }
    )
  }
}