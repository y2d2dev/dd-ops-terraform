import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password, workspaceId } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'メールアドレスとパスワードは必須です' },
        { status: 400 }
      )
    }

    // ワークスペースIDが必要
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'ワークスペースの選択が必要です' },
        { status: 400 }
      )
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'このメールアドレスは既に使用されています' },
        { status: 400 }
      )
    }

    const hashedPassword = await hashPassword(password)

    // トランザクションでユーザー、ワークスペース、プロジェクト、関連付けを一括作成
    const result = await prisma.$transaction(async (tx) => {
      // ユーザー作成
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword
        }
      })

      // 既存のワークスペースを使用
      const workspace = await tx.workSpace.findUnique({
        where: { id: parseInt(workspaceId) }
      })
      if (!workspace) {
        throw new Error('指定されたワークスペースが見つかりません')
      }

      // デフォルトプロジェクト作成
      const project = await tx.project.create({
        data: {
          workspaceId: workspace.id,
          name: `${workspace.name}のメインプロジェクト`,
          description: 'デフォルトプロジェクト'
        }
      })

      // ユーザーをワークスペースに関連付け
      await tx.workspaceUser.create({
        data: {
          userId: user.id,
          workspaceId: workspace.id,
          role: 1 // 1: member, 2: admin
        }
      })

      // ユーザーをプロジェクトに関連付け
      await tx.projectUser.create({
        data: {
          userId: user.id,
          projectId: project.id
        }
      })

      return { user, workspace, project }
    })

    return NextResponse.json(
      {
        message: 'ユーザー登録に成功しました',
        user: { id: result.user.id, email: result.user.email },
        workspace: { id: result.workspace.id, name: result.workspace.name },
        project: { id: result.project.id, name: result.project.name }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Registration error:', error)
    const errorMessage = error instanceof Error ? error.message : 'サーバーエラーが発生しました'
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}