'use client'

import React, { useState, Suspense } from 'react'
import styled from 'styled-components'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import useSWR, { mutate } from 'swr'
import { Spin } from 'antd'
import AppLayout from '@/components/layout/AppLayout'
import { fetcher } from '@/lib/swr/fetchers'
import { Card } from '@/components/ui/Card'
import { Title, Text } from '@/components/ui/Typography'
import { Table } from '@/components/ui/Table'
import { Button } from '@/components/ui/Button'
import { Space } from '@/components/ui/Space'
import { Modal } from '@/components/ui/Modal'
import { Form } from '@/components/ui/Form'
import { Input } from '@/components/ui/Input'
import { message } from '@/components/ui/message'
import { Tabs } from '@/components/ui/Tabs'
import { Tooltip } from '@/components/ui/Tooltip'

const { TextArea } = Input

interface Risk {
  id: number
  workspaceId: number | null
  title: string
  prompt: string
  description: string
  createdAt: string
  updatedAt: string
}

function RisksContent() {
  const [createModalVisible, setCreateModalVisible] = useState(false)
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editingRisk, setEditingRisk] = useState<Risk | null>(null)
  const [form] = Form.useForm()
  const [editForm] = Form.useForm()

  // TODO: 現在は固定でworkspaceId=1、将来的には認証から取得
  const workspaceId = 1

  // リスクデータを取得
  const { data: risks, error, isLoading } = useSWR<Risk[]>(
    `/api/risks?workspaceId=${workspaceId}`,
    fetcher
  )

  // デフォルトリスクとカスタムリスクに分ける
  const defaultRisks = risks?.filter(risk => risk.workspaceId === null) || []
  const customRisks = risks?.filter(risk => risk.workspaceId === workspaceId) || []

  /**
   * Handle create risk
   */
  const handleCreate = async (values: any) => {
    try {
      const response = await fetch('/api/risks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...values,
          workspaceId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create risk')
      }

      message.success('リスク項目を作成しました')
      setCreateModalVisible(false)
      form.resetFields()
      mutate(`/api/risks?workspaceId=${workspaceId}`)
    } catch (error) {
      console.error('Create risk error:', error)
      message.error('リスク項目の作成に失敗しました')
    }
  }

  /**
   * Handle edit risk
   */
  const handleEdit = async (values: any) => {
    if (!editingRisk) return

    try {
      const response = await fetch(`/api/risks/${editingRisk.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values)
      })

      if (!response.ok) {
        throw new Error('Failed to update risk')
      }

      message.success('リスク項目を更新しました')
      setEditModalVisible(false)
      setEditingRisk(null)
      editForm.resetFields()
      mutate(`/api/risks?workspaceId=${workspaceId}`)
    } catch (error) {
      console.error('Edit risk error:', error)
      message.error('リスク項目の更新に失敗しました')
    }
  }

  /**
   * Handle delete risk
   */
  const handleDelete = async (risk: Risk) => {
    Modal.confirm({
      title: 'リスク項目を削除',
      content: `「${risk.title}」を削除しますか？この操作は元に戻せません。`,
      okText: '削除',
      okType: 'danger',
      cancelText: 'キャンセル',
      onOk: async () => {
        try {
          const response = await fetch(`/api/risks/${risk.id}`, {
            method: 'DELETE'
          })

          if (!response.ok) {
            throw new Error('Failed to delete risk')
          }

          message.success('リスク項目を削除しました')
          mutate(`/api/risks?workspaceId=${workspaceId}`)
        } catch (error) {
          console.error('Delete risk error:', error)
          message.error('リスク項目の削除に失敗しました')
        }
      }
    })
  }

  /**
   * Open edit modal
   */
  const openEditModal = (risk: Risk) => {
    setEditingRisk(risk)
    editForm.setFieldsValue({
      title: risk.title,
      prompt: risk.prompt,
      description: risk.description
    })
    setEditModalVisible(true)
  }

  // 表カラム定義（カスタムリスク用）
  const customRiskColumns = [
    {
      title: 'タイトル',
      dataIndex: 'title',
      key: 'title',
      width: 250,
    },
    {
      title: '条項例',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '抽出プロンプト',
      dataIndex: 'prompt',
      key: 'prompt',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: any) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => openEditModal(record)}
            title="編集"
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
            title="削除"
          />
        </Space>
      ),
    },
  ]

  // 表カラム定義（デフォルトリスク用）- 抽出プロンプト列は非表示
  const defaultRiskColumns = [
    {
      title: 'タイトル',
      dataIndex: 'title',
      key: 'title',
      width: 250,
    },
    {
      title: '条項例',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <span>{text}</span>
        </Tooltip>
      ),
    },
  ]

  const tabItems = [
    {
      key: 'custom',
      label: `カスタムリスク項目 (${customRisks.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text type="secondary">
              ワークスペース固有のリスク項目を管理できます
            </Text>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              新規作成
            </Button>
          </div>
          <Table
            columns={customRiskColumns}
            dataSource={customRisks}
            rowKey="id"
            loading={isLoading}
            pagination={false}
            locale={{
              emptyText: 'カスタムリスク項目はありません'
            }}
          />
        </div>
      ),
    },
    {
      key: 'default',
      label: `デフォルトリスク項目 (${defaultRisks.length})`,
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Text type="secondary">
              システムで提供されるデフォルトのリスク項目です（読み取り専用）
            </Text>
          </div>
          <Table
            columns={defaultRiskColumns}
            dataSource={defaultRisks}
            rowKey="id"
            loading={isLoading}
            pagination={false}
          />
        </div>
      ),
    },
  ]

  return (
    <AppLayout>
      <div style={{ padding: '0 24px' }}>
        <div style={{ marginBottom: 24 }}>
          <Title level={2}>リスク項目管理</Title>
          <Text type="secondary">
            契約書リスク抽出で使用されるリスク項目を管理します
          </Text>
        </div>

        <Card>
          <Tabs
            items={tabItems}
            defaultActiveKey="custom"
          />
        </Card>

        {/* 新規作成モーダル */}
        <Modal
          title="新しいリスク項目を作成"
          open={createModalVisible}
          onCancel={() => {
            setCreateModalVisible(false)
            form.resetFields()
          }}
          footer={null}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
          >
            <Form.Item
              name="title"
              label="タイトル"
              rules={[{ required: true, message: 'タイトルを入力してください' }]}
            >
              <Input placeholder="例：COC条項：通知・届出事由" />
            </Form.Item>

            <Form.Item
              name="prompt"
              label="抽出プロンプト"
              rules={[{ required: true, message: '抽出プロンプトを入力してください' }]}
            >
              <TextArea
                rows={4}
                placeholder="契約書の条項から、対象会社がその支配権を移転させる場合に、相手方に通知又は届出する義務を負う条項を抽出してください。ただし、義務に違反した場合の効果については検討する必要はなく、条文上、支配権の移転が通知・届出事由とされていればリスク条項があると判断してください。"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="条項例"
              rules={[{ required: true, message: '条項例を入力してください' }]}
            >
              <TextArea
                rows={3}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setCreateModalVisible(false)
                  form.resetFields()
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

        {/* 編集モーダル */}
        <Modal
          title="リスク項目を編集"
          open={editModalVisible}
          onCancel={() => {
            setEditModalVisible(false)
            setEditingRisk(null)
            editForm.resetFields()
          }}
          footer={null}
          width={600}
        >
          <Form
            form={editForm}
            layout="vertical"
            onFinish={handleEdit}
          >
            <Form.Item
              name="title"
              label="タイトル"
              rules={[{ required: true, message: 'タイトルを入力してください' }]}
            >
              <Input placeholder="例：COC条項：通知・届出事由" />
            </Form.Item>

            <Form.Item
              name="prompt"
              label="抽出プロンプト"
              rules={[{ required: true, message: '抽出プロンプトを入力してください' }]}
            >
              <TextArea
                rows={4}
                placeholder="契約書の条項から、対象会社がその支配権を移転させる場合に、相手方に通知又は届出する義務を負う条項を抽出してください。ただし、義務に違反した場合の効果については検討する必要はなく、条文上、支配権の移転が通知・届出事由とされていればリスク条項があると判断してください。"
              />
            </Form.Item>

            <Form.Item
              name="description"
              label="条項例"
              rules={[{ required: true, message: '条項例を入力してください' }]}
            >
              <TextArea
                rows={3}
              />
            </Form.Item>

            <Form.Item style={{ marginTop: 24, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setEditModalVisible(false)
                  setEditingRisk(null)
                  editForm.resetFields()
                }}>
                  キャンセル
                </Button>
                <Button type="primary" htmlType="submit">
                  更新
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AppLayout>
  )
}

export default function RisksPage() {
  return (
    <Suspense fallback={
      <LoadingContainer>
        <Spin size="large" tip="Loading..." />
      </LoadingContainer>
    }>
      <RisksContent />
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