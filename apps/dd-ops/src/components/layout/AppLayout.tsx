'use client'

import React, { FC, ReactNode, useState } from 'react'
import {
  HomeOutlined,
  LeftOutlined,
  RightOutlined,
  TagOutlined,
  TagsOutlined,
  PlusOutlined,
  UserOutlined,
  LogoutOutlined,
  WarningOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import Link from 'next/link'
import { Layout, Menu, theme, Dropdown, Avatar, Tooltip } from 'antd'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import { fetcher, authFetcher } from '@/lib/swr/fetchers'
import { logout } from '@/lib/auth'
import { Button } from '@/components/ui/Button'
import { useQueryState } from 'nuqs'

const { Header, Sider, Content } = Layout

interface Project {
  id: number
  name: string
  description?: string
  createdAt: string
  deletedAt?: string | null
}

/**
 * Main application layout with sidebar navigation
 * @param children - Child components to render in the content area
 * @returns JSX element
 */
const AppLayout: FC<{ children: ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [openKeys, setOpenKeys] = useState<string[]>(['4']) // プロジェクトタブを常に開く
  const pathname = usePathname()
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  // プロジェクト一覧をSWRで取得
  const { data: projectsData, error: projectsError, isLoading: loadingProjects } = useSWR(
    '/api/projects',
    fetcher
  )

  // ユーザー情報を取得（認証エラー時は自動でログインページにリダイレクト）
  const { data: userData } = useSWR('/api/auth/me', authFetcher)

  const [userId, setUserId] = useQueryState('userId', {
    parse: (value) => {
      if (!value) return null
      return parseInt(value, 10)
    },
    serialize: (value) => {
      return value?.toString()
    }
  })
  const [workspaceId, setWorkspaceId] = useQueryState('workspaceId', {
    parse: (value) => {
      if (!value) return null
      return parseInt(value, 10)
    },
    serialize: (value) => {
      return value?.toString()
    }
  })

  // userDataが取得できたらQueryStateを更新
  React.useEffect(() => {
    if (userData?.user) {
      setUserId(userData.user.id)
    }
    if (userData?.workspace) {
      setWorkspaceId(userData.workspace.id)
    }
  }, [userData, setUserId, setWorkspaceId])

  const projects = projectsData?.projects || []

  /**
   * Get menu key based on current pathname
   * @param path - Current pathname
   * @returns Menu key string
   */
  const getKey = (path: string): string => {
    if (path === '/') return '0'
    if (path.startsWith('/members')) return '1'
    if (path.startsWith('/create-project')) return '2'
    if (path.startsWith('/risks')) return '3'
    if (path.startsWith('/billing')) return '5'
    if (path.startsWith('/project/')) {
      const projectId = path.split('/')[2]
      return `project-${projectId}`
    }
    return '0'
  }

  // 現在のパスに基づいてメニューキーを取得
  const selectedKeys = [getKey(pathname)]

  // ユーザーメニューのアイテム
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'ログアウト',
      onClick: logout,
    },
  ]

  return (
    <Layout style={{ height: '100vh', overflow: 'hidden' }}>
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        style={{
          background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
        }}
      >
        <div style={{
          height: '32px',
          margin: '16px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 'bold'
        }}>
          {collapsed ? 'DD' : 'DD-OPS'}
        </div>
        <style jsx>{`
          :global(.ant-menu-dark) {
            background: transparent !important;
          }
          :global(.ant-menu-dark .ant-menu-item) {
            color: #ffffff !important;
          }
          :global(.ant-menu-dark .ant-menu-submenu-title) {
            color: #ffffff !important;
          }
          :global(.ant-menu-dark .ant-menu-submenu .ant-menu-item) {
            color: #ffffff !important;
          }
          :global(.ant-menu-item-selected) {
            background: transparent !important;
          }
          :global(.ant-menu-item-selected::after) {
            display: none !important;
          }
        `}</style>
        <Menu
          mode="inline"
          selectedKeys={[]}
          openKeys={openKeys}
          onOpenChange={setOpenKeys}
          style={{
            background: 'transparent',
            border: 'none',
          }}
          theme="dark"
          items={[
            {
              key: '0',
              icon: <HomeOutlined />,
              label: <Link href="/">ホーム</Link>,
            },
            {
              key: '1',
              icon: <UserOutlined />,
              label: <Link href="/members">メンバー</Link>,
            },
            {
              key: '2',
              icon: <PlusOutlined />,
              label: <Link href="/create-project">プロジェクト作成</Link>,
            },
            {
              key: '3',
              icon: <WarningOutlined />,
              label: <Link href="/risks">リスク項目</Link>,
            },
            {
              key: '5',
              icon: <DollarOutlined />,
              label: <Link href="/billing">お支払い金額</Link>,
            },
            {
              key: '4',
              icon: <TagsOutlined />,
              label: 'プロジェクト',
              children: loadingProjects
                ? [{ key: 'loading', label: '読み込み中...' }]
                : projectsError
                  ? [{ key: 'error', label: '取得エラー' }]
                  : projects.length === 0
                    ? [{ key: 'no-projects', label: 'プロジェクトなし' }]
                    : projects
                      .filter((project: Project) => !project.deletedAt)  // 論理削除されていないプロジェクトのみ表示
                      .map((project: Project) => ({
                        key: `project-${project.id}`,
                        icon: <TagOutlined />,
                        label: (
                          <Tooltip title={project.name} placement="right">
                            <Link href={`/project/${project.id}`} style={{
                              display: 'block',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              maxWidth: collapsed ? '120px' : '180px'
                            }}>
                              {project.name}
                            </Link>
                          </Tooltip>
                        ),
                      })),
            },
          ]}
        />
      </Sider>
      <Layout>
        <Header style={{ padding: 0, background: colorBgContainer, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            type="text"
            icon={collapsed ? <RightOutlined /> : <LeftOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{
              fontSize: '16px',
              width: 64,
              height: 64,
            }}
          />

          {/* ユーザー情報とログアウトメニュー */}
          <div style={{ paddingRight: '24px' }}>
            {userId && (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                arrow
              >
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Avatar icon={<UserOutlined />} />
                  <span>{userData?.user?.email}</span>
                </div>
              </Dropdown>
            )}
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            overflow: 'hidden',
          }}
        >
          <div style={{
            height: '100%',
            overflow: 'auto',
            paddingRight: '8px'
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default AppLayout