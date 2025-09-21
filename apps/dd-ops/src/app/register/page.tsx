'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { UserOutlined, LockOutlined, TeamOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import Link from 'next/link'
import { Form } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Title, Text } from '@/components/ui/Typography'
import { Radio } from '@/components/ui/Radio'
import { Space } from '@/components/ui/Space'
import { Divider } from '@/components/ui/Divider'
import { notification } from '@/components/ui/notification'

interface Workspace {
  id: number
  name: string
  _count: {
    projects: number
  }
}

/**
 * User registration page component
 * @returns JSX element
 */
export default function RegisterPage() {
  const [form] = Form.useForm()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [hasAccessibleWorkspaces, setHasAccessibleWorkspaces] = useState(false)
  const router = useRouter()

  /**
   * Fetch available workspaces on component mount
   */
  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const response = await fetch('/api/workspace')
        if (response.ok) {
          const data = await response.json()
          setWorkspaces(data.workspaces || [])
          
          // 参加可能なワークスペースの有無をチェック
          if (data.workspaces && data.workspaces.length > 0) {
            setHasAccessibleWorkspaces(true)
            notification.success({
              message: 'ワークスペースが見つかりました',
              description: 'あなたの環境で参加できるワークスペースが見つかりました',
              placement: 'topRight'
            })
          } else {
            setHasAccessibleWorkspaces(false)
            notification.warning({
              message: 'ワークスペースが見つかりません',
              description: '参加できるワークスペースが見つかりませんでした',
              placement: 'topRight'
            })
          }
        }
      } catch (error) {
        console.error('Failed to fetch workspaces:', error)
      }
    }
    fetchWorkspaces()
  }, [])

  /**
   * Handle form submission for user registration
   * @param values - Form values containing user and workspace information
   */
  const handleSubmit = async (values: any) => {
    setIsLoading(true)
    setError('')

    try {
      const payload: any = {
        email: values.email,
        password: values.password,
        workspaceId: values.workspaceId
      }

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const data = await response.json()

      if (response.ok) {
        // ユーザー登録成功時の処理
        router.push('/login')
      } else {
        setError(data.error || 'ユーザー登録に失敗しました')
      }
    } catch (error) {
      setError('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <RegisterContainer>
      <RegisterCard>
        <StyledTitle level={2}>ユーザー登録</StyledTitle>
        
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
            name="email"
            label="メールアドレス"
            rules={[
              { required: true, message: 'メールアドレスを入力してください' },
              { type: 'email', message: '有効なメールアドレスを入力してください' }
            ]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="メールアドレス"
              type="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            label="パスワード"
            rules={[
              { required: true, message: 'パスワードを入力してください' },
              { min: 6, message: 'パスワードは6文字以上で入力してください' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード"
            />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="パスワード確認"
            dependencies={['password']}
            rules={[
              { required: true, message: 'パスワード確認を入力してください' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve()
                  }
                  return Promise.reject(new Error('パスワードが一致しません'))
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード確認"
            />
          </Form.Item>

          {hasAccessibleWorkspaces && (
            <>
              <Divider>ワークスペース設定</Divider>
              
              <WorkspaceSection>
                <StyledSpace direction="vertical">
                  <WorkspaceHeader>
                    <TeamOutlined /> 参加するワークスペースを選択
                  </WorkspaceHeader>
                  
                  <Form.Item
                    name="workspaceId"
                    rules={[
                      { required: true, message: 'ワークスペースを選択してください' }
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <StyledRadioGroup>
                      {workspaces.map((workspace) => (
                        <StyledRadio key={workspace.id} value={workspace.id}>
                          <div>
                            <Text strong>{workspace.name}</Text>
                            <br />
                            <WorkspaceMetaText type="secondary">
                              {workspace._count.projects} プロジェクト
                            </WorkspaceMetaText>
                          </div>
                        </StyledRadio>
                      ))}
                    </StyledRadioGroup>
                  </Form.Item>
                </StyledSpace>
              </WorkspaceSection>
            </>
          )}

          <Form.Item>
            <RegisterButton
              type="primary"
              htmlType="submit"
              loading={isLoading}
              disabled={!hasAccessibleWorkspaces}
            >
              ユーザー登録
            </RegisterButton>
          </Form.Item>
        </Form>

        <LoginLinkContainer>
          <Text type="secondary">
            すでにアカウントをお持ちの方は{' '}
            <Link href="/login">
              <Text type="secondary" underline>
                こちら
              </Text>
            </Link>
          </Text>
        </LoginLinkContainer>
      </RegisterCard>
    </RegisterContainer>
  )
}

// ユーザー登録ページ全体のコンテナ
const RegisterContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #9A9A9A;
  padding: 20px;
`

// ユーザー登録カードのスタイル
const RegisterCard = styled(Card)`
  width: 100%;
  max-width: 500px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  background: #FAFAFA;
  
  .ant-card-body {
    padding: 32px;
    overflow: hidden;
    max-height: 90vh;
    overflow-y: auto;
  }
`

// ワークスペース選択エリア
const WorkspaceSection = styled.div`
  background: #FAFAFA;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
  border: 1px solid #9A9A9A;
`

// タイトルのスタイル
const StyledTitle = styled(Title)`
  text-align: center;
  margin-bottom: 32px;
  color: #252525;
`

// ログインリンクのコンテナ
const LoginLinkContainer = styled.div`
  text-align: center;
  margin-top: 16px;
`

// エラーアラートのスタイル
const StyledAlert = styled(Alert)`
  margin-bottom: 16px;
`

// 登録ボタンのスタイル
const RegisterButton = styled(Button)`
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
  
  &:disabled {
    background-color: #9A9A9A !important;
    border-color: #9A9A9A !important;
    opacity: 0.5;
  }
`

// スペースのスタイル
const StyledSpace = styled(Space)`
  width: 100%;
`

// ワークスペースヘッダー
const WorkspaceHeader = styled.div`
  margin-bottom: 8px;
  color: #252525;
`

// ラジオグループのスタイル
const StyledRadioGroup = styled(Radio.Group)`
  width: 100%;
  
  .ant-radio-wrapper {
    display: block;
    margin-bottom: 8px;
    padding: 8px;
    border-radius: 4px;
    
    &:hover {
      background: #9A9A9A;
      .ant-radio-wrapper-checked {
        background: #252525;
        color: #FAFAFA;
      }
    }
  }
`

// スタイル付きラジオボタン
const StyledRadio = styled(Radio)`
  display: block;
  padding: 8px 12px;
  background: #FAFAFA;
  border: 1px solid #9A9A9A;
  border-radius: 6px;
  margin: 4px 0;
  
  &:hover {
    border-color: #252525;
  }
  
  &.ant-radio-wrapper-checked {
    background: #252525;
    border-color: #252525;
    color: #FAFAFA;
    
    .ant-typography {
      color: #FAFAFA;
    }
  }
`

// ワークスペースメタ情報テキスト
const WorkspaceMetaText = styled(Text)`
  font-size: 12px;
`