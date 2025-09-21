'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import Link from 'next/link'
import { isY2d2Subdomain } from '@/utils/subdomain'
import { Form } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'
import { Title, Text } from '@/components/ui/Typography'

/**
 * Login page component
 * @returns JSX element
 */
function LoginPageContent() {
  const [form] = Form.useForm()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // URLパラメータからエラー情報を取得
  const errorParam = searchParams.get('error')
  const initialError = errorParam === 'ip_restricted' 
    ? 'このIPアドレスからのアクセスは許可されていません。管理者にお問い合わせください。' 
    : ''
  
  // サブドメインに基づいてリダイレクト先を決定
  const getRedirectPath = () => {
    const redirect = searchParams.get('redirect')
    if (redirect) return redirect
    
    // y2d2サブドメインの場合は/administratorにリダイレクト
    if (typeof window !== 'undefined' && isY2d2Subdomain(window.location.hostname)) {
      return '/administrator'
    }
    
    return '/'
  }
  
  const redirectPath = getRedirectPath()

  /**
   * Handle form submission for login
   * @param values - Form values containing email and password
   */
  const handleSubmit = async (values: unknown) => {
    const typedValues = values as { email: string; password: string }
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(typedValues),
      })

      const data = await response.json()

      if (response.ok) {
        // ログイン成功時の処理 - リダイレクト先に移動
        router.push(redirectPath)
      } else {
        setError(data.error || 'ログインに失敗しました')
      }
    } catch (error) {
      setError('ネットワークエラーが発生しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoginContainer>
      <LoginCard>
        <StyledTitle level={2}>ログイン</StyledTitle>
        
        {(error || initialError) && (
          <StyledAlert
            message={error || initialError}
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
              { required: true, message: 'パスワードを入力してください' }
            ]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="パスワード"
            />
          </Form.Item>

          <Form.Item>
            <LoginButton
              type="primary"
              htmlType="submit"
              loading={isLoading}
            >
              ログイン
            </LoginButton>
          </Form.Item>
        </Form>

        <RegisterLinkContainer>
          <Text type="secondary">
            アカウントをお持ちでない方は{' '}
            <Link href="/register">
              <Text type="secondary" underline>
                こちら
              </Text>
            </Link>
          </Text>
        </RegisterLinkContainer>
      </LoginCard>
    </LoginContainer>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <LoginContainer>
        <LoginCard>
          <LoadingText>
            ページを読み込み中...
          </LoadingText>
        </LoginCard>
      </LoginContainer>
    }>
      <LoginPageContent />
    </Suspense>
  )
}

// ログインページ全体のコンテナ
const LoginContainer = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #9A9A9A;
  padding: 20px;
`

// ログインカードのスタイル
const LoginCard = styled(Card)`
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  background: #FAFAFA;
  
  .ant-card-body {
    padding: 32px;
  }
`

// タイトルのスタイル
const StyledTitle = styled(Title)`
  text-align: center;
  margin-bottom: 32px;
  color: #252525;
`

// 登録リンクのコンテナ
const RegisterLinkContainer = styled.div`
  text-align: center;
  margin-top: 16px;
`

// エラーアラートのスタイル
const StyledAlert = styled(Alert)`
  margin-bottom: 16px;
`

// ログインボタンのスタイル
const LoginButton = styled(Button)`
  width: 100%;
  background-color: #252525 !important;
  border-color: #252525 !important;
  
  &:hover {
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

// ローディングテキストのスタイル
const LoadingText = styled.div`
  text-align: center;
  color: #252525;
`