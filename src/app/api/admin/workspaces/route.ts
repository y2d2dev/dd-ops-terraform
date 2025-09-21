import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Get all workspaces with their accessible IPs
 */
export async function GET(request: NextRequest) {
  try {
    const workspaces = await prisma.workSpace.findMany({
      select: {
        id: true,
        name: true,
        accessable_ips: true,
        projects: {
          select: {
            id: true,
            name: true,
            _count: {
              select: {
                contracts: true,
                projectUsers: true
              }
            }
          }
        }
      },
      orderBy: {
        id: 'asc'
      }
    })

    return NextResponse.json(workspaces)
  } catch (error) {
    console.error('Get workspaces error:', error)
    return NextResponse.json(
      { error: 'ワークスペースの取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Create new workspace
 */
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json()

    if (!name || name.trim().length === 0) {
      return NextResponse.json(
        { error: 'ワークスペース名は必須です' },
        { status: 400 }
      )
    }

    // 同名のワークスペースが存在するかチェック
    const existingWorkspace = await prisma.workSpace.findFirst({
      where: { name: name.trim() }
    })

    if (existingWorkspace) {
      return NextResponse.json(
        { error: 'このワークスペース名は既に使用されています' },
        { status: 400 }
      )
    }

    const workspace = await prisma.workSpace.create({
      data: {
        name: name.trim(),
        accessable_ips: [] // 新規作成時は空配列
      },
      select: {
        id: true,
        name: true,
        accessable_ips: true
      }
    })

    return NextResponse.json({
      message: 'ワークスペースを作成しました',
      workspace
    })
  } catch (error) {
    console.error('Create workspace error:', error)
    return NextResponse.json(
      { error: 'ワークスペースの作成に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Update workspace accessible IPs
 */
export async function PUT(request: NextRequest) {
  try {
    const { workspaceId, accessable_ips } = await request.json()
    console.log('PUT /api/admin/workspaces - workspaceId:', workspaceId, 'accessable_ips:', accessable_ips)

    if (!workspaceId || !Array.isArray(accessable_ips)) {
      return NextResponse.json(
        { error: 'ワークスペースIDとIPアドレス配列は必須です' },
        { status: 400 }
      )
    }


    const updatedWorkspace = await prisma.workSpace.update({
      where: { id: workspaceId },
      data: {
        accessable_ips: accessable_ips.map((ip: string) => ip.trim())
      },
      select: {
        id: true,
        name: true,
        accessable_ips: true
      }
    })

    return NextResponse.json({
      message: 'IPアドレス制限を更新しました',
      workspace: updatedWorkspace
    })
  } catch (error) {
    console.error('Update workspace error:', error)
    return NextResponse.json(
      { error: 'ワークスペースの更新に失敗しました' },
      { status: 500 }
    )
  }
}