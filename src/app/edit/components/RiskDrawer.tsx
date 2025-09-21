'use client'

import React from 'react'
import { WarningOutlined, RobotOutlined, CloseOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import EditableText from './EditableText'
import { Drawer } from '@/components/ui/Drawer'
import { Space } from '@/components/ui/Space'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Tag } from '@/components/ui/Tag'
import { Text } from '@/components/ui/Typography'

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

interface RiskDrawerProps {
  visible: boolean
  risks: Risk[]
  riskTypes: RiskType[]
  riskIdToTitleMap?: Map<string, string>
  isExtracting: boolean
  disableAiExtraction: boolean
  projectId: string | null
  editingRisk: string | null
  editingField: string | null
  editValue: string
  onClose: () => void
  onReExtract?: () => void
  onRemoveRisk: (riskId: string) => void
  onSaveToDatabase: () => void
  onStartEditing: (riskId: string, field: string, value: string) => void
  onSaveEdit: () => void
  onValueChange: (value: string) => void
  onKeyPress: (e: React.KeyboardEvent) => void
}

const DrawerSpace = styled(Space)`
  width: 100%;
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

const LoadingText = styled.span`
  margin-left: 8px;
`

const StickyButtonContainer = styled.div`
  position: sticky;
  bottom: 0;
  background-color: white;
  padding: 16px 0;
  border-top: 1px solid #e8e8e8;
  margin-top: 16px;
`

/**
 * Risk list drawer component
 */
export default function RiskDrawer({
  visible,
  risks,
  riskTypes,
  riskIdToTitleMap,
  isExtracting,
  disableAiExtraction,
  projectId,
  editingRisk,
  editingField,
  editValue,
  onClose,
  onReExtract,
  onRemoveRisk,
  onSaveToDatabase,
  onStartEditing,
  onSaveEdit,
  onValueChange,
  onKeyPress
}: RiskDrawerProps) {
  return (
    <Drawer
      title={
        <Space>
          <WarningOutlined />
          <span>リスク一覧</span>
          <Badge count={risks.length} />
        </Space>
      }
      placement="right"
      onClose={onClose}
      open={visible}
      width={600}
      extra={
        !disableAiExtraction && onReExtract ? (
          <Button
            type="primary"
            icon={<RobotOutlined />}
            onClick={onReExtract}
            loading={isExtracting}
            size="small"
          >
            再抽出
          </Button>
        ) : null
      }
    >
      <DrawerSpace direction="vertical">
        {isExtracting && (
          <Card size="small">
            <LoadingText>AI がリスクを分析中...</LoadingText>
          </Card>
        )}
        
        {risks.length === 0 && !isExtracting && (
          <Card size="small">
            <Text type="secondary">
              {disableAiExtraction ? '保存済みリスクはありません' : 'リスクは検出されませんでした'}
            </Text>
          </Card>
        )}

        {risks.map((risk) => {
          const typeInfo = riskTypes.find(t => t.value === risk.type)
          // riskIdToTitleMapからタイトルを取得、なければフォールバック
          const riskTitle = riskIdToTitleMap?.get(risk.type) || typeInfo?.label || `リスクタイプ${risk.type}`
          return (
            <RiskItemCard
              key={risk.id}
              size="small"
              extra={
                !disableAiExtraction ? (
                  <Button
                    type="text"
                    danger
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => onRemoveRisk(risk.id)}
                  />
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
                  <br/>
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
                      onCancelEdit={() => {}}
                      onValueChange={onValueChange}
                      onKeyPress={onKeyPress}
                    />
                  </RiskTextArea>
                </RiskDescription>
              </RiskItemSpace>
            </RiskItemCard>
          )
        })}
        
        {risks.length > 0 && (
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
        )}
      </DrawerSpace>
    </Drawer>
  )
}