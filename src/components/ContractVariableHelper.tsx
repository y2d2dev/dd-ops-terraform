/**
 * Contract Variable Helper Component
 */

import React, { useState } from 'react'
import { Popover, Button, Space, Typography, Tag, Tooltip, Input, message } from 'antd'
import { QuestionCircleOutlined, CopyOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { CONTRACT_VARIABLES, CATEGORY_NAMES, formatVariable, ContractVariable } from '@/lib/contractVariables'

const { Text, Title } = Typography
const { Search } = Input

interface ContractVariableHelperProps {
  onInsert?: (variable: string) => void
  buttonText?: string
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight' | 'leftTop' | 'leftBottom' | 'rightTop' | 'rightBottom'
}

export const ContractVariableHelper: React.FC<ContractVariableHelperProps> = ({
  onInsert,
  buttonText = '利用可能な変数',
  placement = 'bottomLeft'
}) => {
  const [searchValue, setSearchValue] = useState('')
  const [open, setOpen] = useState(false)

  // 検索フィルタリング
  const filteredVariables = CONTRACT_VARIABLES.filter(variable => {
    const searchLower = searchValue.toLowerCase()
    return (
      variable.key.toLowerCase().includes(searchLower) ||
      variable.displayName.toLowerCase().includes(searchLower) ||
      variable.description.toLowerCase().includes(searchLower)
    )
  })

  // カテゴリごとにグループ化
  const groupedVariables = filteredVariables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = []
    }
    acc[variable.category].push(variable)
    return acc
  }, {} as Record<string, ContractVariable[]>)

  // 変数をコピー
  const handleCopy = (variable: ContractVariable) => {
    const formattedVar = formatVariable(variable.key)
    navigator.clipboard.writeText(formattedVar)
    message.success(`${formattedVar} をコピーしました`)
    
    if (onInsert) {
      onInsert(formattedVar)
      setOpen(false)
    }
  }

  const content = (
    <VariableContainer>
      <HeaderSection>
        <Title level={5} style={{ margin: 0 }}>契約情報で使える変数</Title>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          クリックして変数をコピー
        </Text>
      </HeaderSection>
      
      <Search
        placeholder="変数を検索..."
        value={searchValue}
        onChange={(e) => setSearchValue(e.target.value)}
        style={{ marginBottom: 16 }}
        allowClear
      />
      
      <VariableList>
        {Object.entries(groupedVariables).map(([category, variables]) => (
          <CategorySection key={category}>
            <CategoryTitle>{CATEGORY_NAMES[category] || category}</CategoryTitle>
            <Space direction="vertical" style={{ width: '100%' }}>
              {variables.map((variable) => (
                <VariableItem
                  key={variable.key}
                  onClick={() => handleCopy(variable)}
                >
                  <VariableHeader>
                    <VariableKey>{formatVariable(variable.key)}</VariableKey>
                    <Tooltip title="クリックしてコピー">
                      <CopyOutlined style={{ fontSize: '12px', color: '#8c8c8c' }} />
                    </Tooltip>
                  </VariableHeader>
                  <VariableName>{variable.displayName}</VariableName>
                  <VariableDescription>{variable.description}</VariableDescription>
                  <VariableExample>例: {variable.example}</VariableExample>
                </VariableItem>
              ))}
            </Space>
          </CategorySection>
        ))}
      </VariableList>
      
      {filteredVariables.length === 0 && (
        <NoResultsMessage>
          <Text type="secondary">該当する変数が見つかりません</Text>
        </NoResultsMessage>
      )}
    </VariableContainer>
  )

  return (
    <Popover
      content={content}
      trigger="click"
      placement={placement}
      open={open}
      onOpenChange={setOpen}
      overlayStyle={{ maxWidth: '400px' }}
    >
      <Button
        icon={<QuestionCircleOutlined />}
        type="default"
      >
        {buttonText}
      </Button>
    </Popover>
  )
}

// スタイルコンポーネント
const VariableContainer = styled.div`
  width: 350px;
  max-height: 500px;
  display: flex;
  flex-direction: column;
`

const HeaderSection = styled.div`
  margin-bottom: 16px;
`

const VariableList = styled.div`
  overflow-y: auto;
  flex: 1;
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`

const CategorySection = styled.div`
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const CategoryTitle = styled.div`
  font-weight: 600;
  color: #595959;
  margin-bottom: 8px;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const VariableItem = styled.div`
  padding: 12px;
  background-color: #f5f5f5;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background-color: #e6f7ff;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  }
`

const VariableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`

const VariableKey = styled.code`
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  background-color: #e6f7ff;
  padding: 4px 8px;
  border-radius: 4px;
  color: #1890ff;
  font-size: 14px;
  border: 1px solid #91d5ff;
  font-weight: 500;
`

const VariableName = styled.div`
  font-weight: 500;
  color: #262626;
  margin-bottom: 2px;
  font-size: 13px;
`

const VariableDescription = styled.div`
  color: #595959;
  font-size: 12px;
  margin-bottom: 4px;
`

const VariableExample = styled.div`
  color: #8c8c8c;
  font-size: 11px;
  font-style: italic;
`

const NoResultsMessage = styled.div`
  text-align: center;
  padding: 20px;
`