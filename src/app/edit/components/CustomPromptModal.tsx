'use client'

import React, { useState } from 'react'
import { Modal, Input, Space, Typography } from 'antd'
import { RobotOutlined } from '@ant-design/icons'
import styled from 'styled-components'

const { TextArea } = Input
const { Text } = Typography

interface CustomPromptModalProps {
  visible: boolean
  onCancel: () => void
  onOk: (customPrompt: string) => void
  loading?: boolean
}

/**
 * Modal for entering custom prompt for AI risk extraction
 */
export default function CustomPromptModal({
  visible,
  onCancel,
  onOk,
  loading = false
}: CustomPromptModalProps) {
  const [customPrompt, setCustomPrompt] = useState('')

  const handleOk = () => {
    onOk(customPrompt)
  }

  const handleCancel = () => {
    setCustomPrompt('')
    onCancel()
  }

  return (
    <StyledModal
      title={
        <Space>
          <RobotOutlined />
          <span>AIリスク抽出 - カスタムプロンプト</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      onOk={handleOk}
      okText="抽出開始"
      cancelText="キャンセル"
      confirmLoading={loading}
      width={600}
      okButtonProps={{ disabled: !customPrompt.trim() }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <LabelText>カスタムプロンプトを入力してください：</LabelText>
          <DescriptionText type="secondary">
            AIがリスクを抽出する際の追加指示を入力できます。
            例：「特に解除条項と損害賠償に関するリスクを重点的に抽出してください」
          </DescriptionText>
        </div>
        <StyledTextArea
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          placeholder="リスク抽出の際の追加指示を入力..."
          rows={6}
          showCount
        />
      </Space>
    </StyledModal>
  )
}

// Styled Components
const StyledModal = styled(Modal)`
  .ant-modal-header {
    border-bottom: 1px solid #f0f0f0;
  }
  
  .ant-modal-footer {
    border-top: 1px solid #f0f0f0;
  }
`

const StyledTextArea = styled(TextArea)`
  resize: none;
  
  &:hover {
    border-color: #40a9ff;
  }
  
  &:focus {
    border-color: #40a9ff;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
  }
`

const LabelText = styled(Text)`
  font-weight: 500;
  font-size: 14px;
  color: #262626;
`

const DescriptionText = styled(Text)`
  font-size: 12px;
  display: block;
  margin-top: 4px;
`