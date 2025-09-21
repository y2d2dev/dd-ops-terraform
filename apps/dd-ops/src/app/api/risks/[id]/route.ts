import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Update a risk item
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const riskId = parseInt(params.id)
    const body = await request.json()
    const { title, prompt, description } = body

    // バリデーション
    if (!title || !prompt || !description) {
      return NextResponse.json(
        { error: 'title, prompt, description are required' },
        { status: 400 }
      )
    }

    // リスクが存在し、かつカスタムリスク（workspaceId != null）であることを確認
    const existingRisk = await prisma.risk.findUnique({
      where: { id: riskId }
    })

    if (!existingRisk) {
      return NextResponse.json(
        { error: 'Risk not found' },
        { status: 404 }
      )
    }

    // デフォルトリスク（workspaceId = null）は編集不可
    if (existingRisk.workspaceId === null) {
      return NextResponse.json(
        { error: 'Default risks cannot be edited' },
        { status: 403 }
      )
    }

    const risk = await prisma.risk.update({
      where: { id: riskId },
      data: {
        title,
        prompt,
        description
      }
    })

    return NextResponse.json(risk)
  } catch (error) {
    console.error('Failed to update risk:', error)
    return NextResponse.json(
      { error: 'Failed to update risk' },
      { status: 500 }
    )
  }
}

/**
 * Delete a risk item
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const riskId = parseInt(params.id)

    // リスクが存在し、かつカスタムリスク（workspaceId != null）であることを確認
    const existingRisk = await prisma.risk.findUnique({
      where: { id: riskId }
    })

    if (!existingRisk) {
      return NextResponse.json(
        { error: 'Risk not found' },
        { status: 404 }
      )
    }

    // デフォルトリスク（workspaceId = null）は削除不可
    if (existingRisk.workspaceId === null) {
      return NextResponse.json(
        { error: 'Default risks cannot be deleted' },
        { status: 403 }
      )
    }

    await prisma.risk.delete({
      where: { id: riskId }
    })

    return NextResponse.json({ message: 'Risk deleted successfully' })
  } catch (error) {
    console.error('Failed to delete risk:', error)
    return NextResponse.json(
      { error: 'Failed to delete risk' },
      { status: 500 }
    )
  }
}