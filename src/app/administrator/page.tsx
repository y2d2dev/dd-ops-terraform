'use client'

import { useEffect, useState, useMemo } from 'react'
import { TeamOutlined, FileTextOutlined, BarChartOutlined, EditOutlined, SaveOutlined, PlusOutlined, DeleteOutlined, SearchOutlined, CopyOutlined } from '@ant-design/icons'
import styled from 'styled-components'
import { isY2d2Subdomain } from '@/utils/subdomain'
import { Card } from '@/components/ui/Card'
import { Title, Paragraph, Text } from '@/components/ui/Typography'
import { Button } from '@/components/ui/Button'
import { Space } from '@/components/ui/Space'
import { Table } from '@/components/ui/Table'
import { Tag } from '@/components/ui/Tag'
import { Input } from '@/components/ui/Input'
import { message } from '@/components/ui/message'
import { Modal } from '@/components/ui/Modal'
import { Form } from '@/components/ui/Form'

const Container = styled.div`
  min-height: 100vh;
  background: #9A9A9A;
  padding: 20px;
  overflow: hidden;
`

const ContentWrapper = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding-top: 60px;
`

const HeroCard = styled(Card)`
  text-align: center;
  margin-bottom: 40px;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  
  .ant-card-body {
    padding: 60px 40px;
  }
`

const FeatureGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
  margin-top: 40px;
`

const FeatureCard = styled(Card)`
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease-in-out;
  
  &:hover {
    transform: translateY(-4px);
  }
  
  .ant-card-body {
    text-align: center;
    padding: 32px 24px;
  }
`

const IconWrapper = styled.div`
  font-size: 48px;
  color: #667eea;
  margin-bottom: 16px;
`

// ワークスペースの型定義
interface Workspace {
  id: number
  name: string
  accessable_ips: string[]
  projects: {
    id: number
    name: string
    _count: {
      contracts: number
      projectUsers: number
    }
  }[]
}

/**
 * Administrator page component for Y2D2 subdomain
 */
export default function AdministratorPage() {
  const [isValidSubdomain, setIsValidSubdomain] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [editingWorkspace, setEditingWorkspace] = useState<number | null>(null)
  const [editingIPs, setEditingIPs] = useState<string[]>([])
  const [newIP, setNewIP] = useState('')
  const [searchText, setSearchText] = useState('')
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false)
  const [createForm] = Form.useForm()

  useEffect(() => {
    // クライアントサイドでサブドメインを確認
    const hostname = window.location.hostname
    const isValid = isY2d2Subdomain(hostname)
    setIsValidSubdomain(isValid)
    setIsLoading(false)
    
    if (isValid) {
      fetchWorkspaces()
    }
  }, [])

  /**
   * Fetch workspaces data from API
   */
  const fetchWorkspaces = async () => {
    try {
      const response = await fetch('/api/admin/workspaces')
      if (response.ok) {
        const data = await response.json()
        setWorkspaces(data)
      } else {
        message.error('ワークスペースの取得に失敗しました')
      }
    } catch (error) {
      message.error('ネットワークエラーが発生しました')
    }
  }

  /**
   * Start editing IP addresses for a workspace
   */
  const startEditing = (workspaceId: number, currentIPs: string[]) => {
    setEditingWorkspace(workspaceId)
    setEditingIPs([...currentIPs])
    setNewIP('')
  }

  /**
   * Cancel editing
   */
  const cancelEditing = () => {
    setEditingWorkspace(null)
    setEditingIPs([])
    setNewIP('')
  }

  /**
   * Add new IP address
   */
  const addIP = () => {
    if (newIP.trim()) {
      const trimmedIP = newIP.trim()
      setEditingIPs(prev => [...prev, trimmedIP])
      setNewIP('')
    }
  }

  /**
   * Remove IP address
   */
  const removeIP = (index: number) => {
    const newIPs = editingIPs.filter((_, i) => i !== index)
    setEditingIPs(newIPs)
  }

  /**
   * Create new workspace
   */
  const createWorkspace = async (values: unknown) => {
    const typedValues = values as { name: string }
    try {
      const response = await fetch('/api/admin/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(typedValues)
      })

      if (response.ok) {
        message.success('ワークスペースを作成しました')
        setIsCreateModalVisible(false)
        createForm.resetFields()
        fetchWorkspaces()
      } else {
        const data = await response.json()
        message.error(data.error || 'ワークスペースの作成に失敗しました')
      }
    } catch (error) {
      message.error('ネットワークエラーが発生しました')
    }
  }

  /**
   * Save IP addresses
   */
  const saveIPs = async (workspaceId: number) => {
    try {
      // 入力中のIPがあれば自動で追加
      let finalIPs = [...editingIPs]
      if (newIP.trim()) {
        finalIPs.push(newIP.trim())
      }
      
      // 空文字列を除去してからサーバーに送信
      const filteredIPs = finalIPs.filter(ip => ip.trim() !== '')
      
      const response = await fetch('/api/admin/workspaces', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workspaceId,
          accessable_ips: filteredIPs
        })
      })

      if (response.ok) {
        message.success('IPアドレス制限を更新しました')
        fetchWorkspaces()
        cancelEditing()
      } else {
        const data = await response.json()
        message.error(data.error || '更新に失敗しました')
      }
    } catch (error) {
      message.error('ネットワークエラーが発生しました')
    }
  }

  // 検索でフィルタリングされたワークスペースを取得
  const filteredWorkspaces = useMemo(() => {
    if (!searchText.trim()) {
      return workspaces
    }
    
    const searchLower = searchText.toLowerCase()
    return workspaces.filter(workspace => 
      workspace.id.toString().includes(searchLower) ||
      workspace.name.toLowerCase().includes(searchLower)
    )
  }, [workspaces, searchText])

  if (isLoading) {
    return (
      <Container>
        <ContentWrapper>
          <HeroCard>
            <Title level={2}>読み込み中...</Title>
          </HeroCard>
        </ContentWrapper>
      </Container>
    )
  }

  if (!isValidSubdomain) {
    return (
      <Container>
        <ContentWrapper>
          <HeroCard>
            <Title level={2} style={{ color: '#ff4d4f' }}>
              アクセス制限
            </Title>
            <Paragraph style={{ fontSize: '16px', color: '#666' }}>
              このページはy2d2サブドメインからのみアクセス可能です。
            </Paragraph>
            <Button 
              type="primary" 
              size="large"
              onClick={() => window.location.href = '/'}
            >
              ホームに戻る
            </Button>
          </HeroCard>
        </ContentWrapper>
      </Container>
    )
  }

  // ワークスペース表のカラム定義
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: 'ワークスペース名',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: 'プロジェクト数',
      key: 'projectCount',
      width: 120,
      render: (workspace: Workspace) => workspace.projects.length,
    },
    {
      title: '許可IPアドレス',
      key: 'accessable_ips',
      render: (workspace: Workspace) => {
        const isEditing = editingWorkspace === workspace.id
        
        if (isEditing) {
          return (
            <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px', padding: '12px', backgroundColor: '#fafafa' }}>
              <div style={{ marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
                許可IPアドレス編集
              </div>
              
              {/* 現在のIPリスト */}
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>現在の許可IPアドレス:</div>
                <Space wrap>
                  {editingIPs.length > 0 ? (
                    editingIPs.map((ip, index) => (
                      <Tag 
                        key={index} 
                        closable 
                        onClose={() => removeIP(index)}
                        color="blue"
                      >
                        {ip}
                      </Tag>
                    ))
                  ) : (
                    <span style={{ color: '#999', fontSize: '12px' }}>設定なし</span>
                  )}
                </Space>
              </div>

              {/* IP追加セクション */}
              <div style={{ marginBottom: '12px', padding: '8px', border: '1px dashed #d9d9d9', borderRadius: '4px' }}>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>新しいIPアドレスを追加:</div>
                <Space>
                  <Input
                    placeholder="例: 192.168.1.0/24"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                    onPressEnter={addIP}
                    style={{ width: 200 }}
                  />
                  <Button 
                    type="dashed" 
                    icon={<PlusOutlined />} 
                    onClick={addIP}
                    disabled={!newIP.trim()}
                  >
                    リストに追加
                  </Button>
                </Space>
              </div>

              {/* 保存・キャンセルボタン */}
              <Space>
                <Button 
                  type="primary" 
                  onClick={() => saveIPs(workspace.id)}
                  icon={<SaveOutlined />}
                >
                  設定を保存
                </Button>
                <Button onClick={cancelEditing}>
                  キャンセル
                </Button>
              </Space>
            </div>
          )
        }
        
        return (
          <Space direction="vertical">
            <div>
              {workspace.accessable_ips.length > 0 ? (
                workspace.accessable_ips.map((ip, index) => (
                  <Tag key={index} style={{ marginBottom: 4 }}>{ip}</Tag>
                ))
              ) : (
                <Text type="secondary">設定なし</Text>
              )}
            </div>
            <Button 
              type="link" 
              size="small" 
              icon={<EditOutlined />}
              onClick={() => startEditing(workspace.id, workspace.accessable_ips)}
            >
              編集
            </Button>
          </Space>
        )
      },
    },
    {
      title: 'CDNでのIP制限',
      key: 'cdn_restriction',
      width: 300,
      render: (workspace: Workspace) => {
        // CloudArmor形式でIP制限ルールを生成
        const generateCloudArmorRule = () => {
          if (workspace.accessable_ips.length === 0) {
            return ''
          }
          
          // IP配列を文字列形式に変換
          const ipList = workspace.accessable_ips
            .map(ip => `'${ip}'`)
            .join(', ')
          
          return `request.path.startsWith('/app_contracts/${workspace.id}/') && inIpRange(origin.ip, [${ipList}])`
        }
        
        const rule = generateCloudArmorRule()
        
        const handleCopy = () => {
          if (rule) {
            navigator.clipboard.writeText(rule)
            message.success('CloudArmor形式のルールをコピーしました')
          }
        }
        
        return (
          <div>
            {rule ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '8px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  wordBreak: 'break-all'
                }}>
                  {rule}
                </div>
                <Button 
                  size="small" 
                  icon={<CopyOutlined />}
                  onClick={handleCopy}
                >
                  コピー
                </Button>
              </Space>
            ) : (
              <Text type="secondary">IPアドレス未設定</Text>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <Container>
      <ContentWrapper>
        <HeroCard>
          <Title level={1} style={{ color: '#667eea', marginBottom: '16px' }}>
            管理者ページ
          </Title>
        </HeroCard>

        <Card 
          title="ワークスペース管理" 
          style={{ marginBottom: '24px' }}
          extra={
            <Space>
              <Input
                placeholder="IDまたはワークスペース名で検索"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
              <Button 
                type="primary" 
                icon={<PlusOutlined />}
                onClick={() => setIsCreateModalVisible(true)}
              >
                ワークスペース追加
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={filteredWorkspaces}
            rowKey="id"
            pagination={false}
            loading={isLoading}
            scroll={{ x: 800 }}
          />
        </Card>

        <Modal
          title="新規ワークスペース作成"
          open={isCreateModalVisible}
          onCancel={() => {
            setIsCreateModalVisible(false)
            createForm.resetFields()
          }}
          footer={null}
        >
          <Form
            form={createForm}
            onFinish={createWorkspace}
            layout="vertical"
          >
            <Form.Item
              name="name"
              label="ワークスペース名"
              rules={[
                { required: true, message: 'ワークスペース名を入力してください' },
                { min: 2, message: 'ワークスペース名は2文字以上で入力してください' }
              ]}
            >
              <Input 
                prefix={<TeamOutlined />}
                placeholder="ワークスペース名を入力"
              />
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => {
                  setIsCreateModalVisible(false)
                  createForm.resetFields()
                }}>
                  キャンセル
                </Button>
                <Button type="primary" htmlType="submit">
                  作成
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </ContentWrapper>
    </Container>
  )
}