import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

/**
 * Save manual risk addition (isSave = false, riskId = null)
 * Behavior:
 * - Resolve contract by contractId or (projectId + fileName/baseName). Create if missing.
 * - Insert provided risk as ContractRisk with isSave=false and riskId=null.
 * - Manual risks are always independent (no riskId reference).
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json()
        const {
            contractId,
            projectId,
            fileName,
            baseName,
            contractTitle,
            party,
            startDate,
            endDate,
            conclusionDate,
            risk
        } = body || {}

        logger.info({ contractId, projectId, fileName, baseName, risk: risk ? 'provided' : 'missing' }, 'manual-risks: request received')

        if (!risk || !risk.text || !risk.type) {
            return NextResponse.json({ error: 'risk with text and type is required' }, { status: 400 })
        }

        // Resolve or create contract
        let resolvedContract = null as null | { id: number, isSave: boolean, projectId: number, baseName: string | null }

        if (contractId) {
            const c = await prisma.contract.findUnique({ where: { id: Number(contractId) } })
            if (!c) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
            resolvedContract = { id: c.id, isSave: c.isSave, projectId: c.projectId, baseName: c.baseName }
        } else {
            if (!projectId) return NextResponse.json({ error: 'projectId is required when contractId is not provided' }, { status: 400 })
            const stripExt = (s: string) => s.split('/').pop()!.replace(/\.[^/.]+$/i, '').trim()
            const stripPath = (s: string) => s.split('/').pop()!.trim()
            const baseCandidate = typeof fileName === 'string' && fileName.trim() !== ''
                ? stripExt(fileName)
                : typeof baseName === 'string' && baseName.trim() !== ''
                    ? stripExt(baseName)
                    : ''
            if (!baseCandidate) return NextResponse.json({ error: 'fileName or baseName is required' }, { status: 400 })

            const fileNameKey = typeof fileName === 'string' && fileName.trim() !== ''
                ? stripPath(fileName)
                : baseCandidate

            let c = await prisma.contract.findFirst({ where: { projectId: Number(projectId), fileName: fileNameKey } })
            if (!c) {
                c = await prisma.contract.create({
                    data: {
                        projectId: Number(projectId),
                        fileName: fileNameKey,
                        baseName: fileNameKey,
                        title: contractTitle ?? null,
                        party: party ?? null,
                        startDate: startDate ?? null,
                        endDate: endDate ?? null,
                        conclusionDate: conclusionDate ?? null,
                        isSave: false,
                    }
                })
                logger.info({ contractId: c.id }, 'manual-risks: created new contract')
            }
            resolvedContract = { id: c.id, isSave: c.isSave, projectId: c.projectId, baseName: c.baseName }
        }

        if (!resolvedContract) {
            return NextResponse.json({ error: 'Failed to resolve contract' }, { status: 500 })
        }

        // Insert manual risk (isSave=false, riskId=null)
        const createdRisk = await prisma.contractRisk.create({
            data: {
                contractId: resolvedContract.id,
                text: risk.text || '',
                type: risk.type || '',
                reason: risk.reason || '手動で追加されたリスク',
                articleInfo: risk.articleInfo || null,
                articleTitle: risk.articleTitle || null,
                articleOverview: risk.articleOverview || null,
                specificClause: risk.specificClause || risk.text || '',
                pageNumber: risk.pageNumber || 1,
                positionStart: (risk.positionStart ?? risk.position?.start) ?? 0,
                positionEnd: (risk.positionEnd ?? risk.position?.end) ?? 0,
                isSave: false,
                riskId: null // Always null for manual risks
            }
        })

        logger.info({ riskId: createdRisk.id, contractId: resolvedContract.id }, 'manual-risks: created manual risk')

        return NextResponse.json({
            message: 'Manual risk added successfully',
            contractId: resolvedContract.id,
            riskId: createdRisk.id,
            data: createdRisk
        })
    } catch (error) {
        logger.error({ error }, 'manual-risks: save error')
        return NextResponse.json({ error: 'Failed to save manual risk' }, { status: 500 })
    }
}
