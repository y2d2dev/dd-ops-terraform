import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Create a new contract
 */
export async function POST(request: NextRequest) {
  let projectId: number, fileName: string, baseName: string, title: string, party: string, startDate: string, endDate: string, conclusionDate: string
  
  try {
    const body = await request.json()
    ;({ projectId, fileName, baseName, title, party, startDate, endDate, conclusionDate } = body)

    // 必須フィールドのバリデーション
    if (!projectId || !fileName) {
      return NextResponse.json(
        { error: 'プロジェクトIDとファイル名は必須です' },
        { status: 400 }
      )
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'プロジェクトが見つかりません' },
        { status: 404 }
      )
    }

    // 契約書をupsert（存在すれば更新、存在しなければ作成）
    const contract = await prisma.contract.upsert({
      where: {
        projectId_fileName: {
          projectId,
          fileName
        }
      },
      update: {
        title,
        party,
        startDate,
        endDate,
        conclusionDate,
        baseName
      },
      create: {
        projectId,
        fileName,
        baseName,
        title,
        party,
        startDate,
        endDate,
        conclusionDate,
        isSave: false
      }
    })

    return NextResponse.json(
      { message: '契約書が正常に保存されました', data: contract },
      { status: 200 }
    )
  } catch (error) {
    console.error('Contract save error:', error)
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error')

    return NextResponse.json(
      { 
        error: '契約書の保存に失敗しました',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

/**
 * Get all contracts (with optional project filtering)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    const whereClause = projectId ? { projectId: parseInt(projectId) } : {}

    const contracts = await prisma.contract.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        contractRisks: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(
      { data: contracts },
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