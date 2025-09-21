import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Get risks for a workspace or default risks
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get('workspaceId')
    const ids = searchParams.get('ids') // リスクIDのカンマ区切り文字列
    
    // IDリストが指定された場合は一括検索
    if (ids) {
      const idList = ids.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id))
      if (idList.length === 0) {
        return NextResponse.json([])
      }
      
      const risks = await prisma.risk.findMany({
        where: {
          id: {
            in: idList
          }
        },
        select: {
          id: true,
          title: true
        },
        orderBy: {
          id: 'asc'
        }
      })
      return NextResponse.json(risks)
    }
    
    if (workspaceId) {
      // ワークスペース指定時は、そのワークスペースのリスクとデフォルトリスクの両方を取得
      const risks = await prisma.risk.findMany({
        where: {
          OR: [
            { workspaceId: parseInt(workspaceId) },
            { workspaceId: null }
          ]
        },
        orderBy: [
          { workspaceId: 'asc' }, // nullが先、数値が後
          { id: 'asc' }
        ]
      })
      return NextResponse.json(risks)
    } else {
      // ワークスペース指定なしの場合はデフォルトリスクのみ
      const risks = await prisma.risk.findMany({
        where: {
          workspaceId: null
        },
        orderBy: {
          id: 'asc'
        }
      })
      return NextResponse.json(risks)
    }
  } catch (error) {
    console.error('Failed to fetch risks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch risks' },
      { status: 500 }
    )
  }
}

/**
 * Create a new risk item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { workspaceId, title, prompt, description } = body

    // バリデーション
    if (!title || !prompt || !description) {
      return NextResponse.json(
        { error: 'title, prompt, description are required' },
        { status: 400 }
      )
    }

    const risk = await prisma.risk.create({
      data: {
        workspaceId: workspaceId || null,
        title,
        prompt,
        description
      }
    })

    return NextResponse.json(risk, { status: 201 })
  } catch (error) {
    console.error('Failed to create risk:', error)
    return NextResponse.json(
      { error: 'Failed to create risk' },
      { status: 500 }
    )
  }
}