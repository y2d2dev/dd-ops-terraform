import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    // 1. Contractテーブルの最新10件を取得
    console.log('=== Contractテーブルの最新10件 ===')
    const contracts = await prisma.contract.findMany({
      take: 10,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        projectId: true,
        fileName: true,
        baseName: true,
        isSave: true,
        createdAt: true,
      }
    })
    
    console.table(contracts)
    
    // 2. ContractRiskテーブルの件数をcontractIdごとに集計
    console.log('\n=== ContractRiskテーブルのcontractIdごとの件数 ===')
    const riskCounts = await prisma.contractRisk.groupBy({
      by: ['contractId'],
      _count: {
        id: true
      }
    })
    
    console.table(riskCounts.map(r => ({
      contractId: r.contractId,
      riskCount: r._count.id
    })))
    
    // 3. ContractRiskテーブルの最新10件を確認
    console.log('\n=== ContractRiskテーブルの最新10件 ===')
    const risks = await prisma.contractRisk.findMany({
      take: 10,
      orderBy: { id: 'desc' },
      select: {
        id: true,
        contractId: true,
        type: true,
        text: true,
        reason: true,
        articleTitle: true,
        createdAt: true,
      }
    })
    
    console.table(risks)
    
    // 4. ContractとContractRiskの関連を確認
    console.log('\n=== Contract（id=1）のリスク情報 ===')
    const contractWithRisks = await prisma.contract.findFirst({
      where: { id: 1 },
      include: {
        contractRisks: true
      }
    })
    
    if (contractWithRisks) {
      console.log(`Contract ID: ${contractWithRisks.id}`)
      console.log(`File Name: ${contractWithRisks.fileName}`)
      console.log(`Risk Count: ${contractWithRisks.contractRisks.length}`)
      if (contractWithRisks.contractRisks.length > 0) {
        console.log('Risks:')
        console.table(contractWithRisks.contractRisks)
      }
    }
    
    // 5. 全Contractのリスク数を確認
    console.log('\n=== 全Contractのリスク数 ===')
    const allContracts = await prisma.contract.findMany({
      include: {
        _count: {
          select: { contractRisks: true }
        }
      },
      orderBy: { id: 'desc' },
      take: 20
    })
    
    console.table(allContracts.map(c => ({
      id: c.id,
      fileName: c.fileName,
      riskCount: c._count.contractRisks,
      isSave: c.isSave
    })))
    
  } catch (error) {
    console.error('エラーが発生しました:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()