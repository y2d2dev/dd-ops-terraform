import { useState } from 'react'
import { message } from 'antd'
import { Classification, Article } from '../types'

export function useEditLogic() {
  // インライン編集の管理
  const [editingRisk, setEditingRisk] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // 手動リスク入力の管理
  const [manualRiskModalVisible, setManualRiskModalVisible] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectedRiskType, setSelectedRiskType] = useState('')
  const [extractingArticleInfo, setExtractingArticleInfo] = useState(false)

  // リスク編集の管理
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingRiskData, setEditingRiskData] = useState<{
    id: string
    text: string
    reason: string
    type: string
  } | null>(null)

  // 選択されたテキストがどの条文に属するかを特定
  const findArticleForSelectedText = (selectedText: string, articles: Article[]) => {
    for (const article of articles) {
      if (article.content.includes(selectedText)) {
        return article
      }
    }
    return null
  }

  // 条文番号の自動抽出
  const extractArticleInfo = async (selectedText: string, articles: Article[]): Promise<string> => {
    try {
      setExtractingArticleInfo(true)

      // 選択されたテキストがどの条文に属するかを特定
      const currentArticle = findArticleForSelectedText(selectedText, articles)
      if (!currentArticle) {
        console.log('選択テキストに対応する条文が見つかりません')
        return ''
      }

      console.log('選択テキストが属する条文:', currentArticle.article_number)

      // 現在の条文のインデックスを取得
      const currentIndex = articles.findIndex(article => article.article_number === currentArticle.article_number)

      // 上の条文を取得（存在する場合）
      const previousArticle = currentIndex > 0 ? articles[currentIndex - 1] : null

      console.log('APIに送信するデータ:')
      console.log('- 条文番号:', currentArticle.article_number)
      console.log('- 選択テキスト:', selectedText.substring(0, 100) + '...')
      console.log('- 上の条文:', previousArticle?.article_number || 'なし')

      const response = await fetch('/api/extract-article-info', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          selectedText: selectedText,
          currentArticle: {
            number: currentArticle.article_number,
            title: currentArticle.title,
            content: currentArticle.content
          },
          previousArticle: previousArticle ? {
            number: previousArticle.article_number,
            title: previousArticle.title,
            content: previousArticle.content
          } : null
        })
      })

      if (!response.ok) {
        throw new Error('条文番号の抽出に失敗しました')
      }

      const result = await response.json()
      console.log('API レスポンス:', result)
      return result.articleInfo || ''
    } catch (error) {
      console.error('Article info extraction error:', error)
      return ''
    } finally {
      setExtractingArticleInfo(false)
    }
  }

  // インライン編集開始
  const startEditing = (riskId: string, field: string, currentValue: string) => {
    setEditingRisk(riskId)
    setEditingField(field)
    setEditValue(currentValue || '')
  }

  // インライン編集保存
  const saveEdit = async (risks: Classification[], setRisks: (risks: Classification[]) => void) => {
    if (!editingRisk || !editingField) return

    let finalValue = editValue

    // specificClauseフィールドの場合、articleInfo部分を除去
    if (editingField === 'specificClause') {
      const currentRisk = risks.find(risk => risk.id === editingRisk)
      if (currentRisk?.articleInfo && finalValue.startsWith(currentRisk.articleInfo)) {
        finalValue = finalValue.replace(currentRisk.articleInfo, '').trim()
      }
    }

    // APIを呼び出してDBを更新
    try {
      const response = await fetch(`/api/contract-risks/${editingRisk}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          [editingField]: finalValue
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'リスクの更新に失敗しました')
      }

      // 成功時に画面を更新
      const updatedRisks = risks.map(risk => {
        if (risk.id === editingRisk) {
          return {
            ...risk,
            [editingField]: finalValue
          }
        }
        return risk
      })

      setRisks(updatedRisks)
      message.success('リスクを更新しました')
    } catch (error) {
      console.error('Update risk error:', error)
      message.error('リスクの更新に失敗しました')
    }

    setEditingRisk(null)
    setEditingField(null)
    setEditValue('')
  }

  // インライン編集キャンセル
  const cancelEdit = () => {
    setEditingRisk(null)
    setEditingField(null)
    setEditValue('')
  }

  // Enterキーで保存、Escapeキーでキャンセル
  const handleKeyPress = (e: React.KeyboardEvent, risks: Classification[], setRisks: (risks: Classification[]) => void) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit(risks, setRisks).catch(() => { })
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  // 手動リスク追加
  const addManualRisk = async (
    risks: Classification[],
    setRisks: (risks: Classification[]) => void,
    articles: Article[],
    projectId?: string,
    fileName?: string,
    ocrData?: any
  ) => {
    if (isEditMode && editingRiskData) {
      // 編集モードの場合 - APIを呼び出してDBを更新
      try {
        const response = await fetch(`/api/contract-risks/${editingRiskData.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: editingRiskData.text,
            reason: editingRiskData.reason,
            type: editingRiskData.type,
            specificClause: editingRiskData.text
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'リスクの更新に失敗しました')
        }

        // 成功時に画面を更新
        const updatedRisks = risks.map(risk => {
          if (risk.id === editingRiskData.id) {
            return {
              ...risk,
              text: editingRiskData.text,
              reason: editingRiskData.reason,
              type: editingRiskData.type,
              specificClause: editingRiskData.text
            }
          }
          return risk
        })

        setRisks(updatedRisks)
        resetModalState()
        message.success('リスクを更新しました')
      } catch (error) {
        console.error('Update risk error:', error)
        message.error('リスクの更新に失敗しました')
      }
    } else {
      // 新規追加モードの場合 - APIを呼び出してDBに保存
      if (!selectedText || !selectedRiskType) return

      try {
        setExtractingArticleInfo(true)

        // 条文番号を自動抽出
        const articleInfo = await extractArticleInfo(selectedText, articles)
        console.log('抽出された条文番号:', articleInfo)
        console.log('選択されたテキスト:', selectedText)

        // APIを呼び出して手動リスクをDBに保存
        const response = await fetch('/api/contracts/manual-risks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            projectId: projectId ? parseInt(projectId) : undefined,
            fileName: fileName,
            baseName: (() => {
              if (!ocrData?.processing_metadata?.file_name) return undefined
              const filename = ocrData.processing_metadata.file_name
              const nameWithoutExt = filename.replace(/\.[^/.]+$/, '')
              const firstDashIndex = nameWithoutExt.indexOf('-')
              return firstDashIndex !== -1 ? nameWithoutExt.substring(0, firstDashIndex) : nameWithoutExt
            })(),
            contractTitle: ocrData?.info?.title,
            party: ocrData?.info?.party,
            startDate: ocrData?.info?.start_date,
            endDate: ocrData?.info?.end_date,
            conclusionDate: ocrData?.info?.conclusion_date,
            risk: {
              text: selectedText,
              type: selectedRiskType,
              reason: '手動で追加されたリスク',
              articleInfo: articleInfo,
              articleTitle: '',
              articleOverview: '',
              specificClause: selectedText,
              pageNumber: 1,
              position: { start: 0, end: selectedText.length }
            }
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || '手動リスクの保存に失敗しました')
        }

        const result = await response.json()
        console.log('手動リスク保存結果:', result)

        // 成功時に画面のステートも更新
        const newRisk: Classification = {
          id: result.riskId.toString(),
          text: selectedText,
          type: selectedRiskType,
          reason: '手動で追加されたリスク',
          pageNumber: 1,
          position: { start: 0, end: selectedText.length },
          articleInfo: articleInfo,
          articleTitle: '',
          articleOverview: '',
          specificClause: selectedText
        }

        console.log('作成されたリスク:', newRisk)
        setRisks([...risks, newRisk])
        resetModalState()

        if (articleInfo) {
          message.success(`リスクを追加しました (${articleInfo})`)
        } else {
          message.success('リスクを追加しました（条文番号は検出されませんでした）')
        }
      } catch (error) {
        console.error('Manual risk addition error:', error)
        message.error('手動リスクの追加に失敗しました')
      } finally {
        setExtractingArticleInfo(false)
      }
    }
  }

  // モーダル状態をリセット
  const resetModalState = () => {
    setManualRiskModalVisible(false)
    setSelectedText('')
    setSelectedRiskType('')
    setIsEditMode(false)
    setEditingRiskData(null)
  }

  // リスク編集開始
  const startRiskEdit = (risk: any) => {
    setIsEditMode(true)
    setEditingRiskData({
      id: risk.id,
      text: risk.text || risk.specificClause || '',
      reason: risk.reason || '',
      type: risk.type
    })
    setSelectedRiskType(risk.type)
    setManualRiskModalVisible(true)
  }

  // 編集データの更新
  const updateEditingText = (text: string) => {
    if (editingRiskData) {
      setEditingRiskData({ ...editingRiskData, text })
    }
  }

  const updateEditingReason = (reason: string) => {
    if (editingRiskData) {
      setEditingRiskData({ ...editingRiskData, reason })
    }
  }

  const updateEditingType = (type: string) => {
    if (editingRiskData) {
      setEditingRiskData({ ...editingRiskData, type })
    }
    setSelectedRiskType(type)
  }

  return {
    // State
    editingRisk,
    editingField,
    editValue,
    manualRiskModalVisible,
    selectedText,
    selectedRiskType,
    extractingArticleInfo,
    isEditMode,
    editingRiskData,

    // Setters
    setEditValue,
    setManualRiskModalVisible,
    setSelectedText,
    setSelectedRiskType,

    // Functions
    startEditing,
    saveEdit,
    cancelEdit,
    handleKeyPress,
    addManualRisk,
    extractArticleInfo,
    resetModalState,
    startRiskEdit,
    updateEditingText,
    updateEditingReason,
    updateEditingType
  }
}