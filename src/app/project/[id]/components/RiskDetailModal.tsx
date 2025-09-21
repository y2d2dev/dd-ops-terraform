'use client'

import React from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { List } from '@/components/ui/List'
import { Card } from '@/components/ui/Card'
import { Space } from '@/components/ui/Space'
import { Tag } from '@/components/ui/Tag'
import { Text } from '@/components/ui/Typography'

interface RiskDetailModalProps {
  visible: boolean
  contractName: string
  riskType: string
  risks: any[]
  onCancel: () => void
  riskTypes?: Array<{value: string, label: string, color: string}>
  riskIdToTitleMap?: Map<string, string>
}

/**
 * Risk detail modal component
 * @param props - Component properties
 * @returns JSX element
 */
export default function RiskDetailModal({ 
  visible, 
  contractName, 
  riskType, 
  risks, 
  onCancel,
  riskTypes = [],
  riskIdToTitleMap = new Map()
}: RiskDetailModalProps) {
  return (
    <Modal
      title={`${contractName} - ${riskType}の詳細`}
      open={visible}
      onCancel={onCancel}
      width={900}
      footer={[
        <Button key="close" onClick={onCancel}>
          閉じる
        </Button>
      ]}
    >
      <List
        dataSource={risks}
        renderItem={(risk: any, index: number) => {
          const typeInfo = riskTypes.find(t => t.value === risk.type)
          const riskTitle = riskIdToTitleMap?.get(risk.type) || typeInfo?.label || `リスクタイプ${risk.type}`
          
          return (
            <List.Item>
              <Card 
                size="small" 
                style={{ width: '100%' }}
              >
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    {risk.articleInfo && (
                      <Tag color="green" style={{ marginBottom: '8px' }}>
                        {risk.articleInfo}
                      </Tag>
                    )}
                    <br/>
                    <Tag color={typeInfo?.color || 'blue'} style={{ marginBottom: '8px' }}>
                      {riskTitle}
                    </Tag>
                  </div>
                  
                  {risk.articleTitle && (
                    <Text style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      <strong>条文タイトル:</strong> {risk.articleTitle}
                    </Text>
                  )}
                  
                  <div style={{ fontSize: '14px', marginBottom: '8px' }}>
                    該当条文:
                    <div style={{ 
                      marginTop: '4px', 
                      padding: '8px', 
                      backgroundColor: '#f9f9f9', 
                      borderRadius: '4px',
                      border: '1px solid #d9d9d9',
                      whiteSpace: 'pre-wrap'
                    }}>
                      {(risk.articleInfo || '') + (risk.articleInfo ? '\n' : '') + (risk.specificClause || risk.text)}
                    </div>
                  </div>
                </Space>
              </Card>
            </List.Item>
          )
        }}
        locale={{ emptyText: 'このタイプのリスクはありません' }}
      />
    </Modal>
  )
}