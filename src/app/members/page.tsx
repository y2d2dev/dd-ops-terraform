'use client'

import { useState, useEffect, Suspense } from 'react'
import { UserOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { Spin } from 'antd'
import AppLayout from '@/components/layout/AppLayout'
import { Card } from '@/components/ui/Card'
import { Title, Text } from '@/components/ui/Typography'
import { List } from '@/components/ui/List'
import { Avatar } from '@/components/ui/Avatar'

interface User {
  id: number
  email: string
}

function MembersContent() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // メンバー一覧を取得
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch('/api/users')
        if (response.ok) {
          const data = await response.json()
          setUsers(data.users || [])
        }
      } catch (error) {
        console.error('Failed to fetch users:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  return (
    <AppLayout>
      <MembersContainer>
        <StyledCard
          title={
            <CardTitle>
              <UserOutlined />
              メンバー一覧
            </CardTitle>
          }
        >
          <CardContent>
            <ScrollableList>
              <List
                loading={loading}
                dataSource={users}
                renderItem={(user) => (
                  <StyledListItem>
                    <List.Item.Meta
                      avatar={
                        <StyledAvatar 
                          size="large"
                          icon={<UserOutlined />}
                        />
                      }
                      title={
                        <UserName>
                          {user.email.split('@')[0]}
                        </UserName>
                      }
                      description={
                        <UserEmail>
                          {user.email}
                        </UserEmail>
                      }
                    />
                  </StyledListItem>
                )}
                locale={{ emptyText: 'メンバーがいません' }}
              />
            </ScrollableList>
          </CardContent>
        </StyledCard>
      </MembersContainer>
    </AppLayout>
  )
}

export default function MembersPage() {
  return (
    <Suspense fallback={
      <LoadingContainer>
        <Spin size="large" tip="Loading..." />
      </LoadingContainer>
    }>
      <MembersContent />
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

// メンバーページコンテナ
const MembersContainer = styled.div`
  height: 100%;
  overflow: hidden;
`

// カードのスタイル
const StyledCard = styled(Card)`
  height: 100%;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  
  .ant-card-body {
    height: calc(100% - 57px);
    overflow: hidden;
    display: flex;
    flex-direction: column;
    padding: 0;
  }
`

// カードタイトルのスタイル
const CardTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  
  .anticon {
    color: #1890ff;
  }
`

// カードコンテンツのスタイル
const CardContent = styled.div`
  height: 100%;
  overflow: hidden;
  padding: 16px;
`

// スクロール可能リストコンテナ
const ScrollableList = styled.div`
  height: 100%;
  overflow: hidden;
  
  .ant-list {
    height: 100%;
  }
  
  .ant-list-items {
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 8px;
    
    /* カスタムスクロールバー */
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
  }
`

// リストアイテムのスタイル
const StyledListItem = styled(List.Item)`
  padding: 16px 8px;
  border-bottom: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  border-radius: 8px;
  margin-bottom: 4px;
  
  &:hover {
    background-color: #f8f9fa;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }
  
  &:last-child {
    border-bottom: none;
  }
`

// アバターのスタイル
const StyledAvatar = styled(Avatar)`
  background-color: #1890ff;
  box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
`

// ユーザー名のスタイル
const UserName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
`

// ユーザーメールのスタイル
const UserEmail = styled.div`
  font-size: 14px;
  color: #6b7280;
`