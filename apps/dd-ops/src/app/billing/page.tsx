'use client'

import React, { useState, useMemo, useEffect, Suspense } from 'react'
import { DollarOutlined, CalendarOutlined, ProjectOutlined, FileTextOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { Spin } from 'antd'
import AppLayout from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Title, Text } from '@/components/ui/Typography'
import { Select } from '@/components/ui/Select'
import { Space } from '@/components/ui/Space'
import { Table } from '@/components/ui/Table'

import { Tooltip } from '@/components/ui/Tooltip'
import { useQueryState } from 'nuqs'
import { billingFetcher } from '@/lib/swr/fetchers'
import useSWR from 'swr'
import { Alert } from 'antd'


// 料金計算結果の型
interface ProjectBilling {
  project: ProjectWithOcrCount
  basicFee: number
  pageFee: number
  pageCount: number
  totalFee: number
}

interface MonthlyBilling {
  totalAmount: number
  activeProjectCount: number
  projectCreators: string[]
  projectBillings: ProjectBilling[]
}

// API レスポンスの型
interface ProjectWithOcrCount {
  id: number
  name: string
  description: string
  targetCompany: string
  user: {
    id: number
    name: string
    email: string
  }
  ocrPageCount: {
    id: number
    pageCount: number
    createdAt: string
  }[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}


function BillingContent() {
  // URLパラメータから取得（今回はモック使用）
  const [userId] = useQueryState('userId')
  const [workspaceId] = useQueryState('workspaceId')

  // 選択された月の状態（今月をデフォルトに）
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return now.toISOString().slice(0, 7) // YYYY-MM
  })


  // API呼び出し関数
  const { data: billingData, error: billingError, isLoading: billingLoading } = useSWR(
    workspaceId ? ['/api/billing', selectedMonth, workspaceId, userId] : null,
    ([url, yearMonth, wsId, uId]) => billingFetcher(url, {
      workspaceId: parseInt(wsId?.toString() || '0'),
      userId: parseInt(uId?.toString() || '0'),
      yearMonth
    }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0
    }
  )
  console.log(billingData)

  // 月選択用のオプション（過去3ヶ月）
  const monthOptions = useMemo(() => {
    const options = []
    const now = new Date()

    for (let i = 0; i < 3; i++) {
      const year = now.getFullYear()
      const month = now.getMonth() - i

      // 月が負の値になった場合の処理
      const adjustedYear = month < 0 ? year - 1 : year
      const adjustedMonth = month < 0 ? month + 12 : month

      const yearMonth = `${adjustedYear}-${String(adjustedMonth + 1).padStart(2, '0')}`
      const label = `${adjustedYear}年${adjustedMonth + 1}月`

      options.push({
        value: yearMonth,
        label: label
      })
    }

    return options
  }, [])

  // 月選択変更ハンドラ
  const handleMonthChange = (newMonth: string) => {
    setSelectedMonth(newMonth)
    console.log(newMonth)
  }

  // 超過単価を計算する関数
  const getPageOverageRate = (projectCount: number): number => {
    if (projectCount === 1) return 990
    if (projectCount === 2) return 970
    if (projectCount === 3) return 890
    if (projectCount === 4) return 790
    return 690 // 5PJ以上
  }

  // APIデータから料金情報を計算
  const monthlyBilling: MonthlyBilling = useMemo(() => {
    if (!billingData) {
      // APIデータがない場合はモックデータを使用
      const targetMonth = selectedMonth

      if (!billingData) return {
        totalAmount: 0,
        activeProjectCount: 0,
        projectCreators: [],
        projectBillings: []
      }

      const activeProjects = billingData.projects.filter((project: ProjectWithOcrCount) => {
        if (project.isActive) return true

        const deletedMonth = new Date(project.updatedAt).toISOString().slice(0, 7)
        return deletedMonth !== targetMonth
      })

      const activeProjectCount = activeProjects.length
      const projectCreators = activeProjects.map((project: ProjectWithOcrCount) => project.user.email)

      const projectBillings: ProjectBilling[] = activeProjects.map((project: ProjectWithOcrCount) => {
        const basicFee = 70000
        const monthlyPageCount = project.ocrPageCount.reduce((sum: number, count: any) => sum + count.pageCount, 0)

        let pageFee = 0
        if (monthlyPageCount > 0) {
          if (monthlyPageCount <= 200) {
            pageFee = 80000
          } else {
            const overagePages = monthlyPageCount - 200
            const overageRate = getPageOverageRate(activeProjectCount)
            pageFee = 80000 + (overagePages * overageRate)
          }
        }

        return {
          project,
          basicFee,
          pageFee,
          pageCount: monthlyPageCount,
          totalFee: basicFee + pageFee
        }
      })

      const totalAmount = projectBillings.reduce((sum, billing) => sum + billing.totalFee, 0)

      return {
        totalAmount,
        activeProjectCount,
        projectCreators,
        projectBillings
      }
    }

    // APIデータを使用
    const projectCreators = billingData.projects.map((project: ProjectWithOcrCount) => project.user.email)

    const projectBillings: ProjectBilling[] = billingData.projects.map((project: ProjectWithOcrCount) => {
      const basicFee = 70000
      const monthlyPageCount = project.ocrPageCount.reduce((sum: number, count: any) => sum + count.pageCount, 0)

      let pageFee = 0
      if (monthlyPageCount > 0) {
        if (monthlyPageCount <= 200) {
          pageFee = 80000
        } else {
          const overagePages = monthlyPageCount - 200
          const overageRate = getPageOverageRate(billingData.activeProjectCount)
          pageFee = 80000 + (overagePages * overageRate)
        }
      }

      return {
        project: project,
        basicFee,
        pageFee,
        pageCount: monthlyPageCount,
        totalFee: basicFee + pageFee
      }
    })
    const totalAmount = billingData.amount.projectBasePrice + billingData.amount.ocrPagePrice + billingData.amount.excessPrice

    return {
      totalAmount,
      activeProjectCount: billingData.activeProjectCount,
      projectCreators,
      projectBillings
    }
  }, [selectedMonth, billingData])

  // 表カラム定義
  const columns = [
    {
      title: 'プロジェクト名',
      dataIndex: 'project',
      key: 'projectName',
      render: (project: any) => (
        <Space>
          <ProjectOutlined />
          <span style={{ fontWeight: 600 }}>{project.name}</span>
        </Space>
      ),
    },
    {
      title: '作成者',
      dataIndex: 'project',
      key: 'creator',
      render: (project: any) => (
        <span>{project.user.email}</span>
      ),
    },
    {
      title: '基本料金',
      dataIndex: 'basicFee',
      key: 'basicFee',
      render: (fee: number) => (
        // ページ数が1ページ以上なら¥80,000固定、1ページ未満なら¥0
        <span>¥{fee.toLocaleString()}</span>
      ),
    },
    {
      title: (
        <Tooltip title="1-200ページ: ¥80,000固定 / 201ページ以上: ¥80,000 + 超過分×単価">
          AI解析料金
        </Tooltip>
      ),
      dataIndex: 'pageFee',
      key: 'pageFee',
      render: (fee: number, record: any) => (
        <Space direction="vertical" size={0}>
          <span>¥{fee.toLocaleString()}</span>
          {record.pageCount > 200 && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              超過{record.pageCount - 200}ページ × ¥{getPageOverageRate(monthlyBilling.activeProjectCount)}
            </Text>
          )}
        </Space>
      ),
    },
    {
      title: '合計',
      dataIndex: 'totalFee',
      key: 'totalFee',
      render: (fee: number) => (
        <span style={{ fontWeight: 600 }}>¥{fee.toLocaleString()}</span>
      ),
    },
  ]

  return (
    <AppLayout>
      <BillingContainer>
        <BillingHeader>
          <Space align="center" size={16}>
            <DollarOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={2} style={{ margin: 0 }}>お支払い金額</Title>
          </Space>

          <MonthSelector>
            <Space align="center">
              <CalendarOutlined />
              <Text>対象月:</Text>
              <Select
                value={selectedMonth}
                onChange={handleMonthChange}
                options={monthOptions}
                style={{ width: 150 }}
              />
            </Space>
          </MonthSelector>
        </BillingHeader>

        <SummarySection>
          <InfoCard
            title={
              <Space>
                <ProjectOutlined style={{ color: '#1890ff' }} />
                <span>アクティブプロジェクト</span>
              </Space>
            }
          >
            <InfoValue>{monthlyBilling.activeProjectCount}件</InfoValue>
            <Text type="secondary">
              進行中のプロジェクト数
            </Text>
          </InfoCard>

          <InfoCard
            title={
              <Space>
                <DollarOutlined style={{ color: '#595959' }} />
                <span>合計請求額</span>
              </Space>
            }
          >
            <InfoValue style={{ color: '#595959' }}>¥{monthlyBilling.totalAmount.toLocaleString()}</InfoValue>
            <Text type="secondary">
              基本料金 + AI解析料金の合計
            </Text>
          </InfoCard>
        </SummarySection>

        {/* Add a styled alert for billing reflection time */}
        <Alert
          message="お知らせ"
          description="お支払い金額の反映に時間がかかる場合がございます。"
          type="info"
          showIcon
          style={{ marginBottom: '16px' }}
        />

        <DetailSection>
          <DetailCard
            title={
              <Space>
                <FileTextOutlined />
                <span>プロジェクト別詳細</span>
                <Tooltip title={`超過ページ単価: ¥${getPageOverageRate(monthlyBilling.activeProjectCount)}/ページ（${monthlyBilling.activeProjectCount}プロジェクトベース）`}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>(超過単価情報)</Text>
                </Tooltip>
              </Space>
            }
          >
            <Table
              columns={columns}
              dataSource={monthlyBilling.projectBillings}
              rowKey={(record: any) => record.project.id.toString()}
              pagination={false}
              summary={() => (
                <Table.Summary.Row style={{ backgroundColor: '#fafafa' }}>
                  <Table.Summary.Cell index={0} colSpan={2}>
                    <Text strong>合計</Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={2}>
                    <Text strong>
                      ¥{monthlyBilling.projectBillings.reduce((sum, billing) => sum + billing.basicFee, 0).toLocaleString()}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={3}>
                    <Text strong>
                      ¥{monthlyBilling.projectBillings.reduce((sum, billing) => sum + billing.pageFee, 0).toLocaleString()}
                    </Text>
                  </Table.Summary.Cell>
                  <Table.Summary.Cell index={4}>
                    <Text strong>
                      ¥{monthlyBilling.totalAmount.toLocaleString()}
                    </Text>
                  </Table.Summary.Cell>
                </Table.Summary.Row>
              )}
            />
          </DetailCard>
        </DetailSection>
      </BillingContainer>
    </AppLayout>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <LoadingContainer>
        <Spin size="large" tip="Loading..." />
      </LoadingContainer>
    }>
      <BillingContent />
    </Suspense>
  )
}

// スタイル定義
const LoadingContainer = styled.div`
  height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: #FAFAFA;
`

const BillingContainer = styled.div`
  height: 100%;
  overflow-y: auto;
  padding: 24px;
  background: #FAFAFA;
`

const BillingHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
`

const MonthSelector = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const SummarySection = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
`

const InfoCard = styled(Card)`
  text-align: center;
  
  .ant-card-body {
    padding: 24px;
  }
`

const DetailCard = styled(Card)`
  .ant-card-body {
    padding: 24px;
  }
`

const InfoValue = styled.div`
  font-size: 24px;
  font-weight: bold;
  color: #1890ff;
  margin: 16px 0 8px 0;
`



const DetailSection = styled.div`
  margin-bottom: 24px;
`