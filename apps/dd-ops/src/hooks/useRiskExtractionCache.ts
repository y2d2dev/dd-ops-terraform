'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import PQueue from 'p-queue'
import { signedUrlFetcher } from '@/lib/swr/fetchers'

interface Contract {
    fileName: string
    baseName?: string
    isSave?: boolean
}

interface GroupedFile {
    baseName: string
    pdfFile?: { name: string; publicUrl: string; uploadedAt: string }
    jsonFile?: { name: string; publicUrl: string; uploadedAt: string }
    isCompleted: boolean
}

type ExtractionStatus = 'pending' | 'processing' | 'success' | 'failed'

interface ExtractionResult {
    status: ExtractionStatus
    classifications?: any[]
    processedArticles?: number
    error?: string
}

interface CacheData {
    result: ExtractionResult
    timestamp: number
    fileName: string
    baseName: string
}

interface ProcessingState {
    isProcessing: boolean
    totalCount: number
    completedCount: number
    failedBaseNames: string[]
}

/** ---------- ユーティリティ ---------- */
const ONE_DAY_MS = 24 * 60 * 60 * 1000
// 追加：processing 再実行のしきい値（30分）
const PROCESSING_RETRY_MS = 30 * 60 * 1000
// 追加：failed 再実行のしきい値（30分）
const FAILED_RETRY_MS = 30 * 60 * 1000
// 軽量ロック（タブ間の二重実行抑止用）
const LOCK_TTL_MS = 5 * 60 * 1000

const normalizeBaseName = (pathOrName: string): string =>
    pathOrName
        .split('/').pop()!
        .replace(/\.(pdf|json)$/i, '')
        .trim()
        .toLowerCase()

// fetch with timeout
const fetchWithTimeout = async (input: RequestInfo | URL, init?: RequestInit & { timeoutMs?: number }) => {
    const timeoutMs = init?.timeoutMs ?? 30000
    const ac = new AbortController()
    const id = setTimeout(() => ac.abort(), timeoutMs)
    try {
        const res = await fetch(input, { ...init, signal: ac.signal })
        return res
    } finally {
        clearTimeout(id)
    }
}

function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
    let t: any
    return (...args: Parameters<T>) => {
        clearTimeout(t)
        t = setTimeout(() => fn(...args), wait)
    }
}

/**
 * リスク抽出のキャッシュとキュー処理を管理するフック（BroadcastChannel同期 + processing再実行ルール対応版）
 */
export function useRiskExtractionCache(
    projectId: string,
    workspaceId: number,
    contracts: Contract[],
    groupedFiles: GroupedFile[],
    projectTargetCompany?: string
) {
    const [cache, setCache] = useState<Map<string, CacheData>>(new Map())
    const [processingState, setProcessingState] = useState<ProcessingState>({
        isProcessing: false,
        totalCount: 0,
        completedCount: 0,
        failedBaseNames: []
    })

    const queueRef = useRef<PQueue | null>(null)
    const enqueuedRef = useRef<Set<string>>(new Set()) // 二重投入防止
    const isInitializedRef = useRef(false)
    const isCacheRestoredRef = useRef(false)
    const mountedRef = useRef(true)

    // 追加：タブ/ページ間同期用
    const channelRef = useRef<BroadcastChannel | null>(null)

    // 最新値参照用
    const cacheRef = useRef(cache)
    const processingRef = useRef(processingState)
    useEffect(() => { cacheRef.current = cache }, [cache])
    useEffect(() => { processingRef.current = processingState }, [processingState])

    // キー（baseName）正規化済みの contracts & groupedFiles をメモ化
    const normalizedContracts = useMemo(() => {
        return contracts.map(c => ({
            ...c,
            baseName: c.baseName ? normalizeBaseName(c.baseName) : normalizeBaseName(c.fileName),
            isSave: c.isSave
        }))
    }, [contracts])


    const normalizedGrouped = useMemo(() => {
        return groupedFiles.map(g => {
            const pdfBase = g.pdfFile?.name ? normalizeBaseName(g.pdfFile.name) : g.baseName ? normalizeBaseName(g.baseName) : ''
            return { ...g, baseName: pdfBase }
        })
    }, [groupedFiles])

    // PQueue 初期化
    useEffect(() => {
        if (!queueRef.current) {
            queueRef.current = new PQueue({
                concurrency: 3,
                interval: 1000,
                intervalCap: 3,
                autoStart: true
            })
        }
        return () => {
            mountedRef.current = false
            queueRef.current?.clear()
        }
    }, [])

    // BroadcastChannel + storage 受信設定
    useEffect(() => {
        if (!projectId) return

        // BroadcastChannel
        channelRef.current = new BroadcastChannel(`risk-extraction:${projectId}`)
        const ch = channelRef.current

        const onMessage = (ev: MessageEvent) => {
            const msg = ev.data
            if (!msg || msg.type !== 'cache:update') return
            const { baseName, cacheData } = msg.payload || {}
            if (!baseName || !cacheData) return

            setCacheWithTTL(prev => {
                const next = new Map(prev)
                next.set(baseName, cacheData)
                return next
            })
        }
        ch.addEventListener('message', onMessage)

        // localStorage フォールバック（他タブへ伝播）
        const onStorage = (e: StorageEvent) => {
            if (e.key !== `risk_extraction_cache_delta_${projectId}` || !e.newValue) return
            try {
                const { baseName, cacheData } = JSON.parse(e.newValue)
                setCacheWithTTL(prev => {
                    const next = new Map(prev)
                    next.set(baseName, cacheData)
                    return next
                })
            } catch { }
        }
        window.addEventListener('storage', onStorage)

        return () => {
            ch.removeEventListener('message', onMessage)
            ch.close()
            window.removeEventListener('storage', onStorage)
        }
    }, [projectId])

    // 送信ユーティリティ
    const broadcastCacheDelta = useCallback((baseName: string, cacheData: CacheData) => {
        // BroadcastChannel
        try {
            channelRef.current?.postMessage({
                type: 'cache:update',
                payload: { baseName, cacheData }
            })
        } catch { }

        // storage イベント（他タブへ）
        try {
            localStorage.setItem(
                `risk_extraction_cache_delta_${projectId}`,
                JSON.stringify({ baseName, cacheData })
            )
            // cleanup
            setTimeout(() => localStorage.removeItem(`risk_extraction_cache_delta_${projectId}`), 1000)
        } catch { }
    }, [projectId])

    // localStorage 保存（差分・遅延）
    const cacheKey = useMemo(() => projectId ? `risk_extraction_cache_${projectId}` : '', [projectId])

    const saveCacheDebounced = useMemo(() => debounce((map: Map<string, CacheData>) => {
        if (!cacheKey) return
        const obj: Record<string, CacheData> = {}
        map.forEach((v, k) => { obj[k] = v })
        try {
            localStorage.setItem(cacheKey, JSON.stringify(obj))
        } catch { /* ignore quota errors */ }
    }, 500), [cacheKey])

    useEffect(() => {
        if (typeof window !== 'undefined' && cache.size > 0) {
            saveCacheDebounced(cache)
        }
    }, [cache, saveCacheDebounced])

    // localStorage 復元
    useEffect(() => {
        if (typeof window === 'undefined' || !projectId) return
        const savedCache = localStorage.getItem(cacheKey)
        if (savedCache) {
            try {
                const parsed = JSON.parse(savedCache) as Record<string, CacheData>
                const restored = new Map<string, CacheData>()
                const now = Date.now()
                for (const [k, v] of Object.entries(parsed)) {
                    if (v?.timestamp && (now - v.timestamp) < ONE_DAY_MS) {
                        const nk = v.baseName ? normalizeBaseName(v.baseName) : normalizeBaseName(k)
                        restored.set(nk, { ...v, baseName: nk })
                    }
                }
                setCache(restored)
            } catch {
                // 破損は無視
            }
        }
        isCacheRestoredRef.current = true
    }, [projectId, cacheKey])

    // 古いエントリ prune（都度）
    const setCacheWithTTL = useCallback((updater: (prev: Map<string, CacheData>) => Map<string, CacheData>) => {
        setCache(prev => {
            const next = updater(prev)
            const now = Date.now()
            next.forEach((v, k) => {
                if (now - v.timestamp >= ONE_DAY_MS) next.delete(k)
            })
            return next
        })
    }, [])

    /** ---------- ロックユーティリティ（localStorage） ---------- */
    const buildLockKey = useCallback((baseName: string) => {
        const safeBase = normalizeBaseName(baseName)
        return projectId ? `risk_extraction_lock_${projectId}_${safeBase}` : ''
    }, [projectId])

    const acquireLock = useCallback((baseName: string): boolean => {
        if (typeof window === 'undefined') return true
        const key = buildLockKey(baseName)
        if (!key) return true
        try {
            const now = Date.now()
            const raw = localStorage.getItem(key)
            if (raw) {
                const ts = parseInt(raw, 10)
                if (!Number.isNaN(ts) && now - ts < LOCK_TTL_MS) {
                    return false
                }
            }
            localStorage.setItem(key, String(now))
            return true
        } catch {
            return true
        }
    }, [buildLockKey])

    const releaseLock = useCallback((baseName: string) => {
        if (typeof window === 'undefined') return
        const key = buildLockKey(baseName)
        if (!key) return
        try {
            localStorage.removeItem(key)
        } catch { }
    }, [buildLockKey])

    /** 実行要否判定（processingは30分以上古ければ再実行許可） */
    const shouldProcessBaseName = useCallback((baseName: string, map?: Map<string, CacheData>) => {
        const m = map || cacheRef.current
        const cd = m.get(baseName)
        if (!cd) return true
        const st = cd.result.status
        const now = Date.now()

        if (st === 'success') return false
        if (st === 'processing') {
            return (now - (cd.timestamp ?? 0)) >= PROCESSING_RETRY_MS
        }
        // pending or unknown
        return true
    }, [])

    /** OCR 取得 */
    const fetchOcrData = useCallback(async (fileNameOrPath: string): Promise<any> => {
        const api = process.env.NEXT_PUBLIC_API_URL
        if (!api) throw new Error('API URL not configured')

        const filesData = await signedUrlFetcher(api, {
            projectId,
            workspaceId,
            fileName: fileNameOrPath
        })
        if (!filesData?.signedJsonUrl) throw new Error('No JSON URL received')

        const res = await fetchWithTimeout(filesData.signedJsonUrl, { timeoutMs: 30000 })
        if (!res.ok) throw new Error(`Failed to fetch OCR data: ${res.status}`)
        return res.json()
    }, [projectId, workspaceId])

    /** 単一契約の抽出（processingは30分未満ならスキップ） */
    const extractRisksForContract = useCallback(async (contract: Contract, baseName: string): Promise<ExtractionResult> => {
        // 冪等化：successは常にスキップ、processingは鮮度チェック
        const current = cacheRef.current.get(baseName)
        if (current?.result.status === 'success') {
            return current.result
        }
        if (current?.result.status === 'processing') {
            const stale = (Date.now() - (current.timestamp ?? 0)) >= PROCESSING_RETRY_MS
            if (!stale) return current.result
            // 30分以上経過なら再実行へフォールスルー
        }

        const gf = normalizedGrouped.find(g => g.baseName === baseName && g.isCompleted)
        const fileNameParam = (() => {
            const name = gf?.pdfFile?.name ?? `${baseName}.pdf`
            return name.replace(/\.(pdf|json)$/i, '')
        })()
        try {
            const ocrData = await fetchOcrData(fileNameParam)
            if (!ocrData?.result?.articles) throw new Error('No articles found in OCR data')

            const pid = Number(projectId)
            if (!Number.isFinite(pid)) throw new Error('Invalid projectId')

            const response = await fetchWithTimeout('/api/classify-full-context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    articles: ocrData.result.articles,
                    targetCompany: projectTargetCompany || '',
                    projectId: pid
                }),
                timeoutMs: 60000
            })
            if (!response.ok) throw new Error(`API request failed: ${response.status}`)

            const result = await response.json()
            return {
                status: 'success',
                classifications: result.classifications ?? [],
                processedArticles: result.processedArticles ?? 0
            }
        } catch (e: any) {
            return { status: 'failed', error: e?.message ?? 'Unknown error' }
        }
    }, [normalizedGrouped, fetchOcrData, projectId, projectTargetCompany])

    /** 未処理の契約を処理 */
    const processUnprocessedContracts = useCallback(async (mapForRestore?: Map<string, CacheData>) => {
        const map = mapForRestore || cacheRef.current
        if (!queueRef.current) return
        if (processingRef.current.isProcessing) return
        if (!isCacheRestoredRef.current) return
        if (normalizedContracts.length === 0 || normalizedGrouped.length === 0) return

        // 対象抽出
        const targets: { contract: Contract; baseName: string }[] = []
        for (const c of normalizedContracts) {
            // 保存済み契約は対象外
            if (c.isSave) continue
            const base = c.baseName ?? normalizeBaseName(c.fileName)
            if (!base) continue
            if (!shouldProcessBaseName(base, map)) continue
            const gf = normalizedGrouped.find(g => g.baseName === base && g.isCompleted)
            if (!gf) continue
            if (enqueuedRef.current.has(base)) continue
            targets.push({ contract: c, baseName: base })
        }

        if (targets.length === 0) return

        // ステータス切替
        setProcessingState({
            isProcessing: true,
            totalCount: targets.length,
            completedCount: 0,
            failedBaseNames: []
        })

        // キュー投入
        const tasks = targets.map(({ contract, baseName }) => {
            enqueuedRef.current.add(baseName)

            return queueRef.current!.add(async () => {
                // ロック取得（取得できなければスキップ扱い）
                const locked = acquireLock(baseName)
                if (!locked) {
                    return { status: 'pending' } as ExtractionResult
                }
                let result: ExtractionResult = { status: 'failed', error: 'Unknown error' }
                try {
                    // 最終直前の冪等チェック（processingの鮮度も見る）
                    const before = cacheRef.current.get(baseName)
                    const freshProcessing =
                        before?.result.status === 'processing' &&
                        (Date.now() - (before.timestamp ?? 0)) < PROCESSING_RETRY_MS

                    if (before?.result.status === 'success' || freshProcessing) {
                        result = before.result
                    } else {
                        // 事前にDBへ存在確認（localStorageが空でもDBにあれば success として扱う）
                        try {
                            const fileNameNoExt = (contract.fileName || '').replace(/\.[^/.]+$/, '')
                            const chk = await fetch(`/api/projects/${projectId}/extract-risks?fileName=${encodeURIComponent(fileNameNoExt)}`)
                            if (chk.ok) {
                                const data = await chk.json()
                                const count = Array.isArray(data?.risks) ? data.risks.length : (data?.count ?? 0)
                                if (count > 0) {
                                    // success としてキャッシュ反映し、分類は行わない
                                    const successCache: CacheData = {
                                        result: { status: 'success' },
                                        timestamp: Date.now(),
                                        fileName: contract.fileName,
                                        baseName
                                    }
                                    setCacheWithTTL(prev => new Map(prev).set(baseName, successCache))
                                    broadcastCacheDelta(baseName, successCache)
                                    return { status: 'success' } as ExtractionResult
                                }
                            }
                        } catch { /* ignore DB check errors */ }

                        // processing を反映（ただし既に success なら書かない）
                        setCacheWithTTL(prev => {
                            const current = prev.get(baseName)
                            if (current?.result?.status === 'success') return prev
                            const processingCache: CacheData = {
                                result: { status: 'processing' },
                                timestamp: Date.now(),
                                fileName: contract.fileName,
                                baseName
                            }
                            const next = new Map(prev)
                            next.set(baseName, processingCache)
                            broadcastCacheDelta(baseName, processingCache)
                            return next
                        })

                        const extracted = await extractRisksForContract(contract, baseName)
                        if (extracted.status === 'success') {
                            try {
                                const fileNameNoExt = (contract.fileName || '').replace(/\.[^/.]+$/, '')
                                await fetch(`/api/projects/${projectId}/extract-risks`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ fileName: fileNameNoExt, risks: extracted.classifications ?? [] })
                                })
                            } catch { }
                        }
                        // ローカルキャッシュにはstatusのみ保持
                        result = { status: extracted.status } as ExtractionResult
                    }
                } catch (e: any) {
                    result = { status: 'failed', error: e?.message ?? 'Unknown error' }
                } finally {
                    // ロック解放
                    releaseLock(baseName)
                    setCacheWithTTL(prev => {
                        const current = prev.get(baseName)
                        // success は不変（より悪い状態で上書きしない）
                        if (current?.result?.status === 'success' && result.status !== 'success') {
                            return prev
                        }
                        const finalCache: CacheData = {
                            result,
                            timestamp: Date.now(),
                            fileName: contract.fileName,
                            baseName
                        }
                        const next = new Map(prev)
                        next.set(baseName, finalCache)
                        broadcastCacheDelta(baseName, finalCache)
                        return next
                    })

                    setProcessingState(prev => ({
                        ...prev,
                        completedCount: prev.completedCount + 1,
                        failedBaseNames: result.status === 'failed'
                            ? [...prev.failedBaseNames, baseName]
                            : prev.failedBaseNames
                    }))
                }
                return result
            })
        })

        try {
            await Promise.all(tasks)
        } finally {
            setProcessingState(prev => ({ ...prev, isProcessing: false }))
            // idle 後に去重セットを掃除（完了したもののみ）
            queueRef.current.onIdle().then(() => {
                for (const { baseName } of targets) enqueuedRef.current.delete(baseName)
            })
        }
    }, [normalizedContracts, normalizedGrouped, shouldProcessBaseName, extractRisksForContract, setCacheWithTTL, broadcastCacheDelta])

    /** 失敗した契約の再試行（ポリシー維持：自動はしない） */
    const retryFailedContracts = useCallback(async () => {
        const failedBaseNames = processingRef.current.failedBaseNames
        if (failedBaseNames.length === 0) return

        setProcessingState(prev => ({ ...prev, failedBaseNames: [] }))

        // 失敗分のキャッシュをクリア
        setCacheWithTTL(prev => {
            const next = new Map(prev)
            for (const baseName of failedBaseNames) {
                const key = normalizeBaseName(baseName)
                next.delete(key)
                enqueuedRef.current.delete(key)
            }
            return next
        })

        // 再実行（少しディレイ）
        setTimeout(() => processUnprocessedContracts(), 150)
    }, [normalizedContracts, processUnprocessedContracts, setCacheWithTTL])

    /** 初回自動起動（成功キャッシュがある場合は自動起動しない） */
    useEffect(() => {
        if (
            isCacheRestoredRef.current &&
            !isInitializedRef.current &&
            normalizedContracts.length > 0 &&
            normalizedGrouped.length > 0 &&
            !processingRef.current.isProcessing
        ) {
            isInitializedRef.current = true

            const hasSuccessfulCache = normalizedContracts.some(c => {
                const base = c.baseName ?? normalizeBaseName(c.fileName)
                const cached = cacheRef.current.get(base)
                return cached?.result.status === 'success'
            })
            if (!hasSuccessfulCache) {
                setTimeout(() => processUnprocessedContracts(), 800)
            }
        }
    }, [normalizedContracts, normalizedGrouped, processUnprocessedContracts])

    /** 外部提供 API */
    const getCachedResult = useCallback((baseName: string): ExtractionResult | null => {
        const key = normalizeBaseName(baseName)
        const cached = cacheRef.current.get(key)
        return cached ? cached.result : null
    }, [])

    const getCachedResultByFileName = useCallback((fileOrBase: string): ExtractionResult | null => {
        return getCachedResult(fileOrBase)
    }, [getCachedResult])

    // キャッシュを手動で更新する関数（更新をブロードキャスト）
    const updateCacheStatus = useCallback((baseName: string, status: ExtractionStatus) => {
        const normalizedBaseName = normalizeBaseName(baseName)
        const contract = normalizedContracts.find(c => (c.baseName ?? normalizeBaseName(c.fileName)) === normalizedBaseName)

        if (contract) {
            const cacheData: CacheData = {
                result: {
                    status
                },
                timestamp: Date.now(),
                fileName: contract.fileName,
                baseName: normalizedBaseName
            }
            setCacheWithTTL(prev => new Map(prev).set(normalizedBaseName, cacheData))
            // 追加：即時ブロードキャスト
            broadcastCacheDelta(normalizedBaseName, cacheData)
        }
    }, [normalizedContracts, setCacheWithTTL, broadcastCacheDelta])

    // キャッシュをクリアする関数
    const clearCache = useCallback((baseName?: string) => {
        if (baseName) {
            const normalizedBaseName = normalizeBaseName(baseName)
            setCacheWithTTL(prev => {
                const next = new Map(prev)
                next.delete(normalizedBaseName)
                return next
            })
        } else {
            setCacheWithTTL(() => new Map())
        }
    }, [setCacheWithTTL])

    return {
        // 状態
        processingState,
        cache,

        // 関数
        getCachedResult,              // baseName でも fileName でも可（正規化）
        getCachedResultByFileName,    // 互換
        shouldProcessBaseName,
        retryFailedContracts,
        processUnprocessedContracts,
        updateCacheStatus,            // キャッシュステータス更新（即時ブロードキャスト）
        clearCache,                   // キャッシュクリア

        // 統計
        totalCachedCount: cache.size,
        hasFailedBaseNames: processingState.failedBaseNames.length > 0
    }
}
