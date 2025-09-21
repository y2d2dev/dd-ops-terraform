'use client'

import React from 'react'
import {
  FileTextOutlined,
  EditOutlined,
  WarningOutlined
} from '@ant-design/icons'
import styled from 'styled-components'
import { Card } from '@/components/ui/Card'
import { List } from '@/components/ui/List'
import { Button } from '@/components/ui/Button'
import { Space } from '@/components/ui/Space'
import { Tag } from '@/components/ui/Tag'
import { Title, Text } from '@/components/ui/Typography'
import { Checkbox } from '@/components/ui/Checkbox'

interface Contract {
  id: number
  fileName: string
  baseName?: string
  title?: string
  party?: string
  startDate?: string
  endDate?: string
  isSave: boolean
  reportGeneratedAt?: string
  createdAt: string
  contractRisks: any[]
}

interface FileItem {
  name: string
  publicUrl: string
  uploadedAt: string
}

interface GroupedFile {
  baseName: string
  pdfFile?: FileItem
  jsonFile?: FileItem
  isCompleted: boolean
}

interface ContractListProps {
  contracts: Contract[]
  groupedFiles: GroupedFile[]
  loading: boolean
  onEditFile: (item: any) => void
  selectedContractIds?: number[]
  onSelectContract?: (contractId: number, selected: boolean) => void
  targetCompany?: string
  jsonDataMap?: Map<string, any>
}

/**
 * Contract list component
 * @param props - Component properties
 * @returns JSX element
 */
export default function ContractList({
  contracts,
  groupedFiles,
  loading,
  onEditFile,
  selectedContractIds = [],
  onSelectContract,
  targetCompany,
  jsonDataMap = new Map()
}: ContractListProps) {
  // ファイルとコントラクトのマッピング
  const mappedData = groupedFiles.map(file => {
    // ファイルのPDFファイル名に対応する契約書を検索
    const matchingContract = contracts.find((contract: Contract) => {
      // PDFファイル名でマッチング（contract.fileNameにはPDFファイル名が保存されている）
      if (file.pdfFile && contract.fileName) {
        // ファイル名から拡張子とパスを除去して比較
        const pdfBaseName = file.pdfFile.name.replace(/\.pdf$/, '')
        const contractBaseName = contract.fileName.split('/').pop()?.replace(/\.pdf$/, '')
        return pdfBaseName === contractBaseName
      }

      // baseNameでマッチング（後方互換性のため）
      if (contract.baseName === file.baseName) {
        return true
      }
      return false
    })

    // JSONファイルから契約当事者情報を取得
    const jsonData = jsonDataMap.get(file.baseName)
    const jsonInfo = jsonData?.info

    // 契約当事者情報の優先順位：契約書レコード > JSONファイル
    const party = matchingContract?.party || jsonInfo?.party
    const title = matchingContract?.title || jsonInfo?.title || file.baseName

    // PDFとJSONのペアが揃っているかチェック
    const isCompleted = !!(file.pdfFile && file.jsonFile)

    // 対象会社チェック関数
    const checkTargetCompanyInContract = (party: string | undefined, targetCompany: string | undefined): boolean => {
      if (!targetCompany) return false // 対象会社が設定されていない場合は警告を出す
      if (!party) return false // 契約当事者情報がない場合は警告を出す

      const partyLower = party?.toLowerCase() || ''
      const target = targetCompany.toLowerCase()

      return partyLower.includes(target)
    }

    return {
      // ファイル情報（baseNameをベースに）
      baseName: file.baseName,
      isCompleted: isCompleted, // PDFとJSONのペアが揃っているかどうか
      pdfFile: file.pdfFile,
      jsonFile: file.jsonFile,
      // 表示名：契約書、JSONファイル、baseNameの順で優先
      displayName: title,
      // 契約書情報
      isSave: matchingContract?.isSave || false,
      contractRisks: matchingContract?.contractRisks || [],
      party: party,
      reportGeneratedAt: matchingContract?.reportGeneratedAt,
      contract: matchingContract,
      // 対象会社チェック結果
      showTargetCompanyWarning: !checkTargetCompanyInContract(party, targetCompany)
    }
  })

  // 選択可能な契約書（完了済み）のみを取得
  const selectableContracts = mappedData.filter(item => item.contract && item.isSave)
  const allSelected = selectableContracts.length > 0 &&
    selectableContracts.every(item => item.contract && selectedContractIds.includes(item.contract.id))
  const someSelected = selectedContractIds.length > 0 && !allSelected

  /**
   * Handle select all checkbox
   */
  const handleSelectAll = (e: any) => {
    if (!onSelectContract) return

    if (e.target.checked) {
      // 全て選択
      selectableContracts.forEach(item => {
        if (item.contract && !selectedContractIds.includes(item.contract.id)) {
          onSelectContract(item.contract.id, true)
        }
      })
    } else {
      // 全て解除
      selectableContracts.forEach(item => {
        if (item.contract && selectedContractIds.includes(item.contract.id)) {
          onSelectContract(item.contract.id, false)
        }
      })
    }
  }

  return (
    <FilesCard
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <FileTextOutlined />
            <Title level={4} style={{ margin: 0 }}>
              契約書一覧
            </Title>
          </Space>
          {onSelectContract && selectableContracts.length > 0 && (
            <Checkbox
              checked={allSelected}
              indeterminate={someSelected}
              onChange={handleSelectAll}
            >
              全て選択
            </Checkbox>
          )}
        </Space>
      }
    >
      <FileListContainer>
        <ScrollableArea>
          <List
            loading={loading}
            dataSource={mappedData}
            locale={{ emptyText: 'ファイルがありません' }}
            renderItem={(item: any) => {
              const canEdit = item.isCompleted

              return (
                <FileListItem>
                  {item.contract && onSelectContract && (
                    <Checkbox
                      checked={selectedContractIds.includes(item.contract.id)}
                      onChange={(e) => onSelectContract(item.contract.id, e.target.checked)}
                      disabled={!item.isSave}
                      style={{ marginRight: 12 }}
                    />
                  )}
                  <List.Item.Meta
                    title={
                      <Space>
                        <FileName>{item.baseName}</FileName>
                        {!item.isCompleted ? (
                          <FileStatusTag color="orange">処理中</FileStatusTag>
                        ) : item.reportGeneratedAt ? (
                          <FileStatusTag color="purple">
                            報告書作成済み：{(() => {
                              const date = new Date(item.reportGeneratedAt)
                              const year = date.getFullYear()
                              const month = String(date.getMonth() + 1).padStart(2, '0')
                              const day = String(date.getDate()).padStart(2, '0')
                              const hour = String(date.getHours()).padStart(2, '0')
                              const minute = String(date.getMinutes()).padStart(2, '0')
                              return `${year}年${month}月${day}日${hour}時${minute}分`
                            })()}
                          </FileStatusTag>
                        ) : item.isSave ? (
                          <FileStatusTag color="green">完了</FileStatusTag>
                        ) : (
                          <FileStatusTag color="gray">未着手</FileStatusTag>
                        )}
                        {/* {item.showTargetCompanyWarning && (
                          <WarningTag>
                            <WarningOutlined />
                            この契約書は対象会社が含まれていない契約書の可能性があります
                          </WarningTag>
                        )} */}
                      </Space>
                    }
                    description={
                      <Text type="secondary">
                        リスク数: {item.contractRisks?.length || 0}件
                        {item.contract?.title ? ` | ${item.contract?.title}` : ''}
                        {item.party ? (
                          <span> | {item.party}</span>
                        ) : (
                          <span> | 契約当事者情報なし</span>
                        )}
                      </Text>
                    }
                  />
                  <Button
                    type="primary"
                    icon={<EditOutlined />}
                    disabled={!canEdit}
                    onClick={() => onEditFile(item)}
                  >
                    編集
                  </Button>
                </FileListItem>
              )
            }}
          />
        </ScrollableArea>
      </FileListContainer>
    </FilesCard>
  )
}

// ファイルセクションカード
const FilesCard = styled(Card)`
  flex: 1;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  
  .ant-card-body {
    height: 100%;
    padding: 0;
    overflow: hidden;
  }
`

// ファイルリストコンテナ
const FileListContainer = styled.div`
  height: 100%;
  padding: 24px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`

// スクロール可能エリア
const ScrollableArea = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 8px;
  
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
`

// ファイルリストアイテム
const FileListItem = styled(List.Item)`
  padding: 16px;
  margin-bottom: 12px;
`

// ファイル名
const FileName = styled(Text)`
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
`

// ファイル状態タグ
const FileStatusTag = styled(Tag)`
  border-radius: 12px;
  font-weight: 500;
`

// 警告タグ
const WarningTag = styled(Tag)`
  border-radius: 12px;
  font-weight: 500;
  color: #d48806;
  background-color: #fff7e6;
  border-color: #d48806;
  margin-left: 8px;
`