'use client'

import React from 'react'
import { WarningOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { Modal } from '@/components/ui/Modal'
import { Space } from '@/components/ui/Space'
import { Tag } from '@/components/ui/Tag'
import { Spin } from '@/components/ui/Spin'
import { Select } from '@/components/ui/Select'

interface RiskType {
  value: string
  label: string
  color: string
}

interface ManualRiskModalProps {
  visible: boolean
  selectedText: string
  selectedRiskType: string
  extractingArticleInfo: boolean
  isExtracting: boolean
  riskTypes: RiskType[]
  isEditMode?: boolean
  editingRiskId?: string
  initialText?: string
  initialReason?: string
  onCancel: () => void
  onOk: () => void
  onRiskTypeChange: (value: string) => void
  onTextChange?: (text: string) => void
  onReasonChange?: (reason: string) => void
}

const ModalContent = styled(Space)`
  width: 100%;
`

const SelectedTextDisplay = styled.div`
  margin-top: 8px;
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  border: 1px solid #d9d9d9;
  max-height: 200px;
  overflow-y: auto;
  font-size: 14px;
  line-height: 1.5;
`

const RiskTypeContainer = styled.div`
  margin-top: 8px;
`

const RiskTypeSelect = styled(Select)`
  width: 100%;
`

const ExtractionStatus = styled.div`
  text-align: center;
  color: #666;
`

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px;
  border: 1px solid #d9d9d9;
  border-radius: 6px;
  background-color: #f5f5f5;
  font-size: 14px;
  line-height: 1.5;
  resize: vertical;
  min-height: 80px;
  outline: none;
  font-family: inherit;
  
  &:focus {
    border-color: #1890ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`

const ReasonTextArea = styled(TextArea)`
  min-height: 60px;
`

/**
 * Manual risk addition modal component
 */
export default function ManualRiskModal({
  visible,
  selectedText,
  selectedRiskType,
  extractingArticleInfo,
  isExtracting,
  riskTypes,
  isEditMode = false,
  editingRiskId: _,
  initialText = '',
  initialReason = '',
  onCancel,
  onOk,
  onRiskTypeChange,
  onTextChange,
  onReasonChange
}: ManualRiskModalProps) {
  return (
    <Modal
      title={
        <Space>
          <WarningOutlined />
          <span>{isEditMode ? 'リスク編集' : '手動リスク追加'}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      onOk={onOk}
      okText={isEditMode ? '更新' : 'リスクを追加'}
      cancelText="キャンセル"
      width={700}
      okButtonProps={{ 
        loading: extractingArticleInfo,
        disabled: (!selectedText && !initialText) || !selectedRiskType || isExtracting
      }}
    >
      <ModalContent direction="vertical" size="large">
        <div>
          <strong>{isEditMode ? 'リスクテキスト：' : '選択されたテキスト：'}</strong>
          {isEditMode ? (
            <div style={{ marginTop: 8 }}>
              <TextArea
                value={initialText}
                onChange={(e) => onTextChange?.(e.target.value)}
                placeholder="リスクテキストを入力してください"
                style={{ width: '95%' }}
              />
            </div>
          ) : (
            <SelectedTextDisplay>
              {selectedText}
            </SelectedTextDisplay>
          )}
        </div>
        
        <div>
          <strong>リスクタイプを選択してください：</strong>
          <RiskTypeContainer>
            <RiskTypeSelect
              placeholder="リスクタイプを選択"
              value={selectedRiskType || undefined}
              onChange={(value) => onRiskTypeChange(value as string)}
              disabled={isExtracting}
              options={riskTypes.map(type => ({
                value: type.value,
                label: type.label
              }))}
            />
          </RiskTypeContainer>
        </div>
        
        {isEditMode && (
          <div>
            <strong>理由：</strong>
            <div style={{ marginTop: 8 }}>
              <ReasonTextArea
                value={initialReason}
                onChange={(e) => onReasonChange?.(e.target.value)}
                placeholder="リスクの理由を入力してください"
                style={{ width: '95%' }}
              />
            </div>
          </div>
        )}
        
        {isExtracting && (
          <ExtractionStatus>
            <Spin size="small" style={{ marginRight: 8 }} />
            AIリスク抽出中のため手動追加は無効化されています...
          </ExtractionStatus>
        )}
        
        {extractingArticleInfo && (
          <ExtractionStatus>
            <Spin size="small" style={{ marginRight: 8 }} />
            条文番号を自動抽出中...
          </ExtractionStatus>
        )}
      </ModalContent>
    </Modal>
  )
}