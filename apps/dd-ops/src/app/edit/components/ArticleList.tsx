'use client'

import React from 'react'
import { Typography } from 'antd'
import styled from 'styled-components'
import { Article, ContractInfo } from '../types'
import { formatDateToJapanese } from '@/utils/dateFormat'

const { Title } = Typography

interface ArticleListProps {
  articles: Article[]
  contractInfo?: ContractInfo
  disableAiExtraction: boolean
  onTextSelection: () => void
}

/**
 * Article list component for displaying OCR results
 */
export default function ArticleList({
  articles,
  contractInfo,
  disableAiExtraction,
  onTextSelection
}: ArticleListProps) {
  return (
    <ScrollableContent>
      {contractInfo && (
        <ContractInfoCard>
          <Title level={3}>契約基本情報</Title>
          {contractInfo.title && (
            <InfoRow>
              <InfoLabel>タイトル:</InfoLabel>
              <InfoValue>{contractInfo.title}</InfoValue>
            </InfoRow>
          )}
          {contractInfo.party && (
            <InfoRow>
              <InfoLabel>当事者:</InfoLabel>
              <InfoValue>{contractInfo.party}</InfoValue>
            </InfoRow>
          )}
          {contractInfo.conclusion_date && (
            <InfoRow>
              <InfoLabel>契約締結日:</InfoLabel>
              <InfoValue>{formatDateToJapanese(contractInfo.conclusion_date)}</InfoValue>
            </InfoRow>
          )}
          {contractInfo.start_date && (
            <InfoRow>
              <InfoLabel>開始日:</InfoLabel>
              <InfoValue>{formatDateToJapanese(contractInfo.start_date)}</InfoValue>
            </InfoRow>
          )}
          {contractInfo.end_date && (
            <InfoRow>
              <InfoLabel>終了日:</InfoLabel>
              <InfoValue>{formatDateToJapanese(contractInfo.end_date)}</InfoValue>
            </InfoRow>
          )}
        </ContractInfoCard>
      )}
      
      {articles.map((article, index) => (
        <ArticleCard key={index}>
          <ArticleHeader>
            {article.table_number ? (
              <TableNumber>{article.table_number}</TableNumber>
            ) : (
              <ArticleNumber>{article.article_number}</ArticleNumber>
            )}
            <ArticleTitle>{article.title}</ArticleTitle>
          </ArticleHeader>
          {article.table_number ? (
            <TableContent 
              dangerouslySetInnerHTML={{ __html: article.content }}
            />
          ) : (
            <ArticleContent 
              onMouseUp={onTextSelection}
              style={{ 
                userSelect: disableAiExtraction ? 'none' : 'text',
                cursor: disableAiExtraction ? 'default' : 'text'
              }}
              title={disableAiExtraction ? '' : 'テキストを選択してリスクを手動追加'}
            >
              {article.content}
            </ArticleContent>
          )}
        </ArticleCard>
      ))}
    </ScrollableContent>
  )
}

// Styled Components
const ScrollableContent = styled.div`
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 24px;
`

const ContractInfoCard = styled.div`
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
`

const InfoRow = styled.div`
  display: flex;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
`

const InfoLabel = styled.div`
  font-weight: 600;
  color: #495057;
  min-width: 80px;
  margin-right: 12px;
`

const InfoValue = styled.div`
  color: #212529;
`

const ArticleCard = styled.div`
  background-color: white;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 16px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`

const ArticleHeader = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e9ecef;
`

const ArticleNumber = styled.div`
  background-color: #007bff;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  margin-right: 16px;
  min-width: 80px;
  text-align: center;
`

const ArticleTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #212529;
`

const ArticleContent = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: #495057;
  white-space: pre-wrap;
`

const TableNumber = styled.div`
  background-color: #52c41a;
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-weight: 600;
  margin-right: 16px;
  min-width: 80px;
  text-align: center;
`

const TableContent = styled.div`
  overflow-x: auto;
  
  table {
    border-collapse: collapse;
    font-size: 14px;
    line-height: 1.6;
    color: #495057;
    background-color: white;
    
    th, td {
      border: 1px solid #e9ecef;
      padding: 12px;
      text-align: left;
    }
    
    th {
      background-color: #f8f9fa;
      font-weight: 600;
      color: #212529;
    }
    
    tr:hover {
      background-color: #f8f9fa;
    }
    
    tr:nth-child(even) {
      background-color: #fafbfc;
    }
  }
`