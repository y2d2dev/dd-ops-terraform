'use client'

import { useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { PlusOutlined, ProjectOutlined, BankOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { Spin } from 'antd'
import AppLayout from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Title } from '@/components/ui/Typography'
import { Form } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { Space } from '@/components/ui/Space'
import { useQueryState } from 'nuqs'

const { TextArea } = Input

function CreateProjectContent() {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const [userId] = useQueryState('userId', {
    parse: (value) => {
      try {
        return JSON.parse(value as string)
      } catch {
        return null
      }
    },
    serialize: (value) => JSON.stringify(value),
  })

  /**
   * Handle form submission for project creation
   * @param values - Form values containing project information
   */
  const handleSubmit = async (values: any) => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values
        }),
      })

      const data = await response.json()

      if (response.ok) {
        // プロジェクト作成成功時の処理
        router.push(`/project/${data.project.id}`)
      } else {
        setError(data.error || 'プロジェクトの作成に失敗しました')
      }
    } catch (error) {
      setError('ネットワークエラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppLayout>
      <CreateProjectContainer>
        <FormCard
          title={
            <TitleSpace>
              <PlusOutlined />
              <PageTitle level={3}>
                新しいプロジェクトを作成
              </PageTitle>
            </TitleSpace>
          }
        >
          {error && (
            <StyledAlert
              message={error}
              type="error"
              showIcon
            />
          )}

          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="name"
              label="プロジェクト名"
              rules={[
                { required: true, message: 'プロジェクト名を入力してください' },
                { min: 2, message: 'プロジェクト名は2文字以上で入力してください' }
              ]}
            >
              <Input
                prefix={<ProjectOutlined />}
                placeholder="プロジェクト名を入力"
              />
            </Form.Item>

            <Form.Item
              name="targetCompany"
              label="対象会社"
              rules={[
                { required: true, message: '対象会社を入力してください' }
              ]}
            >
              <Input
                prefix={<BankOutlined />}
                placeholder="対象会社名を入力"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="プロジェクト説明（任意）"
            >
              <TextArea
                rows={4}
                placeholder="プロジェクトの説明を入力（任意）"
              />
            </Form.Item>

            <SubmitFormItem>
              <CreateButton
                type="primary"
                htmlType="submit"
                loading={loading}
                size="large"
              >
                プロジェクトを作成
              </CreateButton>
            </SubmitFormItem>
          </Form>
        </FormCard>
      </CreateProjectContainer>
    </AppLayout>
  )
}

export default function CreateProjectPage() {
  return (
    <Suspense fallback={
      <LoadingContainer>
        <Spin size="large" tip="Loading..." />
      </LoadingContainer>
    }>
      <CreateProjectContent />
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

// プロジェクト作成ページコンテナ
const CreateProjectContainer = styled.div`
  height: 100%;
  overflow: hidden;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 40px;
  background: #FAFAFA;
`

// フォームカードのスタイル
const FormCard = styled(Card)`
  width: 100%;
  max-width: 600px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  background: #FAFAFA;
  border: 1px solid #9A9A9A;
  
  .ant-card-body {
    padding: 32px;
  }
  
  .ant-card-head {
    border-bottom: 1px solid #9A9A9A;
  }
`

// タイトルスペース
const TitleSpace = styled(Space)`
  color: #252525;
  
  .anticon {
    color: #252525;
  }
`

// ページタイトル
const PageTitle = styled(Title)`
  margin: 0 !important;
  color: #252525;
  line-height: 1.5;
`

// エラーアラート
const StyledAlert = styled(Alert)`
  margin-bottom: 24px;
`

// 送信フォームアイテム
const SubmitFormItem = styled(Form.Item)`
  margin-top: 32px;
`

// 作成ボタン
const CreateButton = styled(Button)`
  width: 100%;
  background-color: #252525 !important;
  border-color: #252525 !important;
  
  &:hover:not(:disabled) {
    background-color: #9A9A9A !important;
    border-color: #9A9A9A !important;
  }
  
  &:focus {
    background-color: #252525 !important;
    border-color: #252525 !important;
  }
  
  &:active {
    background-color: #9A9A9A !important;
    border-color: #9A9A9A !important;
  }
`