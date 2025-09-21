import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import logger from '@/lib/logger'

/**
 * Save custom risk extraction results (isSave = false)
 * Behavior:
 * - Resolve contract by contractId or (projectId + fileName/baseName). Create if missing.
 * - If target contract is isSave=true, reject (409) per spec.
 * - For provided riskIds, delete duplicates where (contractId, riskId) match AND isSave=false.
 * - Insert provided risks as ContractRisk with isSave=false, preserving type (Gemini) and setting riskId.
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
            risks
        } = body || {}

        logger.info({ contractId, projectId, fileName, baseName, risksCount: Array.isArray(risks) ? risks.length : 0 }, 'custom-risks: request received')

        if (!Array.isArray(risks) || risks.length === 0) {
            return NextResponse.json({ error: 'risks is required' }, { status: 400 })
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
            }
            resolvedContract = { id: c.id, isSave: c.isSave, projectId: c.projectId, baseName: c.baseName }
        }

        if (!resolvedContract) return NextResponse.json({ error: 'Contract resolution failed' }, { status: 500 })

        logger.info({ resolvedContractId: resolvedContract.id, isSave: resolvedContract.isSave, projectId: resolvedContract.projectId, baseName: resolvedContract.baseName }, 'custom-risks: contract resolved')

        // Block when contract is already saved
        if (resolvedContract.isSave) {
            logger.warn({ contractId: resolvedContract.id }, 'custom-risks: blocked (isSave=true)')
            return NextResponse.json({ error: 'Contract is already saved (isSave=true)' }, { status: 409 })
        }

        // Collect riskIds for duplicate deletion (only those provided with numeric id)
        const providedRiskIds = Array.from(new Set(
            risks
                .map((r: any) => r?.riskId)
                .filter((v: any) => Number.isFinite(Number(v)))
                .map((v: any) => Number(v))
        ))

        const created = await prisma.$transaction(async (tx) => {
            // Delete duplicates for (contractId, riskId) only when isSave=false
            if (providedRiskIds.length > 0) {
                logger.info({ contractId: resolvedContract!.id, providedRiskIds }, 'custom-risks: deleting duplicates (by contractId + riskId)')
                // Prisma での riskId フィルタが schema typing で通らないため、SQL にフォールバック
                const delCount: number = await tx.$executeRawUnsafe(
                    'DELETE FROM "ContractRisk" WHERE "contractId" = $1 AND "isSave" = false AND "riskId" = ANY($2::int[])',
                    resolvedContract!.id,
                    providedRiskIds
                )
                logger.info({ deletedCount: delCount }, 'custom-risks: deleted duplicates result')
            }

            // Insert new risks (isSave=false) via SQL to ensure riskId is set even if client types are stale
            let createdCount = 0
            for (const r of risks) {
                const riskIdVal = Number.isFinite(Number(r?.riskId)) ? Number(r.riskId) : null
                const res: number = await tx.$executeRawUnsafe(
                    'INSERT INTO "ContractRisk" ("contractId","text","type","reason","articleInfo","articleTitle","articleOverview","specificClause","pageNumber","positionStart","positionEnd","isSave","riskId") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,$12)',
                    resolvedContract!.id,
                    r?.text || '',
                    r?.type || '',
                    r?.reason ?? null,
                    r?.articleInfo ?? null,
                    r?.articleTitle ?? null,
                    r?.articleOverview ?? null,
                    r?.specificClause ?? null,
                    r?.pageNumber ?? 1,
                    (r?.positionStart ?? r?.position?.start) ?? 0,
                    (r?.positionEnd ?? r?.position?.end) ?? 0,
                    riskIdVal
                )
                createdCount += res > 0 ? 1 : 0
            }

            logger.info({ createdCount }, 'custom-risks: created risks')
            return []
        })

        return NextResponse.json({
            message: 'Custom risks saved',
            contractId: resolvedContract.id,
            count: created.length
        })
    } catch (error) {
        logger.error({ error }, 'custom-risks: save error')
        return NextResponse.json({ error: 'Failed to save custom risks' }, { status: 500 })
    }
}


