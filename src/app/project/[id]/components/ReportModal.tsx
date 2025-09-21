'use client'

import React, { useState, useMemo, useEffect } from 'react'
import {
  DownloadOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  EditOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { ContractVariableHelper } from '@/components/ContractVariableHelper'
import { replaceVariables } from '@/lib/contractVariables'
import { formatDateToJapanese } from '@/utils/dateFormat'
import useSWR from 'swr'
import { useQueryState } from 'nuqs'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { Space } from '@/components/ui/Space'
import { Tabs } from '@/components/ui/Tabs'
import { Row, Col } from '@/components/ui/Grid'
import { Checkbox } from '@/components/ui/Checkbox'
import { Typography } from '@/components/ui/Typography'
import { Table } from '@/components/ui/Table'
import { Input } from '@/components/ui/Input'
import { message } from '@/components/ui/message'
import { Drawer } from '@/components/ui/Drawer'
import { Form } from '@/components/ui/Form'
import { Popconfirm } from '@/components/ui/Popconfirm'
import { List } from '@/components/ui/List'
import { Card } from '@/components/ui/Card'
import { Collapse } from '@/components/ui/Collapse'

interface Contract {
  id: number
  fileName: string
  baseName?: string
  title?: string
  party?: string
  startDate?: string
  endDate?: string
  conclusionDate?: string
  isSave: boolean
  createdAt: string
  contractRisks: any[]
}

interface BasicField {
  key: string
  label: string
  enabled: boolean
  color?: string
}

interface RiskType {
  value: string
  label: string
  color: string
}

interface RiskTemplate {
  riskType: string
  description: string
}

interface ReportTemplate {
  id: string
  name: string
  title: string
  introduction: string
  reasonPrefix: string
  contractFormat: string
  riskTemplates: RiskTemplate[]
  createdAt?: string
  updatedAt?: string
}

interface ReportModalProps {
  visible: boolean
  contracts: Contract[]
  project: any
  onCancel: () => void
  onShowRiskDetails: (contractId: number, riskType: string, riskTypeLabel: string) => void
  onReportGenerated?: () => void
}

interface Risk {
  id: number
  workspaceId: number | null
  title: string
  prompt: string
  description: string
  createdAt: string
  updatedAt: string
}

// カラーマッピング（インデックスベース）
const RISK_COLORS = [
  'blue', 'orange', 'green', 'red', 'purple', 'volcano',
  'magenta', 'red', 'cyan', 'lime', 'gold', 'geekblue',
  'blue', 'orange', 'green', 'red', 'purple', 'volcano'
]

const DEFAULT_BASIC_FIELDS: BasicField[] = [
  { key: 'title', label: '契約書名', enabled: true },
  { key: 'pdfFileName', label: 'PDFファイル名', enabled: true, color: '#8c8c8c' },
  { key: 'party', label: '当事者', enabled: true },
  { key: 'startDate', label: '開始日', enabled: true },
  { key: 'endDate', label: '終了日', enabled: true },
  { key: 'conclusionDate', label: '契約締結日', enabled: true }
]

/**
 * Report modal component
 * @param props - Component properties
 * @returns JSX element
 */
const fetcher = (url: string) => fetch(url).then(res => res.json())

export default function ReportModal({
  visible,
  contracts,
  project,
  onCancel,
  onShowRiskDetails,
  onReportGenerated
}: ReportModalProps) {
  const [activeTab, setActiveTab] = useState('table')
  const [basicFields, setBasicFields] = useState<BasicField[]>(DEFAULT_BASIC_FIELDS)
  // useQueryStateでリスクフィールドを永続化
  const [riskFields, setRiskFields] = useQueryState('reportRiskFields', {
    defaultValue: [],
    parse: (value) => {
      try {
        return JSON.parse(value)
      } catch {
        return []
      }
    },
    serialize: (value) => JSON.stringify(value)
  })
  const [textTemplate, setTextTemplate] = useState({
    title: '契約書リスク分析報告書',
    introduction: '以下の契約書について、リスク分析を実施いたしました。',
    reasonPrefix: '理由：',
    contractFormat: '{{開始日}}付{{契約名}}({{当事者}})'
  })
  const [riskDescriptions, setRiskDescriptions] = useState<Record<string, string>>({})
  const [templateDrawerVisible, setTemplateDrawerVisible] = useState(false)
  const [savedTemplates, setSavedTemplates] = useState<ReportTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [templateForm] = Form.useForm()
  const [riskTypes, setRiskTypes] = useState<RiskType[]>([])

  // Risk表からデータを取得
  const { data: risks, error } = useSWR<Risk[]>(
    visible ? `/api/risks${project?.workspaceId ? `?workspaceId=${project.workspaceId}` : ''}` : null,
    fetcher
  )


  // Riskデータが取得できたらセットアップ
  useEffect(() => {
    if (risks && risks.length > 0) {
      // RiskTypeの配列を作成（DBのIDを使用）
      const types = risks.map((risk, index) => ({
        value: String(risk.id), // DBのIDを使用
        label: risk.title,
        color: RISK_COLORS[index % RISK_COLORS.length]
      }))
      setRiskTypes(types)

      // リスクフィールドがまだ設定されていない場合のみ、デフォルトで全て外す
      // 既に選択済みの値があれば保持する

      // リスク説明文をセット
      const descriptions: Record<string, string> = {}
      risks.forEach((risk) => {
        descriptions[String(risk.id)] = risk.description
      })
      setRiskDescriptions(descriptions)
    }
  }, [risks])

  // PDFファイル名をフォーマット（先頭のフォルダと末尾タイムスタンプを除去）
  const formatPdfFileName = (filePath: string) => {
    if (!filePath) return ''
    const base = filePath.split('/').pop() || filePath
    return base.replace(/-\d+(?=\.pdf$)/, '')
  }
  // 報告書データの生成
  const reportData = useMemo(() => {
    if (!riskTypes.length) return []

    const completedContracts = contracts.filter((contract: Contract) => contract.isSave)

    return completedContracts.map((contract: Contract) => {
      const contractRisks = contract.contractRisks || []

      const risksByType = riskTypes.reduce((acc, riskType) => {
        const risks = contractRisks.filter((risk: any) => String(risk.type) === riskType.value)
        acc[riskType.value] = risks.length
        return acc
      }, {} as Record<string, number>)

      return {
        id: contract.id,
        title: contract.title || contract.fileName,
        pdfFileName: formatPdfFileName(contract.fileName),
        party: contract.party || '',
        startDate: formatDateToJapanese(contract.startDate),
        endDate: formatDateToJapanese(contract.endDate),
        conclusionDate: formatDateToJapanese(contract.conclusionDate),
        ...risksByType
      }
    })
  }, [contracts, riskTypes])

  /**
   * CSVダウンロード機能
   */
  const downloadCSV = async () => {
    try {
      // CSVヘッダーを作成
      const headers = [
        ...basicFields.filter(f => f.enabled).map(f => f.label),
        ...riskTypes.filter(r => riskFields.includes(r.value)).map(r => r.label)
      ]

      // CSVデータを作成
      const csvData = reportData.map(row => {
        const basicData = basicFields.filter(f => f.enabled).map(f => {
          const value = row[f.key as keyof typeof row]
          return typeof value === 'string' ? `"${value}"` : value || ''
        })

        const riskData = riskTypes.filter(r => riskFields.includes(r.value)).map(r => {
          // 該当する契約書を取得
          const contract = contracts.find((c: Contract) => c.id === row.id)
          if (!contract) return ''

          // 該当するリスクタイプのリスクを取得
          const risks = contract.contractRisks?.filter((risk: any) => risk.type === r.value) || []

          if (risks.length === 0) return ''

          // 3段階形式でセル内容を作成
          const clauses = risks.map((risk: any, index: number) => {
            // 1段目：条文タイトル
            const articleTitle = risk.articleTitle || ''

            // 2段目：該当条文（条文番号）
            const articleInfo = risk.articleInfo || ''

            // 3段目：リスクと判断された条項のテキスト
            const riskText = risk.specificClause || risk.text || ''

            // 3段階を改行で区切って結合
            const segments = []
            if (articleTitle) segments.push(articleTitle)
            if (articleInfo) segments.push(articleInfo)
            if (riskText) segments.push(riskText)

            return segments.join('\n')
          })

          // 複数のリスクがある場合は空行で区切る
          const clauseText = clauses.join('\n\n')
          return `"${clauseText}"`
        })

        return [...basicData, ...riskData].join(',')
      })

      // CSVファイルを作成（UTF-8 BOM + CRLF 改行で Excel 文字化け防止）
      const bom = '\uFEFF'
      const csvContent = bom + [headers.join(','), ...csvData].join('\r\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')

      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `${project?.name || 'project'}_report.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }

      // 報告書生成時刻を更新（エラーがあってもCSVダウンロードは成功とする）
      await updateReportGeneratedAt()
      message.success('CSVをダウンロードしました')

      // 親コンポーネントに通知
      if (onReportGenerated) {
        setTimeout(() => {
          onReportGenerated()
        }, 500)
      }
    } catch (error) {
      console.error('CSVダウンロード処理でエラー:', error)
      message.error('エラーが発生しました')
    }
  }

  /**
   * 表カラムの生成
   */
  const getTableColumns = () => {
    const columns: any[] = []

    // 基本情報カラム
    basicFields.filter(f => f.enabled).forEach(field => {
      const column: any = {
        title: field.key === 'pdfFileName' ? (
          <span style={{ color: '#8c8c8c' }}>{field.label}</span>
        ) : field.label,
        dataIndex: field.key,
        key: field.key,
        width: field.key === 'title' ? 200 : 150,
        render: (text: string) =>
          field.key === 'pdfFileName' ? <span style={{ color: '#8c8c8c' }}>{text}</span> : text
      }
      columns.push(column)
    })

    // リスクカラム
    riskTypes.filter(r => riskFields.includes(r.value)).forEach(riskType => {
      columns.push({
        title: riskType.label,
        dataIndex: riskType.value,
        key: riskType.value,
        width: 100,
        render: (count: number, record: any) => {
          if (count > 0) {
            return (
              <span
                style={{ color: 'red', cursor: 'pointer' }}
                onClick={() => onShowRiskDetails(record.id, riskType.value, riskType.label)}
              >
                <CheckCircleOutlined /> ({count})
              </span>
            )
          }
          return ''
        }
      })
    })

    return columns
  }


  /**
   * テキスト報告書の生成
   */
  const generateTextReport = () => {
    let report = `${textTemplate.title}\n\n${textTemplate.introduction}\n\n`

    riskTypes.forEach(riskType => {
      const riskValue = riskType.value

      // このリスクタイプに該当するリスクを収集
      const relevantContracts: Array<{ contract: Contract, risks: any[] }> = []

      contracts.filter(c => c.isSave).forEach((contract: Contract) => {
        const risks = contract.contractRisks?.filter((risk: any) => String(risk.type) === riskValue) || []
        if (risks.length > 0) {
          relevantContracts.push({ contract, risks })
        }
      })

      if (relevantContracts.length > 0) {
        report += `${riskType.label}\n`

        // リスクタイプに応じた説明文を追加
        const description = riskDescriptions[riskValue]
        if (description) {
          report += `${description}\n`
        } else {
          report += `以下の契約書について${riskType.label}に関するリスクが検出された。\n`
        }

        // 契約一覧
        relevantContracts.forEach(({ contract }) => {
          // 契約情報の変数値を準備
          const contractValues = {
            '契約名': contract.title || contract.fileName || '',
            '開始日': formatDateToJapanese(contract.startDate),
            '終了日': formatDateToJapanese(contract.endDate),
            '締結日': formatDateToJapanese(contract.conclusionDate),
            '当事者': contract.party || ''
          }

          const contractInfo = replaceVariables(textTemplate.contractFormat, contractValues)
          report += `${contractInfo}\n`
        })

        report += '\n'
      }
    })

    return report
  }

  /**
   * テンプレートの保存
   */
  const saveTemplate = async () => {
    try {
      const values = await templateForm.validateFields()
      const newTemplate: ReportTemplate = {
        id: Date.now().toString(),
        name: values.name,
        title: textTemplate.title,
        introduction: textTemplate.introduction,
        reasonPrefix: textTemplate.reasonPrefix,
        contractFormat: textTemplate.contractFormat,
        riskTemplates: Object.entries(riskDescriptions).map(([riskType, description]) => ({
          riskType,
          description
        })),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      // ローカルストレージに保存
      const templates = [...savedTemplates, newTemplate]
      localStorage.setItem('reportTemplates', JSON.stringify(templates))
      setSavedTemplates(templates)

      message.success('テンプレートを保存しました')
      setTemplateDrawerVisible(false)
      templateForm.resetFields()
    } catch (error) {
      console.error('テンプレート保存エラー:', error)
      message.error('テンプレートの保存に失敗しました')
    }
  }

  /**
   * テンプレートの読み込み
   */
  const loadTemplate = (template: ReportTemplate) => {
    setTextTemplate({
      title: template.title,
      introduction: template.introduction,
      reasonPrefix: template.reasonPrefix,
      contractFormat: template.contractFormat
    })

    const descriptions: Record<string, string> = {}
    template.riskTemplates.forEach(rt => {
      descriptions[rt.riskType] = rt.description
    })
    setRiskDescriptions(descriptions)

    setSelectedTemplateId(template.id)
    message.success('テンプレートを読み込みました')
  }

  /**
   * テンプレートの削除
   */
  const deleteTemplate = (templateId: string) => {
    const templates = savedTemplates.filter(t => t.id !== templateId)
    localStorage.setItem('reportTemplates', JSON.stringify(templates))
    setSavedTemplates(templates)

    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null)
    }

    message.success('テンプレートを削除しました')
  }

  // コンポーネントマウント時にテンプレートを読み込み
  React.useEffect(() => {
    const storedTemplates = localStorage.getItem('reportTemplates')
    if (storedTemplates) {
      try {
        const templates = JSON.parse(storedTemplates)
        setSavedTemplates(templates)
      } catch (error) {
        console.error('テンプレート読み込みエラー:', error)
      }
    }
  }, [])

  /**
   * 報告書生成時刻を更新
   */
  const updateReportGeneratedAt = async () => {
    try {
      const contractIds = contracts.map(c => c.id)
      if (contractIds.length === 0) {
        return
      }

      const response = await fetch('/api/contracts/report-generated', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contractIds })
      })

      if (!response.ok) {
        console.error('Failed to update report generation timestamp:', response.status)
        // エラーでも処理を続行
        return
      }

      const result = await response.json()
      return result
    } catch (error) {
      console.error('Error updating report generation timestamp:', error)
      // エラーでも処理を続行（throw しない）
    }
  }

  /**
   * テキスト報告書をクリップボードにコピー
   */
  const copyTextReport = async () => {
    try {
      await navigator.clipboard.writeText(generateTextReport())
      await updateReportGeneratedAt()
      message.success('報告書をコピーしました')

      // 親コンポーネントに通知
      if (onReportGenerated) {
        setTimeout(() => {
          onReportGenerated()
        }, 500)
      }
    } catch (err) {
      console.error('コピーに失敗しました:', err)
      message.error('報告書のコピーに失敗しました')
    }
  }

  return (
    <Modal
      title="報告書設定"
      open={visible}
      onCancel={onCancel}
      width={1200}
      style={{ top: 20 }}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          キャンセル
        </Button>,
        <Button key="template" icon={<FileTextOutlined />} onClick={() => setTemplateDrawerVisible(true)}>
          テンプレート管理
        </Button>,
        <Button key="copy" icon={<CopyOutlined />} onClick={copyTextReport}>
          テキストコピー
        </Button>,
        <Button key="download" type="primary" icon={<DownloadOutlined />} onClick={downloadCSV}>
          CSVダウンロード
        </Button>
      ]}
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'table',
            label: '表形式',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* 基本情報設定 */}
                <div>
                  <Typography.Title level={5}>基本情報</Typography.Title>
                  <Row gutter={[16, 8]}>
                    {basicFields.map(field => (
                      <Col span={8} key={field.key}>
                        <Checkbox
                          checked={field.enabled}
                          onChange={(e) => {
                            setBasicFields(prev =>
                              prev.map(f =>
                                f.key === field.key ? { ...f, enabled: e.target.checked } : f
                              )
                            )
                          }}
                        >
                          {field.label}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                </div>

                {/* リスク項目設定 */}
                <div>
                  <Typography.Title level={5}>リスク項目</Typography.Title>
                  <Row gutter={[16, 8]}>
                    {riskTypes.map(riskType => (
                      <Col span={12} key={riskType.value}>
                        <Checkbox
                          checked={riskFields.includes(riskType.value)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRiskFields((prev: string[]) => [...prev, riskType.value])
                            } else {
                              setRiskFields((prev: string[]) => prev.filter(v => v !== riskType.value))
                            }
                          }}
                        >
                          {riskType.label}
                        </Checkbox>
                      </Col>
                    ))}
                  </Row>
                </div>

                {/* プレビュー表 */}
                <div>
                  <Typography.Title level={5}>プレビュー</Typography.Title>
                  <Table
                    columns={getTableColumns()}
                    dataSource={reportData}
                    rowKey="id"
                    scroll={{ x: 'max-content' }}
                    size="small"
                    pagination={false}
                  />
                </div>
              </Space>
            )
          },
          {
            key: 'text',
            label: 'テキスト形式',
            children: (
              <Space direction="vertical" style={{ width: '100%' }} size="large">
                {/* テンプレート設定 */}
                <div>
                  <Typography.Title level={5}>テンプレート設定</Typography.Title>
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Row gutter={16}>
                      <Col span={12}>
                        <div style={{ marginBottom: 8 }}>報告書タイトル:</div>
                        <Input
                          value={textTemplate.title}
                          onChange={(e) => setTextTemplate(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="契約書リスク分析報告書"
                        />
                      </Col>
                      <Col span={12}>
                        <div style={{ marginBottom: 8 }}>導入文:</div>
                        <Input
                          value={textTemplate.introduction}
                          onChange={(e) => setTextTemplate(prev => ({ ...prev, introduction: e.target.value }))}
                          placeholder="以下の契約書について、リスク分析を実施いたしました。"
                        />
                      </Col>
                    </Row>
                    <div>
                      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>契約情報フォーマット:</span>
                        <ContractVariableHelper
                          onInsert={(variable) => {
                            const currentValue = textTemplate.contractFormat || ''
                            setTextTemplate(prev => ({
                              ...prev,
                              contractFormat: currentValue + variable
                            }))
                          }}
                          placement="topRight"
                        />
                      </div>
                      <Input
                        value={textTemplate.contractFormat}
                        onChange={(e) => setTextTemplate(prev => ({ ...prev, contractFormat: e.target.value }))}
                        placeholder="{{開始日}}付{{契約名}}({{当事者}})"
                      />
                    </div>
                  </Space>
                </div>

                {/* リスク説明文の編集 */}
                <Collapse
                  items={[{
                    key: 'risk-descriptions',
                    label: <Typography.Title level={5} style={{ margin: 0 }}>リスク説明文のカスタマイズ</Typography.Title>,
                    children: (
                      <Space direction="vertical" style={{ width: '100%' }} size="small">
                        {riskTypes.filter(riskType =>
                          // 該当するリスクがある場合のみ表示
                          contracts.some((contract: Contract) =>
                            contract.contractRisks?.some((risk: any) => String(risk.type) === riskType.value)
                          )
                        ).map(riskType => (
                          <div key={riskType.value} style={{ marginBottom: 16 }}>
                            <div style={{ marginBottom: 8, fontWeight: 'bold' }}>
                              {riskType.label}:
                            </div>
                            <Input.TextArea
                              value={riskDescriptions[riskType.value] || ''}
                              onChange={(e) => setRiskDescriptions(prev => ({
                                ...prev,
                                [riskType.value]: e.target.value
                              }))}
                              rows={2}
                              placeholder="リスクの説明文を入力"
                            />
                          </div>
                        ))}
                      </Space>
                    )
                  }]}
                />

                {/* プレビュー */}
                <div>
                  <Typography.Title level={5}>プレビュー</Typography.Title>
                  <Input.TextArea
                    value={generateTextReport()}
                    rows={20}
                    readOnly
                    style={{ fontFamily: 'monospace', fontSize: '12px' }}
                  />
                </div>
              </Space>
            )
          }
        ]}
      />

      {/* テンプレート管理ドロワー */}
      <Drawer
        title="報告書テンプレート管理"
        placement="right"
        width={600}
        onClose={() => setTemplateDrawerVisible(false)}
        open={templateDrawerVisible}
        footer={
          <Space>
            <Button onClick={() => setTemplateDrawerVisible(false)}>閉じる</Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* テンプレート保存 */}
          <Card title="現在の設定をテンプレートとして保存" size="small">
            <Form form={templateForm} layout="vertical">
              <Form.Item
                name="name"
                label="テンプレート名"
                rules={[{ required: true, message: 'テンプレート名を入力してください' }]}
              >
                <Input placeholder="デフォルトテンプレート" />
              </Form.Item>
              <Form.Item>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={saveTemplate}
                  block
                >
                  テンプレートを保存
                </Button>
              </Form.Item>
            </Form>
          </Card>

          {/* 保存済みテンプレート一覧 */}
          <Card title="保存済みテンプレート" size="small">
            {savedTemplates.length === 0 ? (
              <Typography.Text type="secondary">
                保存済みのテンプレートはありません
              </Typography.Text>
            ) : (
              <List
                dataSource={savedTemplates}
                renderItem={(template) => (
                  <List.Item
                    actions={[
                      <Button
                        key="load"
                        type={selectedTemplateId === template.id ? 'primary' : 'default'}
                        size="small"
                        onClick={() => loadTemplate(template)}
                      >
                        適用
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="テンプレートを削除しますか？"
                        onConfirm={() => deleteTemplate(template.id)}
                        okText="削除"
                        cancelText="キャンセル"
                      >
                        <Button
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                        >
                          削除
                        </Button>
                      </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      title={template.name}
                      description={`作成日: ${new Date(template.createdAt || '').toLocaleDateString('ja-JP')}`}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Space>
      </Drawer>
    </Modal>
  )
}