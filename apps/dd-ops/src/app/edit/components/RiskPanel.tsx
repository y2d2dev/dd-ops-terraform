'use client'

import React from 'react'
import { CloseOutlined, EditOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import EditableText from './EditableText'
import { Space } from '@/components/ui/Space'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'
import { Text } from '@/components/ui/Typography'
import { message } from '@/components/ui/message'

interface Risk {
  id: string
  articleInfo?: string
  articleTitle?: string
  specificClause?: string
  text?: string
  type: string
}

interface RiskType {
  value: string
  label: string
  color: string
}

interface RiskPanelProps {
  risks: Risk[]
  riskTypes: RiskType[]
  riskIdToTitleMap?: Map<string, string>
  isExtracting: boolean
  disableAiExtraction: boolean
  projectId: string | null
  emptyHintMessage?: string
  editingRisk: string | null
  editingField: string | null
  editValue: string
  onRemoveRisk: (riskId: string) => void
  onSaveToDatabase: () => void
  onStartEditing: (riskId: string, field: string, value: string) => void
  onSaveEdit: () => void
  onValueChange: (value: string) => void
  onKeyPress: (e: React.KeyboardEvent) => void
  onEditRisk?: (risk: Risk) => void
}

const PanelContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
`

const PanelSpace = styled(Space)`
  flex: 1;
  overflow-y: auto;
  padding: 16px;
`

const RiskItemCard = styled(Card)`
  margin-bottom: 8px;
  margin-right: 8px;
`

const RiskItemSpace = styled(Space)`
  width: 100%;
`

const RiskTag = styled(Tag)`
  margin-bottom: 8px;
`

const RiskTitle = styled(Text)`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
`

const RiskDescription = styled.div`
  font-size: 14px;
  margin-bottom: 8px;
`

const RiskTextArea = styled.div`
  margin-top: 4px;
`

const StickyButtonContainer = styled.div`
  position: sticky;
  bottom: 0;
  background-color: white;
  padding: 16px;
  border-top: 1px solid #e8e8e8;
`

// 条ごとのグルーピング用UI
const ArticleGroup = styled.div`
  padding-top: 8px;
  margin-top: 8px;
  border-top: 1px solid #eaeaea;
`

const ArticleGroupHeader = styled.div`
  font-size: 12px;
  color: #444;
  margin: 4px 0 8px 2px;
`

/**
 * Risk list panel component
 */
export default function RiskPanel({
  risks,
  riskTypes,
  riskIdToTitleMap,
  isExtracting,
  disableAiExtraction,
  projectId,
  emptyHintMessage,
  editingRisk,
  editingField,
  editValue,
  onRemoveRisk,
  onSaveToDatabase,
  onStartEditing,
  onSaveEdit,
  onValueChange,
  onKeyPress,
  onEditRisk
}: RiskPanelProps) {
  const handleDeleteRisk = async (riskId: string) => {
    try {
      const response = await fetch(`/api/contract-risks/${riskId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'リスクの削除に失敗しました')
      }

      message.success('リスクを削除しました')
      onRemoveRisk(riskId)
    } catch (error) {
      console.error('Delete risk error:', error)
      message.error('リスクの削除に失敗しました')
    }
  }

  return (
    <PanelContainer>
      <PanelSpace direction="vertical">

        {risks.length === 0 && !isExtracting && (
          <Card size="small">
            <Text type="secondary">
              {emptyHintMessage ?? (disableAiExtraction ? '保存済みリスクはありません' : 'リスクは検出されませんでした')}
            </Text>
          </Card>
        )}

        {(() => {
          // 第X条の数値を抽出（なければ 999999）
          const getArticleNumber = (info?: string): number => {
            if (!info) return 999999
            const m = info.match(/第(\d+)条/)
            return m ? parseInt(m[1], 10) : 999999
          }
          // グルーピング
          const groups = new Map<string, Risk[]>()
          risks.forEach((r) => {
            const num = getArticleNumber(r.articleInfo)
            const key = Number.isFinite(num) && num !== 999999 ? `第${num}条` : 'その他'
            const arr = groups.get(key) || []
            arr.push(r)
            groups.set(key, arr)
          })
          // グループの表示順：数値昇順→その他
          const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
            const na = a === 'その他' ? Infinity : parseInt(a.replace(/[^0-9]/g, ''), 10)
            const nb = b === 'その他' ? Infinity : parseInt(b.replace(/[^0-9]/g, ''), 10)
            return na - nb
          })

          return sortedKeys.map((key) => (
            <ArticleGroup key={key}>
              <ArticleGroupHeader>{key}</ArticleGroupHeader>
              {groups.get(key)!.map((risk) => {
                const typeInfo = riskTypes.find(t => t.value === risk.type)
                const riskTitle = riskIdToTitleMap?.get(risk.type) || typeInfo?.label || `リスクタイプ${risk.type}`
                return (
                  <RiskItemCard
                    key={risk.id}
                    size="small"
                    extra={
                      !disableAiExtraction ? (
                        <Space>
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => onEditRisk?.(risk)}
                            title="リスクを編集"
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<CloseOutlined />}
                            onClick={() => handleDeleteRisk(risk.id)}
                            title="リスクを削除"
                          />
                        </Space>
                      ) : null
                    }
                  >
                    <RiskItemSpace direction="vertical">
                      <div>
                        {risk.articleInfo && (
                          <RiskTag color="green">
                            {risk.articleInfo}
                          </RiskTag>
                        )}
                        <br />
                        <RiskTag color={typeInfo?.color || 'blue'}>
                          {riskTitle}
                        </RiskTag>
                      </div>

                      {risk.articleTitle && (
                        <RiskTitle>
                          <strong>条文タイトル:</strong> {risk.articleTitle}
                        </RiskTitle>
                      )}

                      <RiskDescription>
                        該当条文:
                        <RiskTextArea>
                          <EditableText
                            value={(risk.articleInfo || '') + (risk.articleInfo ? '\n' : '') + (risk.specificClause || risk.text)}
                            riskId={risk.id}
                            field="specificClause"
                            placeholder="該当条文を入力してください"
                            multiline
                            row={20}
                            editingRisk={editingRisk}
                            editingField={editingField}
                            editValue={editValue}
                            disableAiExtraction={disableAiExtraction}
                            onStartEditing={onStartEditing}
                            onSaveEdit={onSaveEdit}
                            onCancelEdit={() => { }}
                            onValueChange={onValueChange}
                            onKeyPress={onKeyPress}
                          />
                        </RiskTextArea>
                      </RiskDescription>
                    </RiskItemSpace>
                  </RiskItemCard>
                )
              })}
            </ArticleGroup>
          ))
        })()}
      </PanelSpace>

      <StickyButtonContainer>
        <Button
          type="primary"
          block
          onClick={onSaveToDatabase}
          disabled={!projectId || disableAiExtraction}
          title={disableAiExtraction ? '保存済みリスクのため、再保存は無効化されています' : ''}
        >
          {disableAiExtraction ? '保存済みリスク' : 'DBに保存'}
        </Button>
      </StickyButtonContainer>
    </PanelContainer>
  )
}