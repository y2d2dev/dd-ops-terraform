import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Get a specific contract by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id)

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '無効な契約書IDです' },
        { status: 400 }
      )
    }

    const contract = await prisma.contract.findUnique({
      where: { id: contractId },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        contractRisks: {
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    if (!contract) {
      return NextResponse.json(
        { error: '契約書が見つかりません' },
        { status: 404 }
      )
    }

    return NextResponse.json(
      { data: contract },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contract fetch error:', error)
    return NextResponse.json(
      { error: '契約書の取得に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Update a specific contract
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id)
    const body = await request.json()
    const { title, party, startDate, endDate, isSave } = body

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '無効な契約書IDです' },
        { status: 400 }
      )
    }

    // 契約書の存在確認
    const existingContract = await prisma.contract.findUnique({
      where: { id: contractId }
    })

    if (!existingContract) {
      return NextResponse.json(
        { error: '契約書が見つかりません' },
        { status: 404 }
      )
    }

    // 契約書更新
    const updatedContract = await prisma.contract.update({
      where: { id: contractId },
      data: {
        title,
        party,
        startDate,
        endDate,
        isSave
      }
    })

    return NextResponse.json(
      { message: '契約書が正常に更新されました', data: updatedContract },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contract update error:', error)
    return NextResponse.json(
      { error: '契約書の更新に失敗しました' },
      { status: 500 }
    )
  }
}

/**
 * Delete a specific contract
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const contractId = parseInt(params.id)

    if (isNaN(contractId)) {
      return NextResponse.json(
        { error: '無効な契約書IDです' },
        { status: 400 }
      )
    }

    // 契約書の存在確認
    const existingContract = await prisma.contract.findUnique({
      where: { id: contractId }
    })

    if (!existingContract) {
      return NextResponse.json(
        { error: '契約書が見つかりません' },
        { status: 404 }
      )
    }

    // トランザクションで関連データも削除
    await prisma.$transaction(async (tx) => {
      // 関連するContractRiskを削除
      await tx.contractRisk.deleteMany({
        where: { contractId: contractId }
      })

      // 契約書を削除
      await tx.contract.delete({
        where: { id: contractId }
      })
    })

    return NextResponse.json(
      { message: '契約書が正常に削除されました' },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contract deletion error:', error)
    return NextResponse.json(
      { error: '契約書の削除に失敗しました' },
      { status: 500 }
    )
  }
}