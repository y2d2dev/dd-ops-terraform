import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Update contracts with report generation timestamp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { contractIds } = body

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return NextResponse.json(
        { error: 'contractIds is required and must be a non-empty array' },
        { status: 400 }
      )
    }

    // 現在時刻を取得
    const now = new Date()

    // 複数の契約書を一括更新
    const updatedContracts = await prisma.contract.updateMany({
      where: {
        id: {
          in: contractIds
        }
      },
      data: {
        reportGeneratedAt: now
      }
    })

    return NextResponse.json({
      success: true,
      updatedCount: updatedContracts.count,
      timestamp: now.toISOString()
    })

  } catch (error) {
    console.error('Error updating report generation timestamp:', error)
    return NextResponse.json(
      { error: 'Failed to update report generation timestamp' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}