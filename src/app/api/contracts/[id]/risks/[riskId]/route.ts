import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Update a specific risk
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; riskId: string } }
) {
  try {
    const contractId = parseInt(params.id)
    const riskId = parseInt(params.riskId)
    const body = await request.json()

    if (isNaN(contractId) || isNaN(riskId)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      )
    }

    // リスクの存在確認
    const existingRisk = await prisma.contractRisk.findFirst({
      where: {
        id: riskId,
        contractId: contractId
      }
    })

    if (!existingRisk) {
      return NextResponse.json(
        { error: 'リスクが見つかりません' },
        { status: 404 }
      )
    }

    // 更新可能フィールドの抽出
    const updateData: any = {}
    if (body.text !== undefined) updateData.text = body.text
    if (body.type !== undefined) updateData.type = body.type
    if (body.reason !== undefined) updateData.reason = body.reason
    if (body.articleInfo !== undefined) updateData.articleInfo = body.articleInfo
    if (body.articleTitle !== undefined) updateData.articleTitle = body.articleTitle
    if (body.articleOverview !== undefined) updateData.articleOverview = body.articleOverview
    if (body.specificClause !== undefined) updateData.specificClause = body.specificClause
    if (body.pageNumber !== undefined) updateData.pageNumber = body.pageNumber
    if (body.positionStart !== undefined) updateData.positionStart = body.positionStart
    if (body.positionEnd !== undefined) updateData.positionEnd = body.positionEnd

    // リスク更新
    const updatedRisk = await prisma.contractRisk.update({
      where: { id: riskId },
      data: updateData
    })

    return NextResponse.json(
      { message: 'リスクが正常に更新されました', data: updatedRisk },
      { status: 200 }
    )
  } catch (error) {
    console.error('Risk update error:', error)
    return NextResponse.json(
      { error: 'リスクの更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Delete a specific risk
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; riskId: string } }
) {
  try {
    const contractId = parseInt(params.id)
    const riskId = parseInt(params.riskId)

    if (isNaN(contractId) || isNaN(riskId)) {
      return NextResponse.json(
        { error: '無効なIDです' },
        { status: 400 }
      )
    }

    // リスクの存在確認
    const existingRisk = await prisma.contractRisk.findFirst({
      where: {
        id: riskId,
        contractId: contractId
      }
    })

    if (!existingRisk) {
      return NextResponse.json(
        { error: 'リスクが見つかりません' },
        { status: 404 }
      )
    }

    // リスク削除
    await prisma.contractRisk.delete({
      where: { id: riskId }
    })

    return NextResponse.json(
      { message: 'リスクが正常に削除されました' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Risk deletion error:', error)
    return NextResponse.json(
      { error: 'リスクの削除に失敗しました' },
      { status: 500 }
    )
  }
}