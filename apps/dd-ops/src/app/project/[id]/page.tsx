'use client'

import React, { useState, useMemo, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import styled from 'styled-components'
import useSWR from 'swr'
import AppLayout from '@/components/layout/AppLayout'
import { fetcher, externalFilesFetcher } from '@/lib/swr/fetchers'
import ProjectHeader from './components/ProjectHeader'
import ContractList from './components/ContractList'
import ReportModal from './components/ReportModal'
import RiskDetailModal from './components/RiskDetailModal'
import { groupFilesByBaseName } from './components/utils'
import { Alert } from '@/components/ui/Alert'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Space } from '@/components/ui/Space'
import { useRiskExtractionCache } from '@/hooks/useRiskExtractionCache'

interface Project {
  id: number
  name: string
  description?: string
  targetCompany?: string
  workspace: {
    id: number
    name: string
  }
  createdAt: string
}

interface Contract {
  id: number
  fileName: string
  baseName?: string
  title?: string
  party?: string
  startDate?: string
  endDate?: string
  isSave: boolean
  reportGeneratedAt?: string
  createdAt: string
  contractRisks: any[]
}

/**
 * Project detail page component
 * @returns JSX element
 */
export default function ProjectPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.id as string

  // プロジェクト詳細を取得
  const { data: projectData, error: projectError, isLoading: projectLoading, mutate: mutateProject } = useSWR(
    projectId ? `/api/projects/${projectId}` : null,
    fetcher
  )

  const project = projectData?.data

  // リスクタイプを取得
  const { data: risksData } = useSWR(
    project?.workspace.id ? `/api/risks?workspaceId=${project.workspace.id}` : null,
    fetcher,
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  // リスクデータからriskTypesを構築
  React.useEffect(() => {
    if (risksData) {
      const types = risksData.map((risk: any, index: number) => ({
        value: String(risk.id),
        label: risk.title,
        color: ['blue', 'orange', 'green', 'red', 'purple', 'volcano', 'magenta', 'cyan', 'lime', 'gold', 'geekblue'][index % 11]
      }))
      setRiskTypes(types)

      // riskIdToTitleMapも構築
      const newMap = new Map<string, string>()
      risksData.forEach((risk: any) => {
        newMap.set(String(risk.id), risk.title)
      })
      setRiskIdToTitleMap(newMap)
    }
  }, [risksData])

  // 契約書一覧を取得
  const { data: contractsData, error: contractsError, isLoading: contractsLoading, mutate: mutateContracts } = useSWR(
    projectId ? `/api/contracts?projectId=${projectId}` : null,
    fetcher
  )

  // 報告書関連のstate
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const [selectedContractIds, setSelectedContractIds] = useState<number[]>([])

  // リスク詳細モーダル
  const [riskDetailModalVisible, setRiskDetailModalVisible] = useState(false)
  const [selectedRiskDetails, setSelectedRiskDetails] = useState<any[]>([])
  const [selectedContract, setSelectedContract] = useState<string>('')
  const [selectedRiskType, setSelectedRiskType] = useState<string>('')
  const [riskTypes, setRiskTypes] = useState<Array<{ value: string, label: string, color: string }>>([])
  const [riskIdToTitleMap, setRiskIdToTitleMap] = useState<Map<string, string>>(new Map())
  // 離脱確認用（自前モーダル）
  const [leaveModalVisible, setLeaveModalVisible] = useState(false)
  const pendingActionRef = useRef<null | (() => void)>(null)


  // 全契約書が完了しているかチェック
  const contractsCompleted = useMemo(() => {
    const contracts = contractsData?.data || []
    return contracts.length > 0 && contracts.some((contract: Contract) => contract.isSave)
  }, [contractsData])

  // ファイル一覧を取得（プロジェクト情報が取得できてから）
  const filesParams = project?.workspace.id && projectId
    ? { projectId: projectId, workspaceId: project.workspace.id }
    : null

  const { data: filesData, error: filesError, isLoading: filesLoading } = useSWR(
    filesParams && process.env.NEXT_PUBLIC_API_URL ? [process.env.NEXT_PUBLIC_API_URL, filesParams] : null,
    ([url, params]) => externalFilesFetcher(url, params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0
    }
  )

  // ファイルをベース名でグループ化
  const files = filesData?.files || []
  const groupedFiles = useMemo(() => groupFilesByBaseName(files), [files])

  // 契約の保存状態を反映した配列（auto実行の対象外判定に使用）
  const contracts = useMemo(() => {
    const normalize = (s: string | undefined | null): string => {
      if (!s) return ''
      return s.toString().split('/').pop()!.replace(/\.[^/.]+$/i, '').trim().toLowerCase()
    }
    const contractByBase = new Map<string, any>()
    const list = (contractsData?.data || []) as any[]
    list.forEach((c) => {
      const base = normalize(c?.fileName)
      if (base) contractByBase.set(base, c)
    })

    return groupedFiles.map((file) => {
      const base = file.baseName
      const linked = contractByBase.get(normalize(base)) || null
      return {
        fileName: file.pdfFile?.name ?? '',
        baseName: base,
        isSave: Boolean(linked?.isSave)
      }
    })
  }, [groupedFiles, contractsData])
  console.log('contracts', contracts)

  // ==== リスク抽出キャッシュ（一覧ページで起動） ====
  // workspaceId は読み込み済み後に存在するため、未取得時は 0 を渡して副作用側で足切り
  const workspaceIdNum = project?.workspace.id ?? 0


  const {
    processingState,
    processUnprocessedContracts,
    cache,
    updateCacheStatus
  } = useRiskExtractionCache(
    projectId,
    workspaceIdNum,
    contracts,
    groupedFiles,
    project?.targetCompany
  )

  // 実行中（processing）の有無と件数を算出し、上部に注意書きを表示
  const { hasProcessingAny, processingCount } = React.useMemo(() => {
    try {
      let count = 0
      cache.forEach((v) => { if (v?.result?.status === 'processing') count += 1 })
      return { hasProcessingAny: count > 0 || processingState.isProcessing, processingCount: count }
    } catch {
      return { hasProcessingAny: processingState.isProcessing, processingCount: 0 }
    }
  }, [cache, processingState.isProcessing])

  // 処理中にプロジェクトタブを閉じる/リロードしようとした場合の確認ダイアログ
  useEffect(() => {
    const hasProcessing = () => {
      try {
        let processing = false
        cache.forEach((v) => { if (v?.result?.status === 'processing') processing = true })
        return processing || processingState.isProcessing
      } catch { return processingState.isProcessing }
    }

    // ❌ ここでは failed にしない：警告だけ
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasProcessing()) {
        e.preventDefault()
        e.returnValue = 'リスク抽出を実行中です。処理が完了するまでタブ/ウィンドウを閉じないでください。'
      }
    }

    // ✅ 離脱が確定したときだけ failed にする
    const onPageHide = () => {
      if (!hasProcessing()) return
      try {
        const processingBaseNames: string[] = []
        cache.forEach((v, k) => { if (v?.result?.status === 'processing') processingBaseNames.push(k) })
        processingBaseNames.forEach((base) => updateCacheStatus(base, 'failed'))

        // 永続化
        if (typeof window !== 'undefined' && projectId) {
          const cacheKey = `risk_extraction_cache_${projectId}`
          const now = Date.now()
          const obj: Record<string, any> = {}
          cache.forEach((v, k) => {
            if (processingBaseNames.includes(k)) {
              obj[k] = { ...(v || {}), result: { ...(v?.result || {}), status: 'failed' }, timestamp: now, baseName: v?.baseName || k }
            } else {
              obj[k] = v
            }
          })
          try { localStorage.setItem(cacheKey, JSON.stringify(obj)) } catch { }
        }
      } catch { }
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    window.addEventListener('pagehide', onPageHide) // iOS/Safari 対策にも有効
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      window.removeEventListener('pagehide', onPageHide)
    }
  }, [processingState.isProcessing, cache, projectId, updateCacheStatus])


  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (!projectId) return
    channelRef.current = new BroadcastChannel(`risk-extraction:${projectId}`)
    const ch = channelRef.current
    return () => {
      ch?.close()
    }
  }, [projectId])

  // データが揃い次第、自動で未処理分を投げる（2~3秒遅延）
  useEffect(() => {
    if (!project) return
    if (!workspaceIdNum) return
    if (!contracts.length) return
    if (!groupedFiles.length) return
    const t = setTimeout(() => {
      processUnprocessedContracts()
    }, 2500)
    return () => clearTimeout(t)
  }, [project, workspaceIdNum, contracts, groupedFiles, processUnprocessedContracts])

  // （任意）処理状況をログ表示
  useEffect(() => {
    if (processingState.isProcessing) {
      console.log(
        `[RiskExtraction] ${processingState.completedCount}/${processingState.totalCount} completed`,
        { failed: processingState.failedBaseNames }
      )
    }
  }, [processingState])


  /**
   * Handle file editing (unified for both contracts and files)
   * @param item - File/Contract item data
   */
  const runOrConfirm = (fn: () => void) => {
    const hasProc = (() => {
      try {
        let processing = false
        cache.forEach((v) => { if (v?.result?.status === 'processing') processing = true })
        return processing || processingState.isProcessing
      } catch { return processingState.isProcessing }
    })()
    if (hasProc) {
      pendingActionRef.current = fn
      setLeaveModalVisible(true)
    } else {
      fn()
    }
  }

  const handleEditFile = (item: any) => {
    if (!item.isCompleted || !item.pdfFile || !item.jsonFile) {
      return
    }

    const fn = () => {
      const fileName = item.pdfFile.name.replace(/\.pdf$/i, '')
      const params = new URLSearchParams({
        projectId: projectId,
        contractFilename: item.baseName || '',
        workspaceId: project?.workspace.id,
        fileName: fileName
      })
      if (item.contract) {
        params.append('contractId', item.contract.id.toString())
        // AI抽出無効化は保存済みの場合のみ
        if (item.isSave || item.reportGeneratedAt) {
          params.append('disableAiExtraction', 'true')
        }
      }
      const editUrl = `/edit?${params.toString()}`
      window.open(editUrl, '_blank')
    }
    runOrConfirm(fn)
  }

  /**
   * Handle file upload action
   */
  const handleUploadFile = async () => {
    const fn = async () => {
      try {
        const tokenResponse = await fetch('/api/upload-token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ projectId: projectId, workspaceId: project?.workspace.id })
        })
        if (!tokenResponse.ok) {
          console.error('Failed to generate upload token')
          return
        }
        const { token } = await tokenResponse.json()
        const uploadUrl = `${process.env.NEXT_PUBLIC_UPLOAD_APP_URL}/upload?token=${encodeURIComponent(token)}`
        window.open(uploadUrl, '_blank')
      } catch (error) {
        console.error('Failed to generate upload token:', error)
      }
    }
    runOrConfirm(fn)
  }

  /**
   * Handle project deletion
   */
  const handleDeleteProject = async () => {
    const fn = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
        if (response.ok) router.push('/')
      } catch (error) {
        console.error('Failed to delete project:', error)
      }
    }
    runOrConfirm(fn)
  }

  /**
   * Handle contract selection
   */
  const handleSelectContract = (contractId: number, selected: boolean) => {
    setSelectedContractIds(prev => {
      if (selected) {
        if (prev.includes(contractId)) return prev
        return [...prev, contractId]
      } else {
        return prev.filter(id => id !== contractId)
      }
    })
  }

  /**
   * リスク詳細表示
   */
  const showRiskDetails = (contractId: number, riskType: string, riskTypeLabel: string) => {
    const contract = (contractsData?.data || []).find((c: Contract) => c.id === contractId)
    if (!contract) return

    const risks = contract.contractRisks?.filter((risk: any) => risk.type === riskType) || []
    setSelectedRiskDetails(risks)
    setSelectedContract(contract.title || contract.fileName)
    setSelectedRiskType(riskTypeLabel)
    setRiskDetailModalVisible(true)
  }

  /**
   * プロジェクト更新ハンドラ
   */
  const handleProjectUpdate = (updatedProject: Project) => {
    mutateProject({ data: updatedProject }, false)
  }

  if (projectLoading) {
    return (
      <AppLayout>
        <PageContainer>
          <LoadingAlert message="読み込み中..." type="info" />
        </PageContainer>
      </AppLayout>
    )
  }

  if (projectError) {
    return (
      <AppLayout>
        <PageContainer>
          <ErrorAlert message="プロジェクトの取得に失敗しました" type="error" showIcon />
        </PageContainer>
      </AppLayout>
    )
  }

  if (!project) {
    return (
      <AppLayout>
        <PageContainer>
          <WarningAlert message="プロジェクトが見つかりません" type="warning" showIcon />
        </PageContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <PageContainer>
        {hasProcessingAny && (
          <div style={{ padding: '8px 12px', background: '#FFF7E6', border: '1px solid #FFD591', marginBottom: 12, borderRadius: 6 }}>
            <span style={{ color: '#AD6800', fontSize: 12 }}>
              {`リスク抽出を実行中の契約書があります（${processingCount}件）。処理が完了するまで、このタブやウィンドウを閉じないでください。`}
            </span>
          </div>
        )}
        <ProjectHeader
          project={project}
          projectId={projectId}
          contractsCompleted={contractsCompleted}
          onUpload={handleUploadFile}
          onReportCreate={() => setReportModalVisible(true)}
          onDelete={handleDeleteProject}
          selectedContractCount={selectedContractIds.length}
          onProjectUpdate={handleProjectUpdate}
        />

        <ContractList
          contracts={contractsData?.data || []}
          groupedFiles={groupedFiles}
          loading={contractsLoading || filesLoading}
          onEditFile={handleEditFile}
          selectedContractIds={selectedContractIds}
          onSelectContract={handleSelectContract}
          targetCompany={project.targetCompany}
          jsonDataMap={new Map()}
        />

        {/* 報告書設定モーダル */}
        <ReportModal
          visible={reportModalVisible}
          contracts={selectedContractIds.length > 0
            ? (contractsData?.data || []).filter((c: Contract) => selectedContractIds.includes(c.id))
            : contractsData?.data || []
          }
          project={project}
          onCancel={() => setReportModalVisible(false)}
          onShowRiskDetails={showRiskDetails}
          onReportGenerated={() => {
            // 報告書生成後にデータを再取得
            mutateContracts()
          }}
        />

        {/* リスク詳細モーダル */}
        <RiskDetailModal
          visible={riskDetailModalVisible}
          contractName={selectedContract}
          riskType={selectedRiskType}
          risks={selectedRiskDetails}
          onCancel={() => setRiskDetailModalVisible(false)}
          riskTypes={riskTypes}
          riskIdToTitleMap={riskIdToTitleMap}
        />
      </PageContainer>
      {/* 離脱確認モーダル */}
      <Modal
        title="実行中の処理があります"
        open={leaveModalVisible}
        onCancel={() => { setLeaveModalVisible(false); pendingActionRef.current = null }}
        footer={null}
      >
        <div style={{ marginBottom: 12 }}>リスク抽出を実行中です。続行すると処理が中断される可能性があります。続行しますか？</div>
        <Space>
          <Button onClick={() => { setLeaveModalVisible(false); pendingActionRef.current = null }}>キャンセル</Button>
          <Button type="primary" danger onClick={() => {
            // 処理中エントリを failed に更新してから離脱アクション実行
            try {
              const bases: string[] = []
              cache.forEach((v, k) => { if (v?.result?.status === 'processing') bases.push(k) })
              bases.forEach((b) => updateCacheStatus(b, 'failed'))
            } catch { }
            setLeaveModalVisible(false)
            const fn = pendingActionRef.current
            pendingActionRef.current = null
            fn && fn()
          }}>続行</Button>
        </Space>
      </Modal>
    </AppLayout>
  )
}

// ページコンテナ
const PageContainer = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: #FAFAFA;
`

// ローディングアラート
const LoadingAlert = styled(Alert)`
  background: #FAFAFA;
  border: 1px solid #9A9A9A;
  
  .ant-alert-message {
    color: #252525;
  }
`

// エラーアラート
const ErrorAlert = styled(Alert)`
  background: #FAFAFA;
  border: 1px solid #9A9A9A;
  
  .ant-alert-message {
    color: #252525;
  }
`

// 警告アラート
const WarningAlert = styled(Alert)`
  background: #FAFAFA;
  border: 1px solid #9A9A9A;
  
  .ant-alert-message {
    color: #252525;
  }
`