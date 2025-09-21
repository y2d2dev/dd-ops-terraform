'use client'

import React, { useState, useEffect, useMemo, useRef, Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Allotment } from 'allotment'
import 'allotment/dist/style.css'
import { LeftOutlined, RightOutlined, WarningOutlined, FileTextOutlined } from '@ant-design/icons'
import useSWR from 'swr'
import { useQueryState } from 'nuqs'
import styled from 'styled-components'
import { signedUrlFetcher } from '@/lib/swr/fetchers'

import EditPageHeader from './components/EditPageHeader'
import ArticleList from './components/ArticleList'
import RiskPanel from './components/RiskPanel'
import ManualRiskModal from './components/ManualRiskModal'
import { useEditLogic } from './hooks/useEditLogic'
import { Classification, OcrData, Article } from './types'
import { Alert } from '@/components/ui/Alert'
import { Spin } from '@/components/ui/Spin'
import { message } from '@/components/ui/message'
import { Space } from '@/components/ui/Space'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { sortRisksByArticleInfo } from '@/utils/articleSort'
import CustomRiskExtractButton from './components/CustomRiskExtractButton'

const RESERVED_DOMAIN = 'dd-ops-staging-75499681521.asia-east1.run.app';

// OCRデータ取得用のfetcher
const fetchOcrData = async (url: string): Promise<OcrData> => {
  if (!url || url.trim() === '') {
    throw new Error('URLが指定されていません');
  }

  const proxyUrl = `/api/proxy-file?url=${encodeURIComponent(url)}`;
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    const text = await response.text();
    console.error('fetchOcrData response error:', text);
    throw new Error(`HTTP error! status: ${response.status}`);
  }


  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    const text = await response.text();
    console.error('fetchOcrData unexpected content-type:', contentType);
    console.error('body (truncated):', text.slice(0, 200));
    throw new Error('JSONではないデータが返ってきました（署名付きURLが期限切れの可能性）');
  }

  const data = await response.json();

  // 複数契約形式の場合、最初の契約を使用
  if (data.contracts && Array.isArray(data.contracts) && data.contracts.length > 0) {
    const firstContract = data.contracts[0];
    return {
      success: data.success,
      result: firstContract.result,
      info: firstContract.info
    } as OcrData;
  }

  // 単一契約形式（後方互換性）
  if (!data.success || !data.result || !data.result.articles) {
    throw new Error('Invalid JSON structure');
  }

  return data as OcrData;
};

const EditPageContent = () => {
  const searchParams = useSearchParams()
  const fileName = searchParams.get('fileName')
  const projectId = searchParams.get('projectId')
  const workspaceId = searchParams.get('workspaceId')
  const contractId = searchParams.get('contractId')
  const disableAiExtraction = searchParams.get('disableAiExtraction') === 'true'
  const contractFilenameParam = searchParams.get('contractFilename')

  const [isStagingOrLocalEnv, setIsStagingOrLocalEnv] = useState(false);

  useEffect(() => {
    const isMatch =
      process.env.NEXT_PUBLIC_ENV === 'staging' ||
      process.env.NODE_ENV === 'development' ||
      window.location.hostname.includes(RESERVED_DOMAIN) ||
      window.location.hostname.includes('localhost');

    setIsStagingOrLocalEnv(isMatch);
  }, []);


  // 署名付きURL取得のためのキーを生成
  const signedUrlKey = useMemo(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!projectId || !workspaceId || !fileName || !apiUrl) {
      return null;
    }
    return {
      url: `${apiUrl}`,
      params: {
        projectId,
        workspaceId: parseInt(workspaceId, 10),
        fileName
      }
    };
  }, [projectId, workspaceId, fileName]);

  // 署名付きURLを取得
  const { data: filesData, error: filesError, isLoading: filesLoading } = useSWR(
    signedUrlKey,
    async (key) => signedUrlFetcher(key.url, key.params),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0
    }
  )

  const jsonUrl = filesData?.signedJsonUrl || null
  const pdfUrl = filesData?.signedPdfUrl || null
  // baseName と cacheKey
  const normalizeBaseName = (s: string) => s.split('/').pop()!.replace(/\.(pdf|json)$/i, '').trim().toLowerCase()
  const baseName = useMemo(() => (fileName ? normalizeBaseName(fileName) : ''), [fileName])
  const cacheKey = useMemo(() => (projectId ? `risk_extraction_cache_${projectId}` : ''), [projectId])

  const channelRef = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    if (!projectId) return
    channelRef.current = new BroadcastChannel(`risk-extraction:${projectId}`)
    const ch = channelRef.current

    const onMessage = (ev: MessageEvent) => {
      const msg = ev.data
      if (!msg || msg.type !== 'cache:update') return
      const { baseName: bn, cacheData } = msg.payload || {}
      if (!bn || !cacheData) return
      // 自分が見ている baseName の更新のみ反映
      if (normalizeBaseName(bn) !== baseName) return

      const st = cacheData?.result?.status
      if (st === 'success') {
        // 成功時はDBから読み込む
        ; (async () => {
          if (!projectId || !fileName) return
          try {
            const res = await fetch(`/api/projects/${projectId}/extract-risks?fileName=${encodeURIComponent(fileName)}`)
            if (!res.ok) return
            const data = await res.json()
            const dbRisks = Array.isArray(data?.risks) ? data.risks : []
            if (dbRisks.length === 0) return
            const mapped: Classification[] = dbRisks.map((r: any) => ({
              id: String(r.id),
              text: r.text || '',
              type: String(r.type || ''),
              reason: r.reason || '',
              pageNumber: r.pageNumber ?? 1,
              position: { start: r.positionStart ?? 0, end: r.positionEnd ?? 0 },
              articleInfo: r.articleInfo || undefined,
              articleTitle: r.articleTitle || undefined,
              articleOverview: r.articleOverview || undefined,
              specificClause: r.specificClause || undefined
            }))
            setRisks(mapped)
            await fetchRiskTitles(mapped)
            setHasAutoExtracted(true)
            setExtractionStatus('success')
          } catch { }
        })()
      } else if (st === 'failed') {
        setExtractionStatus('failed')
      } else if (st === 'processing') {
        setExtractionStatus('processing')
      }
    }
    ch.addEventListener('message', onMessage)

    // localStorage フォールバック（別タブでの更新を拾う）
    const onStorage = (e: StorageEvent) => {
      if (!projectId || !e.newValue) return
      if (e.key !== `risk_extraction_cache_delta_${projectId}`) return
      try {
        const { baseName: bn, cacheData } = JSON.parse(e.newValue)
        if (normalizeBaseName(bn) !== baseName) return
        const st = cacheData?.result?.status
        if (st === 'success') {
          // 成功時はDBから読み込む
          ; (async () => {
            if (!projectId || !fileName) return
            try {
              const res = await fetch(`/api/projects/${projectId}/extract-risks?fileName=${encodeURIComponent(fileName)}`)
              if (!res.ok) return
              const data = await res.json()
              const dbRisks = Array.isArray(data?.risks) ? data.risks : []
              if (dbRisks.length === 0) return
              const mapped: Classification[] = dbRisks.map((r: any) => ({
                id: String(r.id),
                text: r.text || '',
                type: String(r.type || ''),
                reason: r.reason || '',
                pageNumber: r.pageNumber ?? 1,
                position: { start: r.positionStart ?? 0, end: r.positionEnd ?? 0 },
                articleInfo: r.articleInfo || undefined,
                articleTitle: r.articleTitle || undefined,
                articleOverview: r.articleOverview || undefined,
                specificClause: r.specificClause || undefined
              }))
              setRisks(mapped)
              await fetchRiskTitles(mapped)
              setExtractionStatus('success')
              setHasAutoExtracted(true)
            } catch { }
          })()
        } else if (st === 'failed') {
          setExtractionStatus('failed')
        } else if (st === 'processing') {
          setExtractionStatus('processing')
        }
      } catch { }
    }
    window.addEventListener('storage', onStorage)

    return () => {
      ch.removeEventListener('message', onMessage)
      ch.close()
      window.removeEventListener('storage', onStorage)
    }
  }, [projectId, baseName])

  const broadcastCacheDelta = (bn: string, cacheData: any) => {
    // BroadcastChannel
    try {
      channelRef.current?.postMessage({
        type: 'cache:update',
        payload: { baseName: bn, cacheData }
      })
    } catch { }

    // storage イベント（他タブ向け）
    try {
      localStorage.setItem(
        `risk_extraction_cache_delta_${projectId}`,
        JSON.stringify({ baseName: bn, cacheData })
      )
      setTimeout(() => {
        localStorage.removeItem(`risk_extraction_cache_delta_${projectId}`)
      }, 1000)
    } catch { }
  }

  // 軽量ロック（タブ間の二重実行抑止）
  const LOCK_TTL_MS = 5 * 60 * 1000
  const buildLockKey = (base: string) => (projectId ? `risk_extraction_lock_${projectId}_${base}` : '')
  const acquireLock = (base: string) => {
    if (typeof window === 'undefined') return true
    const key = buildLockKey(base)
    if (!key) return true
    try {
      const now = Date.now()
      const raw = localStorage.getItem(key)
      if (raw) {
        const ts = parseInt(raw, 10)
        if (!Number.isNaN(ts) && now - ts < LOCK_TTL_MS) return false
      }
      localStorage.setItem(key, String(now))
      return true
    } catch { return true }
  }
  const releaseLock = (base: string) => {
    if (typeof window === 'undefined') return
    const key = buildLockKey(base)
    if (!key) return
    try { localStorage.removeItem(key) } catch { }
  }

  // リスク抽出結果をnuqsで管理
  const [risks, setRisksRaw] = useQueryState<Classification[]>('risks', {
    defaultValue: [],
    parse: (value) => {
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    },
    serialize: (value) => JSON.stringify(value)
  })

  // ソート済みのrisksを提供するラッパー
  const setRisks = useCallback((newRisks: Classification[] | ((prev: Classification[]) => Classification[])) => {
    if (typeof newRisks === 'function') {
      setRisksRaw(prev => sortRisksByArticleInfo(newRisks(prev)))
    } else {
      setRisksRaw(sortRisksByArticleInfo(newRisks))
    }
  }, [setRisksRaw])

  // risksが外部から更新された場合もソート
  const sortedRisks = useMemo(() => sortRisksByArticleInfo(risks), [risks])

  // 状態管理
  const [isExtracting, setIsExtracting] = useState(false)
  const [hasAutoExtracted, setHasAutoExtracted] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [extractionStatus, setExtractionStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
  const [riskTypes, setRiskTypes] = useState<Array<{ value: string, label: string, color: string }>>([])
  const [riskIdToTitleMap, setRiskIdToTitleMap] = useState<Map<string, string>>(new Map())
  // パネルの折りたたみ状態
  const [collapsedPanels, setCollapsedPanels] = useState<{
    pdf: boolean
    json: boolean
    risks: boolean
  }>({ pdf: false, json: false, risks: false })

  // パネルのサイズを動的に計算
  const calculatePanelSizes = () => {
    const collapsed = collapsedPanels
    const baseWidths = { pdf: 30, json: 40, risks: 30 }
    const collapsedWidthPercent = 4 // 折りたたみ時の相対幅（約40px相当）

    // 折りたたまれたパネルの元の割合を計算
    let collapsedTotalPercent = 0
    Object.keys(collapsed).forEach(key => {
      if (collapsed[key as keyof typeof collapsed]) {
        collapsedTotalPercent += baseWidths[key as keyof typeof baseWidths]
      }
    })

    // 開いているパネルの元の割合を計算
    let activeTotalPercent = 0
    Object.keys(collapsed).forEach(key => {
      if (!collapsed[key as keyof typeof collapsed]) {
        activeTotalPercent += baseWidths[key as keyof typeof baseWidths]
      }
    })

    if (activeTotalPercent === 0) {
      return [collapsedWidthPercent, collapsedWidthPercent, collapsedWidthPercent]
    }

    // 折りたたまれたパネルの数
    const collapsedCount = Object.values(collapsed).filter(Boolean).length

    // 折りたたまれたパネルが占める幅
    const totalCollapsedWidth = collapsedCount * collapsedWidthPercent

    // 開いているパネルで分配する残りの幅
    const remainingWidth = 100 - totalCollapsedWidth

    const sizes = Object.keys(baseWidths).map(key => {
      if (collapsed[key as keyof typeof collapsed]) {
        return collapsedWidthPercent
      }
      const baseWidth = baseWidths[key as keyof typeof baseWidths]
      // 折りたたまれた分を含めて残りの幅を元の比率で分配
      return (baseWidth / activeTotalPercent) * remainingWidth
    })

    return sizes
  }

  const togglePanel = (panel: 'pdf' | 'json' | 'risks') => {
    setCollapsedPanels(prev => ({
      ...prev,
      [panel]: !prev[panel]
    }))
  }

  // カスタムフックを使用
  const editLogic = useEditLogic()

  // リスクIDからタイトルを取得する関数
  const fetchRiskTitles = async (classifications: Classification[]) => {
    const riskIds = Array.from(new Set(classifications.map(c => c.type))).filter(Boolean)
    if (riskIds.length === 0) return

    try {
      const response = await fetch(`/api/risks?ids=${riskIds.join(',')}`)
      if (response.ok) {
        const risks = await response.json()
        const newMap = new Map<string, string>()
        risks.forEach((risk: any) => {
          newMap.set(String(risk.id), risk.title)
        })
        setRiskIdToTitleMap(newMap)
      }
    } catch (error) {
      console.error('Failed to fetch risk titles:', error)
    }
  }

  // DBに保存された（isSave=false）抽出結果を取得して画面に反映
  const loadExtractedRisksFromDB = useCallback(async () => {
    if (!projectId || !fileName) return
    try {
      const res = await fetch(`/api/projects/${projectId}/extract-risks?fileName=${encodeURIComponent(fileName)}`)
      if (!res.ok) return
      const data = await res.json()
      const dbRisks = Array.isArray(data?.risks) ? data.risks : []
      if (dbRisks.length === 0) return

      const mapped: Classification[] = dbRisks.map((r: any) => ({
        id: String(r.id),
        text: r.text || '',
        type: String(r.type || ''),
        reason: r.reason || '',
        pageNumber: r.pageNumber ?? 1,
        position: { start: r.positionStart ?? 0, end: r.positionEnd ?? 0 },
        articleInfo: r.articleInfo || undefined,
        articleTitle: r.articleTitle || undefined,
        articleOverview: r.articleOverview || undefined,
        specificClause: r.specificClause || undefined
      }))

      setRisks(mapped)
      await fetchRiskTitles(mapped)
      setHasAutoExtracted(true)
      setExtractionStatus('success')
    } catch {
      // 無視（ローカル状態に委ねる）
    }
  }, [projectId, fileName])

  // プロジェクトからワークスペースIDを取得してリスクを取得
  const { data: projectData } = useSWR(
    projectId ? `/api/projects/${projectId}` : null,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch project')
      return response.json()
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  // リスクタイプを取得
  const { data: risksData } = useSWR(
    projectData?.data?.workspaceId ? `/api/risks?workspaceId=${projectData.data.workspaceId}` : null,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch risks')
      return response.json()
    },
    { revalidateOnFocus: false, revalidateOnReconnect: false }
  )

  // リスクデータからriskTypesを構築
  useEffect(() => {
    if (risksData) {
      const types = risksData.map((risk: any, index: number) => ({
        value: String(risk.id), // DBのIDを使用（Geminiからのレスポンスとマッチさせる）
        label: risk.title,
        color: ['blue', 'orange', 'green', 'red', 'purple', 'volcano', 'magenta', 'cyan', 'lime', 'gold', 'geekblue'][index % 11]
      }))
      setRiskTypes(types)
    }
  }, [risksData])

  // OCRデータを取得
  const { data: ocrData, error: ocrError, isLoading: ocrLoading } = useSWR(
    jsonUrl ? jsonUrl : null,
    fetchOcrData,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false
    }
  )

  // 保存済みリスクを取得（contractIdが指定された場合）
  const { data: savedRisksData } = useSWR(
    contractId ? `/api/contracts/${contractId}/risks` : null,
    async (url) => {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error('Failed to fetch saved risks')
      }
      return response.json()
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false
    }
  )

  // 条文データの処理
  const articles = useMemo(() => {
    if (!ocrData?.result?.articles) return []
    return ocrData.result.articles
  }, [ocrData])

  // 契約情報
  const contractInfo = useMemo(() => {
    return ocrData?.info
  }, [ocrData])

  // 前文を抽出する関数
  const extractContractPreface = useMemo(() => {
    if (!articles.length) return ''

    const prefaceArticle = articles.find(article =>
      article.article_number === '前文'
    )

    return prefaceArticle?.content || ''
  }, [articles])

  // リスク抽出処理
  const extractRisks = async (customPrompt?: string) => {
    if (!articles.length) return

    try {
      setExtractionStatus('processing')
      // ストレージに processing を反映（既に success なら上書きしない）
      if (cacheKey && baseName && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(cacheKey)
          const parsed = raw ? JSON.parse(raw) : {}
          const existing = parsed[baseName] || Object.values(parsed).find((v: any) => (v?.baseName || '').toLowerCase().replace(/\.(pdf|json)$/i, '').trim() === baseName)
          const isSuccess = existing?.result?.status === 'success'
          if (!isSuccess) {
            parsed[baseName] = {
              result: { status: 'processing' },
              timestamp: Date.now(),
              fileName: fileName,
              baseName: baseName,
            }
            localStorage.setItem(cacheKey, JSON.stringify(parsed))
            broadcastCacheDelta(baseName, parsed[baseName])
          }
        } catch { /* ignore storage errors */ }
      }

      // ロック取得（baseName をキーに）
      if (baseName && !acquireLock(baseName)) {
        return
      }
      setIsExtracting(true)

      const response = await fetch('/api/classify-full-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          articles: articles,
          prompt: customPrompt || 'この契約書の条項から、リスクとなりうる条項を抽出してください。',
          currentPage: 1,
          projectId: projectId ? parseInt(projectId) : undefined,
          targetCompany: projectData?.data?.targetCompany,
          contractTitle: contractInfo?.title,
          contractPreface: extractContractPreface,
          userPrompt: customPrompt
        })
      })

      if (!response.ok) {
        throw new Error('リスク抽出に失敗しました')
      }

      const data = await response.json()
      const classifications = data.classifications || []
      setRisks(classifications)

      // リスクのIDからタイトルを取得
      await fetchRiskTitles(classifications)

      message.success(`${classifications.length || 0}件のリスクを検出しました`)

      // DB（isSave=false）に抽出結果を保存
      try {
        if (projectId && fileName) {
          const noExt = fileName.replace(/\.[^/.]+$/, '')
          await fetch(`/api/projects/${projectId}/extract-risks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: noExt, risks: classifications })
          })
        }
      } catch { /* ignore */ }

      // ストレージに success を反映
      if (cacheKey && baseName && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(cacheKey)
          const parsed = raw ? JSON.parse(raw) : {}
          parsed[baseName] = {
            result: {
              status: 'success',
              classifications,
              processedArticles: data.processedArticles || 0,
            },
            timestamp: Date.now(),
            fileName: fileName,
            baseName: baseName,
          }
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          broadcastCacheDelta(baseName, parsed[baseName])
        } catch { /* ignore storage errors */ }
      }
      setExtractionStatus('success')
    } catch (error) {
      console.error('Risk extraction error:', error)
      message.error('リスク抽出に失敗しました')

      // ストレージに failed を反映
      if (cacheKey && baseName && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(cacheKey)
          const parsed = raw ? JSON.parse(raw) : {}
          parsed[baseName] = {
            result: {
              status: 'failed',
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            timestamp: Date.now(),
            fileName: fileName,
            baseName: baseName,
          }
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          broadcastCacheDelta(baseName, parsed[baseName])
        } catch { /* ignore storage errors */ }
      }
      setExtractionStatus('failed')
    } finally {
      if (baseName) releaseLock(baseName)
      setIsExtracting(false)
    }
  }

  // カスタムリスク抽出実行（UIから呼び出し）
  const handleCustomRiskExecute = async (items: Array<{ id: number }>) => {
    if (!items || items.length === 0) return
    const selected = items[0]
    if (!articles.length) return
    if (baseName && !acquireLock(baseName)) return
    try {
      setExtractionStatus('processing')
      setIsExtracting(true)
      if (cacheKey && baseName && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(cacheKey)
          const parsed = raw ? JSON.parse(raw) : {}
          const existing = parsed[baseName] || Object.values(parsed).find((v: any) => (v?.baseName || '').toLowerCase().replace(/\.(pdf|json)$/i, '').trim() === baseName)
          const isSuccess = existing?.result?.status === 'success'
          if (!isSuccess) {
            parsed[baseName] = {
              result: { status: 'processing' },
              timestamp: Date.now(),
              fileName: fileName,
              baseName: baseName,
            }
            localStorage.setItem(cacheKey, JSON.stringify(parsed))
            broadcastCacheDelta(baseName, parsed[baseName])
          }
        } catch { }
      }

      const response = await fetch('/api/classify-full-context', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          articles: articles,
          projectId: projectId ? parseInt(projectId) : undefined,
          targetCompany: projectData?.data?.targetCompany,
          selectedRiskIds: [selected.id]
        })
      })
      if (!response.ok) throw new Error('カスタムリスク抽出に失敗しました')
      const data = await response.json()
      const classifications = data.classifications || []
      const selectedIdStr = String(selected.id)

      // より精密な条件でフィルタリング：
      // 1. type が selectedIdStr と一致し、かつ
      // 2. riskId が selected.id と一致するもの（カスタムリスク）のみ削除
      // 手動リスク（riskId=null）や他のリスクは保護
      const preserved = sortedRisks.filter((r: any) => {
        const isTargetCustomRisk = String(r.type) === selectedIdStr &&
          r.riskId !== undefined &&
          r.riskId !== null &&
          Number(r.riskId) === selected.id
        return !isTargetCustomRisk
      })

      setRisks([...preserved, ...classifications])
      await fetchRiskTitles(classifications)
      message.success(`${classifications.length || 0}件のリスクを検出しました`)
      setExtractionStatus('success')

      try {
        const saveRes = await fetch('/api/contracts/custom-risks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId: projectId ? parseInt(projectId) : undefined,
            fileName: fileName,
            contractTitle: contractInfo?.title,
            party: contractInfo?.party,
            startDate: contractInfo?.start_date,
            endDate: contractInfo?.end_date,
            conclusionDate: contractInfo?.conclusion_date,
            risks: classifications.map((c: any) => ({
              text: c.text,
              type: c.type,
              reason: c.reason,
              pageNumber: c.pageNumber,
              positionStart: c.position?.start ?? 0,
              positionEnd: c.position?.end ?? 0,
              articleInfo: c.articleInfo ?? null,
              articleTitle: c.articleTitle ?? null,
              articleOverview: c.articleOverview ?? null,
              specificClause: c.specificClause ?? null,
              riskId: selected.id
            }))
          })
        })
        if (!saveRes.ok) {
          const err = await saveRes.json().catch(() => ({}))
          console.warn('custom-risks save failed', err)
        }
      } catch { }

      if (cacheKey && baseName && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(cacheKey)
          const parsed = raw ? JSON.parse(raw) : {}
          parsed[baseName] = {
            result: { status: 'success', classifications, processedArticles: data.processedArticles || 0 },
            timestamp: Date.now(),
            fileName: fileName,
            baseName: baseName,
          }
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          broadcastCacheDelta(baseName, parsed[baseName])
        } catch { }
      }
    } catch (error) {
      console.error('Custom risk extraction error:', error)
      message.error('カスタムリスク抽出に失敗しました')
      setExtractionStatus('failed')
      if (cacheKey && baseName && typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem(cacheKey)
          const parsed = raw ? JSON.parse(raw) : {}
          parsed[baseName] = {
            result: { status: 'failed', error: 'Custom risk extraction failed' },
            timestamp: Date.now(),
            fileName: fileName,
            baseName: baseName,
          }
          localStorage.setItem(cacheKey, JSON.stringify(parsed))
          broadcastCacheDelta(baseName, parsed[baseName])
        } catch { }
      }
    } finally {
      if (baseName) releaseLock(baseName)
      setIsExtracting(false)
    }
  }

  // データベース保存処理
  const saveToDatabase = async () => {
    if (!projectId || !ocrData?.info) {
      message.error('プロジェクト情報が不足しています')
      return
    }

    try {
      // 契約書を作成または更新
      const contractResponse = await fetch('/api/contracts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId: parseInt(projectId),
          fileName: fileName,
          title: ocrData.info.title,
          party: ocrData.info.party,
          startDate: ocrData.info.start_date,
          endDate: ocrData.info.end_date,
          conclusionDate: ocrData.info.conclusion_date,
          baseName: (() => {
            const filename = ocrData.processing_metadata?.file_name || ''
            const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
            const firstDashIndex = nameWithoutExt.indexOf('-')
            return firstDashIndex !== -1 ? nameWithoutExt.substring(0, firstDashIndex) : nameWithoutExt
          })()
        })
      })

      if (!contractResponse.ok) {
        const errorData = await contractResponse.json()
        throw new Error(errorData.error || 'Contract creation failed')
      }

      const contractData = await contractResponse.json()
      const contractId = contractData.data.id

      // リスクを保存
      const risksResponse = await fetch(`/api/contracts/${contractId}/risks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          risks: sortedRisks
        })
      })

      if (!risksResponse.ok) {
        const errorData = await risksResponse.json()
        throw new Error(errorData.error || 'Risks saving failed')
      }

      // Contract のisSaveフラグを更新
      const updateResponse = await fetch(`/api/contracts/${contractId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isSave: true
        })
      })

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json()
        throw new Error(errorData.error || 'Contract update failed')
      }

      message.success('契約書とリスクがデータベースに保存されました')
      setIsSaved(true)
      // URLに契約書IDを追加
      const url = new URL(window.location.href)
      url.searchParams.set('contractId', contractId.toString())
      window.history.replaceState({}, '', url.toString())
      // 2秒後にプロジェクト詳細ページに戻る
      setTimeout(() => {
        window.location.href = `/project/${projectId}`
      }, 2000)
    } catch (error) {
      console.error('Save to database error:', error)
      message.error('データベースへの保存に失敗しました')
    }
  }

  // テキスト選択処理
  const handleTextSelection = () => {
    if (disableAiExtraction) return

    const selection = window.getSelection()
    if (selection && selection.toString().trim().length > 0) {
      const text = selection.toString().trim()
      if (text.length > 10) {
        editLogic.setSelectedText(text)
        editLogic.setManualRiskModalVisible(true)
        selection.removeAllRanges()
      }
    }
  }

  // 保存済みリスクの読み込み
  useEffect(() => {
    if (savedRisksData?.risks && !hasAutoExtracted) {
      setRisks(savedRisksData.risks)
      fetchRiskTitles(savedRisksData.risks)
      setHasAutoExtracted(true)
    }
  }, [savedRisksData, hasAutoExtracted, setRisks])

  // processing 中はウィンドウを閉じる/リロード時に確認ダイアログを表示
  useEffect(() => {
    const hasProcessing = () => {
      if (!cacheKey || !baseName || typeof window === 'undefined') return false
      try {
        const raw = localStorage.getItem(cacheKey)
        if (!raw) return false
        const parsed = JSON.parse(raw) as Record<string, any>
        const entry = parsed[baseName] || Object.values(parsed).find((v: any) => normalizeBaseName(v?.baseName || '') === baseName)
        return entry?.result?.status === 'processing'
      } catch {
        return false
      }
    }

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (extractionStatus === 'processing' || hasProcessing()) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', beforeUnload)
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [cacheKey, baseName, extractionStatus])

  // processing の鮮度判定用（30分）
  const PROCESSING_RETRY_MS = 30 * 60 * 1000

  // ストレージの状態に応じて抽出/表示/待機を制御
  useEffect(() => {
    if (!articles.length || !projectId || !baseName) return
    if (hasAutoExtracted) return

    const readEntry = (): any | null => {
      if (!cacheKey || typeof window === 'undefined') return null
      try {
        const raw = localStorage.getItem(cacheKey)
        if (!raw) return null
        const parsed = JSON.parse(raw) as Record<string, any>
        let entry: any = parsed[baseName]
        if (!entry) {
          entry = Object.values(parsed).find((v: any) => normalizeBaseName(v?.baseName || '') === baseName)
        }
        return entry || null
      } catch {
        return null
      }
    }

    const entry = readEntry()
    let intervalId: any = null

    const startPolling = () => {
      if (intervalId) return
      intervalId = setInterval(() => {
        const e = readEntry()
        const status = e?.result?.status
        if (status === 'success') {
          clearInterval(intervalId)
          // DBから最新をロード
          loadExtractedRisksFromDB()
          setHasAutoExtracted(true)
          setExtractionStatus('success')
        } else if (status === 'failed') {
          clearInterval(intervalId)
          if (!disableAiExtraction && !isExtracting) {
            setHasAutoExtracted(true)
            extractRisks().catch(() => { })
          }
          setExtractionStatus('failed')
        }
      }, 1500)
    }

    if (!entry) {
      // ストレージにデータがない → 実行
      if (!disableAiExtraction && !isExtracting) {
        setHasAutoExtracted(true)
        setExtractionStatus('processing')
        extractRisks().catch(() => { })
      }
    } else {
      const status = entry?.result?.status
      if (status === 'success') {
        // DBから読み込み
        loadExtractedRisksFromDB()
      } else if (status === 'failed') {
        if (!disableAiExtraction && !isExtracting) {
          setHasAutoExtracted(true)
          extractRisks().catch(() => { })
        }
        setExtractionStatus('failed')
      } else if (status === 'processing') {
        // 完了を待つ（鮮度判定あり）
        const ts = typeof entry.timestamp === 'number' ? entry.timestamp : 0
        const fresh = Date.now() - ts < PROCESSING_RETRY_MS
        setExtractionStatus('processing')
        if (fresh) {
          startPolling()
        } else if (!disableAiExtraction && !isExtracting) {
          // 古い processing は再実行
          setHasAutoExtracted(true)
          extractRisks().catch(() => { })
        }
      }
    }

    return () => { if (intervalId) clearInterval(intervalId) }
  }, [articles.length, projectId, baseName, cacheKey, disableAiExtraction, hasAutoExtracted, isExtracting, loadExtractedRisksFromDB])

  // 初回にDB（isSave=false）から抽出結果があれば表示
  useEffect(() => {
    if (!hasAutoExtracted) {
      loadExtractedRisksFromDB()
    }
  }, [hasAutoExtracted, loadExtractedRisksFromDB])

  if (ocrLoading) {
    return (
      <CenterLoadingContainer>
        <Spin size="large" tip="OCRデータを読み込み中...">
          <div />
        </Spin>
      </CenterLoadingContainer>
    )
  }

  if (ocrError) {
    return (
      <ErrorContainer>
        <Alert
          message="契約書データの読み込みに失敗しました"
          description="ファイルが破損している可能性があります。プロジェクトページから適切なファイルを再アップロードしてください。"
          type="error"
          showIcon
        />
      </ErrorContainer>
    )
  }

  if (!articles.length) {
    return (
      <ErrorContainer>
        <Alert
          message="データが見つかりません"
          description="OCRデータの条文が見つかりませんでした。"
          type="warning"
          showIcon
        />
      </ErrorContainer>
    )
  }

  return (
    <MainContainer>
      {isStagingOrLocalEnv && (
        <EditPageHeader
          contractFileName={contractFilenameParam || ''}
          isExtracting={isExtracting}
          disableAiExtraction={disableAiExtraction}
          onAiExtract={(customPrompt) => extractRisks(customPrompt)}
        />
      )}

      <ContentContainer>
        <Allotment
          key={`${collapsedPanels.pdf}-${collapsedPanels.json}-${collapsedPanels.risks}`}
          defaultSizes={calculatePanelSizes()}
        >
          {/* PDF表示パネル（左側） */}
          <CollapsiblePanel $collapsed={collapsedPanels.pdf}>
            {collapsedPanels.pdf ? (
              <CollapsedPanel>
                <CollapseButton
                  type="text"
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => togglePanel('pdf')}
                  title="PDF表示を展開"
                />
              </CollapsedPanel>
            ) : (
              <>
                <PanelHeader>
                  <PanelTitle>
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    PDF表示
                  </PanelTitle>
                  <CollapseButton
                    type="text"
                    size="small"
                    icon={<LeftOutlined />}
                    onClick={() => togglePanel('pdf')}
                    title="PDF表示を閉じる"
                  />
                </PanelHeader>
                <PanelContent>
                  <PdfContainer>
                    {pdfUrl ? (
                      <PdfFrame src={pdfUrl} title="Contract PDF" />
                    ) : (
                      <div style={{ padding: 24 }}>
                        <Alert message="PDFファイルが指定されていません" type="info" />
                      </div>
                    )}
                  </PdfContainer>
                </PanelContent>
              </>
            )}
          </CollapsiblePanel>

          {/* JSON表示パネル（中央） */}
          <CollapsiblePanel $collapsed={collapsedPanels.json}>
            {collapsedPanels.json ? (
              <CollapsedPanel>
                <CollapseButton
                  type="text"
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={() => togglePanel('json')}
                  title="OCRデータを展開"
                />
              </CollapsedPanel>
            ) : (
              <>
                <PanelHeader>
                  <PanelTitle>
                    <FileTextOutlined style={{ marginRight: 8 }} />
                    OCRデータ
                  </PanelTitle>
                  <CollapseButton
                    type="text"
                    size="small"
                    icon={<LeftOutlined />}
                    onClick={() => togglePanel('json')}
                    title="OCRデータを閉じる"
                  />
                </PanelHeader>
                <PanelContent>
                  <ArticleList
                    articles={articles}
                    contractInfo={contractInfo}
                    disableAiExtraction={disableAiExtraction}
                    onTextSelection={handleTextSelection}
                  />
                </PanelContent>
              </>
            )}
          </CollapsiblePanel>

          {/* リスク一覧パネル（右側） */}
          <CollapsiblePanel $collapsed={collapsedPanels.risks}>
            {collapsedPanels.risks ? (
              <CollapsedPanel>
                <CollapseButton
                  type="text"
                  size="large"
                  icon={<WarningOutlined />}
                  onClick={() => togglePanel('risks')}
                  title="リスク一覧を展開"
                />
              </CollapsedPanel>
            ) : (
              <>
                <PanelHeader>
                  <PanelTitle>
                    <WarningOutlined style={{ marginRight: 8 }} />
                    <Space>
                      <span>リスク一覧</span>
                      <Badge count={sortedRisks.length} />
                    </Space>
                  </PanelTitle>
                  <Space>
                    {!(disableAiExtraction || isSaved) && (
                      <CustomRiskExtractButton
                        workspaceId={projectData?.data?.workspaceId}
                        loading={isExtracting}
                        disabled={false}
                        onExecute={async (items) => {
                          if (!items || items.length === 0) return
                          await handleCustomRiskExecute(items)
                        }}
                      />
                    )}
                    {/* {!(disableAiExtraction || extractionStatus === 'success') && (
                      <Button
                        type="primary"
                        icon={<RobotOutlined />}
                        onClick={() => extractRisks()}
                        loading={isExtracting}
                        size="small"
                      >
                        再抽出
                      </Button>
                    )} */}
                    <CollapseButton
                      type="text"
                      size="small"
                      icon={<RightOutlined />}
                      onClick={() => togglePanel('risks')}
                      title="リスク一覧を閉じる"
                    />
                  </Space>
                </PanelHeader>
                <PanelContent>
                  <RiskPanel
                    risks={sortedRisks}
                    riskTypes={riskTypes}
                    riskIdToTitleMap={riskIdToTitleMap}
                    isExtracting={isExtracting}
                    disableAiExtraction={disableAiExtraction || isSaved}
                    projectId={projectId}
                    emptyHintMessage={(() => {
                      if (!cacheKey || !baseName) return undefined
                      try {
                        const raw = localStorage.getItem(cacheKey)
                        if (!raw) return undefined
                        const parsed = JSON.parse(raw) as Record<string, any> | null
                        const entry = parsed ? (parsed[baseName] || Object.values(parsed).find((v: any) => (v?.baseName || '').toLowerCase().replace(/\.(pdf|json)$/i, '').trim() === baseName)) : null
                        const status = entry?.result?.status
                        if (status === 'processing') return 'AIがバックグラウンドで分析中です。しばらくお待ちください。'
                        if (status === 'failed') return 'AI分析に失敗しました。再抽出をお試しください。'
                        if (status === 'success' && (!sortedRisks || sortedRisks.length === 0)) return 'AI分析ではリスクが見つかりませんでした。'
                      } catch { /* ignore */ }
                      return undefined
                    })()}
                    editingRisk={editLogic.editingRisk}
                    editingField={editLogic.editingField}
                    editValue={editLogic.editValue}
                    onRemoveRisk={(riskId) => setRisks(sortedRisks.filter(r => r.id !== riskId))}
                    onSaveToDatabase={saveToDatabase}
                    onStartEditing={editLogic.startEditing}
                    onSaveEdit={() => editLogic.saveEdit(sortedRisks, setRisks).catch(() => { })}
                    onValueChange={editLogic.setEditValue}
                    onKeyPress={(e) => editLogic.handleKeyPress(e, sortedRisks, setRisks)}
                    onEditRisk={editLogic.startRiskEdit}
                  />
                </PanelContent>
              </>
            )}
          </CollapsiblePanel>
        </Allotment>
      </ContentContainer>


      <ManualRiskModal
        visible={editLogic.manualRiskModalVisible}
        selectedText={editLogic.selectedText}
        selectedRiskType={editLogic.selectedRiskType}
        extractingArticleInfo={editLogic.extractingArticleInfo}
        isExtracting={isExtracting}
        riskTypes={riskTypes}
        onCancel={editLogic.resetModalState}
        onOk={() => editLogic.addManualRisk(sortedRisks, setRisks, articles, projectId || undefined, fileName || undefined, ocrData)}
        onRiskTypeChange={editLogic.isEditMode ? editLogic.updateEditingType : editLogic.setSelectedRiskType}
        isEditMode={editLogic.isEditMode}
        editingRiskId={editLogic.editingRiskData?.id}
        initialText={editLogic.editingRiskData?.text || ''}
        initialReason={editLogic.editingRiskData?.reason || ''}
        onTextChange={editLogic.updateEditingText}
        onReasonChange={editLogic.updateEditingReason}
      />
    </MainContainer>
  )
}

const EditPage = () => {
  return (
    <Suspense fallback={
      <CenterLoadingContainer>
        <Spin size="large" tip="ページを読み込み中...">
          <div />
        </Spin>
      </CenterLoadingContainer>
    }>
      <EditPageContent />
    </Suspense>
  )
}

export default EditPage

// Styled Components

const CenterLoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  gap: 16px;
`

const MainContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
`

const ContentContainer = styled.div`
  flex: 1;
  overflow: hidden;
`


const PdfContainer = styled.div`
  flex: 1;
  overflow: hidden;
`

const PdfFrame = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`

const ErrorContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  padding: 24px;
`

const CollapsiblePanel = styled.div<{ $collapsed: boolean }>`
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: white;
  border-right: 1px solid #e8e8e8;
  overflow: hidden;
  
  &:last-child {
    border-right: none;
  }
`

const PanelHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 12px;
  background-color: #FAFAFA;
  border-bottom: 1px solid #9A9A9A;
  font-weight: 500;
  min-height: 56px;
  color: #252525;
`

const PanelTitle = styled.div`
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 500;
  color: #252525;
`

const PanelContent = styled.div`
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

const CollapseButton = styled(Button)`
  border: none;
  box-shadow: none;
  padding: 4px;
  
  &:hover {
    background-color: #9A9A9A !important;
  }
`

const CollapsedPanel = styled.div`
  display: flex;
  justify-content: center;
  align-items: flex-start;
  height: 100%;
  background-color: #FAFAFA;
  padding: 16px 4px 8px 4px;
  
  .ant-btn {
    height: auto;
    padding: 8px 4px;
  }
`