import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import logger from '@/lib/logger'

/**
 * Update a specific contract risk
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const riskId = parseInt(params.id)

        if (isNaN(riskId)) {
            return NextResponse.json(
                { error: '無効なリスクIDです' },
                { status: 400 }
            )
        }

        // JWT認証
        const token = request.cookies.get('auth-token')?.value
        if (!token) {
            return NextResponse.json(
                { error: '認証が必要です' },
                { status: 401 }
            )
        }

        const decoded = verifyToken(token)
        const userId = decoded.userId

        // リスクの存在確認とプロジェクト所有者チェック
        const risk = await prisma.contractRisk.findUnique({
            where: { id: riskId },
            include: {
                contract: {
                    include: {
                        project: true
                    }
                }
            }
        })

        if (!risk) {
            return NextResponse.json(
                { error: 'リスクが見つかりません' },
                { status: 404 }
            )
        }

        // プロジェクトの所有者チェック
        if (risk.contract.project.userId !== userId) {
            return NextResponse.json(
                { error: 'このリスクを更新する権限がありません' },
                { status: 403 }
            )
        }

        const body = await request.json()
        const { text, type, reason, articleInfo, articleTitle, articleOverview, specificClause, pageNumber, positionStart, positionEnd } = body

        // リスクを更新
        const updatedRisk = await prisma.contractRisk.update({
            where: { id: riskId },
            data: {
                ...(text !== undefined && { text }),
                ...(type !== undefined && { type }),
                ...(reason !== undefined && { reason }),
                ...(articleInfo !== undefined && { articleInfo }),
                ...(articleTitle !== undefined && { articleTitle }),
                ...(articleOverview !== undefined && { articleOverview }),
                ...(specificClause !== undefined && { specificClause }),
                ...(pageNumber !== undefined && { pageNumber }),
                ...(positionStart !== undefined && { positionStart }),
                ...(positionEnd !== undefined && { positionEnd })
                // isSaveは変更しない（「DBに保存」ボタン時のみtrueにする）
            }
        })

        return NextResponse.json(
            { message: 'リスクが更新されました', data: updatedRisk },
            { status: 200 }
        )

    } catch (error) {
        logger.error({ err: error, route: '/api/contract-risks/[id]' }, 'Update contract risk error')

        if (error instanceof Error && error.message.includes('jwt')) {
            return NextResponse.json(
                { error: '認証エラー' },
                { status: 401 }
            )
        }

        return NextResponse.json(
            { error: 'リスクの更新に失敗しました' },
            { status: 500 }
        )
    }
}

/**
 * Delete a specific contract risk
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const riskId = parseInt(params.id)

        if (isNaN(riskId)) {
            return NextResponse.json(
                { error: '無効なリスクIDです' },
                { status: 400 }
            )
        }

        // JWT認証
        const token = request.cookies.get('auth-token')?.value
        if (!token) {
            return NextResponse.json(
                { error: '認証が必要です' },
                { status: 401 }
            )
        }

        const decoded = verifyToken(token)
        const userId = decoded.userId

        // リスクの存在確認とプロジェクト所有者チェック
        const risk = await prisma.contractRisk.findUnique({
            where: { id: riskId },
            include: {
                contract: {
                    include: {
                        project: true
                    }
                }
            }
        })

        if (!risk) {
            return NextResponse.json(
                { error: 'リスクが見つかりません' },
                { status: 404 }
            )
        }

        // プロジェクトの所有者チェック
        if (risk.contract.project.userId !== userId) {
            return NextResponse.json(
                { error: 'このリスクを削除する権限がありません' },
                { status: 403 }
            )
        }

        // リスクを削除
        await prisma.contractRisk.delete({
            where: { id: riskId }
        })

        return NextResponse.json(
            { message: 'リスクが削除されました' },
            { status: 200 }
        )

    } catch (error) {
        logger.error({ err: error, route: '/api/contract-risks/[id]' }, 'Delete contract risk error')

        if (error instanceof Error && error.message.includes('jwt')) {
            return NextResponse.json(
                { error: '認証エラー' },
                { status: 401 }
            )
        }

        return NextResponse.json(
            { error: 'リスクの削除に失敗しました' },
            { status: 500 }
        )
    }
}
