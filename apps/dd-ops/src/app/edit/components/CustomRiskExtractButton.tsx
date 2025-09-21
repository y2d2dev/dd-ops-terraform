'use client'

import React, { useMemo, useState } from 'react'
import useSWR from 'swr'
import styled from 'styled-components'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Table } from '@/components/ui/Table'
import { Space } from '@/components/ui/Space'
import { Tooltip } from '@/components/ui/Tooltip'
import { Spin } from '@/components/ui/Spin'
import { Text } from '@/components/ui/Typography'
import { message } from '@/components/ui/message'

export interface CustomRiskItem {
    id: number
    workspaceId: number | null
    title: string
    prompt: string
    description: string
}

interface Props {
    workspaceId?: number
    loading?: boolean
    disabled?: boolean
    onExecute?: (selected: CustomRiskItem[]) => void
}

export default function CustomRiskExtractButton({ workspaceId, loading, disabled, onExecute }: Props) {
    const [open, setOpen] = useState(false)
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
    const [executing, setExecuting] = useState(false)

    const { data: risks, isLoading } = useSWR<CustomRiskItem[]>(
        workspaceId ? `/api/risks?workspaceId=${workspaceId}` : null,
        async (url: string) => {
            const res = await fetch(url)
            if (!res.ok) throw new Error('Failed to fetch risks')
            return res.json()
        },
        { revalidateOnFocus: false, revalidateOnReconnect: false }
    )

    const customRisks = useMemo(() => {
        if (!risks || workspaceId == null) return []
        return risks.filter(r => r.workspaceId === workspaceId)
    }, [risks, workspaceId])

    const selectedRisks = useMemo(() => {
        const map = new Map<number, CustomRiskItem>()
        customRisks.forEach(r => map.set(r.id, r))
        return selectedRowKeys
            .map(key => map.get(Number(key)))
            .filter((v): v is CustomRiskItem => Boolean(v))
    }, [selectedRowKeys, customRisks])

    const columns = [
        {
            title: 'タイトル',
            dataIndex: 'title',
            key: 'title',
            width: 240,
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
            )
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
            )
        }
    ]

    const handleOpen = () => {
        if (executing) return
        setOpen(true)
    }

    const handleCancel = () => {
        setOpen(false)
        setSelectedRowKeys([])
    }

    const handleExecute = async () => {
        if (!onExecute) {
            setOpen(false)
            setSelectedRowKeys([])
            return
        }
        try {
            setExecuting(true)
            const key = 'custom-extract'
            message.loading({ content: 'カスタムリスク抽出を実行中...', key, duration: 0 })
            setOpen(false)
            await Promise.resolve(onExecute(selectedRisks))
            setSelectedRowKeys([])
            message.success({ content: 'カスタムリスク抽出が完了しました', key })
        } catch (e) {
            const key = 'custom-extract'
            message.error({ content: 'カスタムリスク抽出に失敗しました', key })
        } finally {
            setExecuting(false)
        }
    }

    const isExecuteDisabled = selectedRisks.length === 0 || loading || executing

    return (
        <>
            <Button
                type="primary"
                onClick={handleOpen}
                disabled={disabled}
                loading={executing}
            >
                カスタムリスク抽出
            </Button>

            <Modal
                title="カスタムリスク項目を選択"
                open={open}
                onCancel={handleCancel}
                footer={null}
                width={900}
            >
                {isLoading ? (
                    <LoadingWrap>
                        <Spin size="large" tip={'読み込み中...'} />
                    </LoadingWrap>
                ) : (
                    <>
                        {customRisks.length === 0 ? (
                            <EmptyWrap>
                                <Text type="secondary">カスタムリスク項目がありません。リスク項目管理から作成してください。</Text>
                            </EmptyWrap>
                        ) : (
                            <Table
                                columns={columns}
                                dataSource={customRisks}
                                rowKey="id"
                                pagination={false}
                                rowSelection={{
                                    type: 'radio',
                                    selectedRowKeys,
                                    onChange: (keys: React.Key[]) => {
                                        if (!keys || keys.length === 0) {
                                            setSelectedRowKeys([])
                                        } else {
                                            const last = keys[keys.length - 1]
                                            setSelectedRowKeys([last])
                                        }
                                    },
                                }}
                            />
                        )}

                        <FooterWrap>
                            <Space>
                                <Button onClick={handleCancel}>キャンセル</Button>
                                <Button type="primary" onClick={handleExecute} disabled={isExecuteDisabled} loading={loading || executing}>
                                    実行
                                </Button>
                            </Space>
                        </FooterWrap>
                    </>
                )}
            </Modal>
        </>
    )
}

const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
`

const EmptyWrap = styled.div`
  padding: 16px;
  background: #FAFAFA;
  border: 1px dashed #e8e8e8;
  border-radius: 6px;
  text-align: center;
`

const FooterWrap = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
`
