'use client'

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import styled from 'styled-components'
import { Spin } from 'antd'
import AppLayout from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Title, Text } from '@/components/ui/Typography'
import { Badge } from '@/components/ui/Badge'
import { useQueryState } from 'nuqs'

interface Project {
  id: number
  name: string
  targetCompany: string
  deletedAt?: string | null
  totalPageCount: number
  workspaceId: number
  ocrPageCounts: {
    [key: string]: number  // YYYY-MM: count
  }
}

function HomeContent() {
  const router = useRouter()
  const [activeProjects, setActiveProjects] = useState<Project[]>([])
  const [archivedProjects, setArchivedProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [workspaceId] = useQueryState('workspaceId', {
    parse: (value) => {
      if (!value) return null
      return parseInt(value, 10)
    },
    serialize: (value) => value?.toString()
  })

  // プロジェクト詳細ページへの遷移
  const handleProjectClick = (projectId: number) => {
    router.push(`/project/${projectId}`)
  }

  useEffect(() => {
    const fetchProjects = async () => {
      const response = await fetch('/api/projects')
      const data = await response.json()
      const projects = data.projects

      const active = projects.filter((project: Project) => !project.deletedAt)
      const archived = projects.filter((project: Project) => project.deletedAt)

      setActiveProjects(active)
      setArchivedProjects(archived)
      setLoading(false)
    }
    fetchProjects()
  }, [workspaceId])

  // ローディング・エラー状態の表示
  if (loading) {
    return (
      <AppLayout>
        <HomeContainer>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Text>プロジェクトを読み込み中...</Text>
          </div>
        </HomeContainer>
      </AppLayout>
    )
  }

  if (error) {
    return (
      <AppLayout>
        <HomeContainer>
          <div style={{ textAlign: 'center', padding: '48px' }}>
            <Text type="danger">{error}</Text>
          </div>
        </HomeContainer>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <HomeContainer>
        <ProjectsGrid>
          {/* 左カラム: 進行中のプロジェクト */}
          <ProjectColumn>
            <ActiveProjectCard>
              <ProjectTitleContainer>
                <ProjectTitle level={3}>進行中のプロジェクト</ProjectTitle>
                <ActiveBadge status="processing" text="進行中" />
              </ProjectTitleContainer>
              {activeProjects.length > 0 ? (
                <ProjectListContainer>
                  {activeProjects.map((project) => (
                    <ActiveProjectListItem 
                      key={project.id}
                      onClick={() => handleProjectClick(project.id)}
                    >
                      <ProjectItem>
                        <ProjectHeader>
                          <ActiveProjectName>{project.name}</ActiveProjectName>
                          <ProjectPageCountContainer>
                            {Object.entries(project.ocrPageCounts)
                              .slice(-2)  // 最新2ヶ月分を取得
                              .map(([month, count], index) => (
                                <ProjectPageCount key={month}>
                                  <MonthLabel>{month.slice(5)}月</MonthLabel>
                                  {count}P
                                </ProjectPageCount>
                              ))
                            }
                          </ProjectPageCountContainer>
                        </ProjectHeader>
                        <ProjectCompany type="secondary">
                          {project.targetCompany}
                        </ProjectCompany>
                      </ProjectItem>
                    </ActiveProjectListItem>
                  ))}
                </ProjectListContainer>
              ) : (
                <EmptyState type="secondary">
                  進行中のプロジェクトはありません
                </EmptyState>
              )}
            </ActiveProjectCard>
          </ProjectColumn>
          
          {/* 右カラム: アーカイブ済みのプロジェクト */}
          <ProjectColumn>
            <ArchivedProjectCard>
              <ProjectTitleContainer>
                <ProjectTitle level={3}>アーカイブ済みのプロジェクト</ProjectTitle>
                <ArchivedBadge status="default" text="完了" />
              </ProjectTitleContainer>
              {archivedProjects.length > 0 ? (
                <ProjectListContainer>
                  {archivedProjects.map((project) => (
                    <ArchivedProjectListItem key={project.id}>
                      <ProjectItem>
                        <ProjectHeader>
                          <ArchivedProjectName>{project.name}</ArchivedProjectName>
                          <ArchivedProjectPageCountContainer>
                            {Object.entries(project.ocrPageCounts)
                              .slice(-2)  // 最新2ヶ月分を取得
                              .map(([month, count], index) => (
                                <ArchivedProjectPageCount key={month}>
                                  <MonthLabel>{month.slice(5)}月</MonthLabel>
                                  {count}P
                                </ArchivedProjectPageCount>
                              ))
                            }
                          </ArchivedProjectPageCountContainer>
                        </ProjectHeader>
                        <ArchivedProjectCompany type="secondary">
                          {project.targetCompany}
                        </ArchivedProjectCompany>
                      </ProjectItem>
                    </ArchivedProjectListItem>
                  ))}
                </ProjectListContainer>
              ) : (
                <EmptyState type="secondary">
                  アーカイブ済みのプロジェクトはありません
                </EmptyState>
              )}
            </ArchivedProjectCard>
          </ProjectColumn>
        </ProjectsGrid>
      </HomeContainer>
    </AppLayout>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <LoadingContainer>
        <Spin size="large" tip="Loading..." />
      </LoadingContainer>
    }>
      <HomeContent />
    </Suspense>
  )
}

// ローディング表示用のコンテナ
const LoadingContainer = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #FAFAFA;
`

// メインコンテナ
const HomeContainer = styled.div`
  height: 100%;
  padding: 24px;
  overflow: auto;
  background: #FAFAFA;
`

// プロジェクトグリッド（2カラム）
const ProjectsGrid = styled.div`
  display: flex;
  gap: 24px;
  height: 100%;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`

// プロジェクトカラム
const ProjectColumn = styled.div`
  flex: 1;
  min-width: 0;
`

// プロジェクトカード（共通）
const ProjectCard = styled(Card)`
  height: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  background: white;
  border: 1px solid #e8e8e8;
  
  .ant-card-body {
    padding: 24px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }
`

// 進行中プロジェクトカード
const ActiveProjectCard = styled(ProjectCard)`
  border: 2px solid #52c41a;
  background: linear-gradient(145deg, #ffffff 0%, #f9fff9 100%);
  box-shadow: 0 4px 20px rgba(82, 196, 26, 0.15);
`

// アーカイブプロジェクトカード
const ArchivedProjectCard = styled(ProjectCard)`
  border: 1px solid #d9d9d9;
  background: #fafafa;
  opacity: 0.8;
`

// プロジェクトタイトルコンテナ
const ProjectTitleContainer = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 2px solid #f0f0f0;
`

// プロジェクトタイトル
const ProjectTitle = styled(Title)`
  margin: 0;
  color: #252525;
  flex: 1;
`

// バッジスタイル
const ActiveBadge = styled(Badge)`
  .ant-badge-status-dot {
    width: 8px;
    height: 8px;
  }
`

const ArchivedBadge = styled(Badge)`
  .ant-badge-status-dot {
    width: 8px;
    height: 8px;
  }
`

// プロジェクトリストコンテナ
const ProjectListContainer = styled.div`
  flex: 1;
  overflow-y: auto;
`

// 進行中プロジェクトリストアイテム（クリック可能）
const ActiveProjectListItem = styled.div`
  padding: 16px 12px;
  border-bottom: 1px solid #f5f5f5;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
  
  &:hover {
    background-color: #f0f9ff;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(24, 144, 255, 0.15);
  }
`

// アーカイブプロジェクトリストアイテム（クリック不可）
const ArchivedProjectListItem = styled.div`
  padding: 12px;
  border-bottom: 1px solid #f5f5f5;
  border-radius: 6px;
  margin-bottom: 6px;
  
  &:last-child {
    border-bottom: none;
    margin-bottom: 0;
  }
`

// プロジェクトアイテム
const ProjectItem = styled.div`
  width: 100%;
`

// プロジェクトヘッダー（名前とページ数）
const ProjectHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
`

// 進行中プロジェクト名（目立つスタイル）
const ActiveProjectName = styled.div`
  font-weight: 600;
  font-size: 1.1rem;
  color: #1a1a1a;
  flex: 1;
  line-height: 1.4;
  letter-spacing: 0.5px;
  margin-right: 16px;
  padding-right: 8px;
`

// アーカイブプロジェクト名（控えめなスタイル）
const ArchivedProjectName = styled.div`
  font-weight: 400;
  font-size: 1rem;
  color: #595959;
  flex: 1;
  line-height: 1.4;
  text-decoration: line-through;
  opacity: 0.85;
  margin-right: 16px;
  padding-right: 8px;
`

// ページ数コンテナ（共通）
const ProjectPageCountContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 70px;
`

const ArchivedProjectPageCountContainer = styled(ProjectPageCountContainer)`
  opacity: 0.8;
`

// 進行中プロジェクトページ数
const ProjectPageCount = styled.div`
  font-size: 0.8rem;
  color: #1890ff;
  font-weight: 500;
  padding: 1px 6px;
  background-color: #e6f7ff;
  border-radius: 8px;
  border: 1px solid #91d5ff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`

// アーカイブプロジェクトページ数
const ArchivedProjectPageCount = styled.div`
  font-size: 0.8rem;
  color: #595959;
  font-weight: 400;
  padding: 1px 6px;
  background-color: #fafafa;
  border-radius: 8px;
  border: 1px solid #d9d9d9;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
`

// 月ラベル
const MonthLabel = styled.span`
  font-size: 0.75rem;
  opacity: 0.8;
`

// 進行中プロジェクト会社名
const ProjectCompany = styled(Text)`
  font-size: 0.95rem;
  color: #595959;
  font-weight: 400;
`

// アーカイブプロジェクト会社名
const ArchivedProjectCompany = styled(Text)`
  font-size: 0.9rem;
  color: #8c8c8c;
  font-weight: 400;
`

// 空の状態
const EmptyState = styled(Text)`
  text-align: center;
  padding: 48px 24px;
  display: block;
`