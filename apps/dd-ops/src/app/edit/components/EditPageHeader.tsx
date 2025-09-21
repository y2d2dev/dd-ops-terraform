'use client'

import React, { useState } from 'react'
import { FileTextOutlined, RobotOutlined, DownOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { Space } from '@/components/ui/Space'
import { Button, Dropdown, MenuProps } from 'antd'
import { Tag } from '@/components/ui/Tag'
import { Title } from '@/components/ui/Typography'
import CustomPromptModal from './CustomPromptModal'

interface EditPageHeaderProps {
  contractFileName?: string
  isExtracting: boolean
  disableAiExtraction: boolean
  onAiExtract: (customPrompt?: string) => void
}

/**
 * Edit page header component
 */
export default function EditPageHeader({
  contractFileName,
  isExtracting,
  disableAiExtraction,
  onAiExtract
}: EditPageHeaderProps) {
  const [showCustomPromptModal, setShowCustomPromptModal] = useState(false)

  const handleMenuClick: MenuProps['onClick'] = ({ key }) => {
    if (key === 'custom') {
      setShowCustomPromptModal(true)
    } else {
      onAiExtract()
    }
  }

  const handleCustomPromptOk = (customPrompt: string) => {
    setShowCustomPromptModal(false)
    onAiExtract(customPrompt)
  }

  const items: MenuProps['items'] = [
    {
      key: 'default',
      label: 'デフォルトで抽出',
      icon: <RobotOutlined />
    },
    {
      key: 'custom',
      label: 'カスタムプロンプトで抽出',
      icon: <RobotOutlined />
    }
  ]
  return (
    <>
      <Header>
        <Space>
          <FileTextOutlined />
          <HeaderTitle level={4}>契約書編集</HeaderTitle>
          {contractFileName && (
            <Tag color="blue">{contractFileName}</Tag>
          )}
        </Space>
        <Space>
          {disableAiExtraction ? (
            <Button
              type="primary"
              icon={<RobotOutlined />}
              disabled
              title="保存済みリスクを表示中のため、AI抽出は無効化されています"
            >
              保存済みリスク表示中
            </Button>
          ) : (
            <Dropdown.Button
              type="primary"
              icon={<DownOutlined />}
              loading={isExtracting}
              onClick={() => onAiExtract()}
              menu={{ items, onClick: handleMenuClick }}
            >
              <RobotOutlined /> AIリスク抽出
            </Dropdown.Button>
          )}
        </Space>
      </Header>
      <CustomPromptModal
        visible={showCustomPromptModal}
        onCancel={() => setShowCustomPromptModal(false)}
        onOk={handleCustomPromptOk}
        loading={isExtracting}
      />
    </>
  )
}

// Styled Components
const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border-bottom: 1px solid #e8e8e8;
`

const HeaderTitle = styled(Title)`
  margin: 0 !important;
`