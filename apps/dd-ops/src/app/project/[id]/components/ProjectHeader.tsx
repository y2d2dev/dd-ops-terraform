'use client'

import React, { useState } from 'react'
import {
  UploadOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  ExclamationCircleOutlined,
  EditOutlined
} from '@ant-design/icons'
import styled from 'styled-components'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Space } from '@/components/ui/Space'
import { Title, Text } from '@/components/ui/Typography'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { message } from '@/components/ui/message'

interface Project {
  id: number
  name: string
  description?: string
  targetCompany?: string
  workspace: {
    id: number
    name: string
  }
  createdAt: string
}

interface ProjectHeaderProps {
  project: Project
  projectId: string
  contractsCompleted: boolean
  onUpload: () => void
  onReportCreate: () => void
  onDelete: () => void
  selectedContractCount?: number
  onProjectUpdate?: (updatedProject: Project) => void
}

// プロジェクトヘッダーカード
const ProjectHeaderCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  
  .ant-card-body {
    padding: 24px;
  }
`

// プロジェクトタイトル
const ProjectTitle = styled(Title)`
  margin: 0 !important;
  color: #1f2937;
`

// プロジェクト説明
const ProjectDescription = styled(Text)`
  color: #6b7280;
  font-size: 16px;
  margin-top: 8px;
`

// 対象会社表示
const TargetCompanyText = styled(Text)`
  color: #6b7280;
  font-size: 16px;
`

// 対象会社編集エリア
const TargetCompanyEdit = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`

/**
 * Project header component
 * @param props - Component properties
 * @returns JSX element
 */
export default function ProjectHeader({
  project,
  projectId,
  contractsCompleted,
  onUpload,
  onReportCreate,
  onDelete,
  selectedContractCount = 0,
  onProjectUpdate
}: ProjectHeaderProps) {
  const [isEditingTargetCompany, setIsEditingTargetCompany] = useState(false)
  const [targetCompanyValue, setTargetCompanyValue] = useState(project.targetCompany || '')
  const [loading, setLoading] = useState(false)

  /**
   * Handle target company update
   */
  const handleUpdateTargetCompany = async () => {
    if (!onProjectUpdate) return

    setLoading(true)
    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetCompany: targetCompanyValue || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update target company')
      }

      const { data: updatedProject } = await response.json()
      onProjectUpdate(updatedProject)
      setIsEditingTargetCompany(false)
      message.success('対象会社を更新しました')
    } catch (error) {
      console.error('Failed to update target company:', error)
      message.error('対象会社の更新に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  /**
   * Handle edit cancel
   */
  const handleCancelEdit = () => {
    setTargetCompanyValue(project.targetCompany || '')
    setIsEditingTargetCompany(false)
  }

  /**
   * Handle project deletion with confirmation
   */
  const handleDeleteProject = () => {
    Modal.confirm({
      title: 'プロジェクトを終了しますか？',
      icon: <ExclamationCircleOutlined />,
      content: `「${project.name}」を終了すると、このアクションは取り消せません。`,
      okText: '終了',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: onDelete,
    })
  }

  return (
    <ProjectHeaderCard>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <div>
          <ProjectTitle level={2}>{project.name}</ProjectTitle>
          {project.description && (
            <ProjectDescription>説明：{project.description}</ProjectDescription>
          )}

          {/* 対象会社表示・編集 */}
          {isEditingTargetCompany ? (
            <TargetCompanyEdit>
              <Text style={{ color: '#6b7280', fontSize: '16px' }}>対象会社：</Text>
              <Input
                value={targetCompanyValue}
                onChange={(e) => setTargetCompanyValue(e.target.value)}
                placeholder="対象会社名を入力"
                style={{ width: '200px' }}
                onPressEnter={handleUpdateTargetCompany}
              />
              <Button
                type="primary"
                size="small"
                loading={loading}
                onClick={handleUpdateTargetCompany}
              >
                保存
              </Button>
              <Button
                size="small"
                onClick={handleCancelEdit}
                disabled={loading}
              >
                キャンセル
              </Button>
            </TargetCompanyEdit>
          ) : (
            <TargetCompanyEdit>
              <TargetCompanyText>
                対象会社：{project.targetCompany || '未設定'}
              </TargetCompanyText>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => setIsEditingTargetCompany(true)}
              >
                編集
              </Button>
            </TargetCompanyEdit>
          )}
        </div>

        <Space>
          <Button
            type="primary"
            icon={<UploadOutlined />}
            onClick={onUpload}
          >
            ファイルアップロード
          </Button>
          {contractsCompleted && (
            <Button
              type="default"
              icon={<FileExcelOutlined />}
              onClick={onReportCreate}
            >
              報告書作成
              {selectedContractCount > 0 && ` (${selectedContractCount}件選択中)`}
            </Button>
          )}
          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={handleDeleteProject}
          >
            プロジェクト終了
          </Button>
        </Space>
      </Space>
    </ProjectHeaderCard>
  )
}