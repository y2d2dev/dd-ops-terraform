import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken } from '@/lib/auth'
import logger from '@/lib/logger'

/**
 * Save extracted risks to database (isSave = false)
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const projectId = parseInt(params.id)

        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: '無効なプロジェクトIDです' },
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

        // プロジェクトの権限チェック（作成者またはメンバー）
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
                { error: 'プロジェクトが見つかりません、またはアクセス権限がありません' },
                { status: 404 }
            )
        }

        const body = await request.json()
        const { contractId, risks, baseName, fileName } = body || {}

        if (!Array.isArray(risks)) {
            return NextResponse.json(
                { error: 'リスクデータが必要です' },
                { status: 400 }
            )
        }

        // 契約解決: contractId 優先、無ければ baseName から検索/作成
        let resolvedContractId: number | null = null

        if (contractId) {
            const contract = await prisma.contract.findFirst({
                where: { id: contractId, projectId }
            })
            if (!contract) {
                return NextResponse.json(
                    { error: '指定された契約が見つかりません' },
                    { status: 404 }
                )
            }
            resolvedContractId = contract.id
        } else if ((typeof baseName === 'string' && baseName.trim() !== '') || (typeof fileName === 'string' && fileName.trim() !== '')) {
            const stripExt = (s: string) => s.split('/').pop()!.replace(/\.[^/.]+$/, '').trim()
            const stripPath = (s: string) => s.split('/').pop()!.trim()

            // 検索・作成のキーを projectId + fileName に統一
            const baseCandidate = typeof fileName === 'string' && fileName.trim() !== ''
                ? stripExt(fileName)
                : stripExt(String(baseName))
            const fileNameKey = typeof fileName === 'string' && fileName.trim() !== ''
                ? stripPath(fileName)
                : baseCandidate

            let contract = await prisma.contract.findFirst({
                where: { projectId, fileName: fileNameKey }
            })
            if (!contract) {
                contract = await prisma.contract.create({
                    data: {
                        projectId,
                        fileName: fileNameKey,
                        baseName: fileNameKey,
                    }
                })
            }
            resolvedContractId = contract.id
        } else {
            return NextResponse.json(
                { error: 'contractId か baseName を指定してください' },
                { status: 400 }
            )
        }

        // 既存の未保存リスクを削除してから新しいリスクを挿入
        await prisma.$transaction(async (tx) => {
            // 既存の未保存リスクを削除
            await tx.contractRisk.deleteMany({
                // Prisma 型の差異を吸収
                where: ({
                    contractId: resolvedContractId!,
                    isSave: false
                } as any)
            })

            // 新しいリスクを挿入（isSave = false）
            if (risks.length > 0) {
                await tx.contractRisk.createMany({
                    data: risks.map((risk: any) => ({
                        contractId: resolvedContractId!,
                        text: risk.text || '',
                        type: risk.type || '',
                        reason: risk.reason || null,
                        articleInfo: risk.articleInfo || null,
                        articleTitle: risk.articleTitle || null,
                        articleOverview: risk.articleOverview || null,
                        specificClause: risk.specificClause || null,
                        pageNumber: risk.pageNumber || 1,
                        positionStart: risk.positionStart || 0,
                        positionEnd: risk.positionEnd || 0,
                        isSave: false
                    }))
                })
            }
        })

        return NextResponse.json({
            message: 'リスクを保存しました',
            contractId: resolvedContractId,
            risksCount: risks.length
        })

    } catch (error) {
        logger.error({ err: error, route: '/api/projects/[id]/extract-risks' }, 'Save extracted risks error')

        if (error instanceof Error && error.message.includes('jwt')) {
            return NextResponse.json(
                { error: '認証エラー' },
                { status: 401 }
            )
        }

        return NextResponse.json(
            { error: 'リスクの保存に失敗しました' },
            { status: 500 }
        )
    }
}

/**
 * Get extracted risks from database (isSave = false)
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const projectId = parseInt(params.id)
        const url = new URL(request.url)
        const contractId = url.searchParams.get('contractId')
        const fileName = url.searchParams.get('fileName')

        if (isNaN(projectId)) {
            return NextResponse.json(
                { error: '無効なプロジェクトIDです' },
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

        // プロジェクトの権限チェック（作成者またはメンバー）
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
                { error: 'プロジェクトが見つかりません、またはアクセス権限がありません' },
                { status: 404 }
            )
        }

        let whereClause: any = {
            contract: {
                projectId: projectId
            },
            isSave: false
        }

        // 特定の契約のリスクのみ取得する場合
        if (contractId) {
            whereClause.contractId = parseInt(contractId)
        } else if (fileName) {
            // fileName（拡張子なし、元の大文字小文字を維持）ベースで契約を検索
            const toBase = (s: string) => s.split('/').pop()!.replace(/\.(pdf|json)$/i, '').trim()
            const baseName = toBase(fileName)
            whereClause.contract.baseName = baseName
        }

        const risks = await prisma.contractRisk.findMany({
            where: whereClause,
            include: {
                contract: {
                    select: {
                        id: true,
                        fileName: true,
                        baseName: true
                    }
                }
            }
        })

        // articleInfo（条文番号）でソート
        const sortedRisks = risks.sort((a, b) => {
            const parseArticleInfo = (articleInfo: string | null): number => {
                if (!articleInfo) return 999999 // articleInfoがない場合は最後に

                // "第9条"、"第17条第1項第1号" のような形式から数値を抽出
                const match = articleInfo.match(/第(\d+)条/)
                return match ? parseInt(match[1]) : 999999
            }

            const aNum = parseArticleInfo(a.articleInfo)
            const bNum = parseArticleInfo(b.articleInfo)

            if (aNum !== bNum) {
                return aNum - bNum // 条文番号の昇順
            }

            // 同じ条文の場合は項・号でソート
            const parseSubSection = (articleInfo: string | null): [number, number] => {
                if (!articleInfo) return [999, 999]

                const itemMatch = articleInfo.match(/第(\d+)項/)
                const subMatch = articleInfo.match(/第(\d+)号/)

                return [
                    itemMatch ? parseInt(itemMatch[1]) : 0,
                    subMatch ? parseInt(subMatch[1]) : 0
                ]
            }

            const [aItem, aSubItem] = parseSubSection(a.articleInfo)
            const [bItem, bSubItem] = parseSubSection(b.articleInfo)

            if (aItem !== bItem) return aItem - bItem
            return aSubItem - bSubItem
        })

        return NextResponse.json({
            risks: sortedRisks,
            count: sortedRisks.length
        })

    } catch (error) {
        logger.error({ err: error, route: '/api/projects/[id]/extract-risks' }, 'Get extracted risks error')

        if (error instanceof Error && error.message.includes('jwt')) {
            return NextResponse.json(
                { error: '認証エラー' },
                { status: 401 }
            )
        }

        return NextResponse.json(
            { error: 'リスクの取得に失敗しました' },
            { status: 500 }
        )
    }
}
