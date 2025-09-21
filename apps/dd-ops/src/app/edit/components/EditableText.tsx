'use client'

import React from 'react'
import { Input } from 'antd'
import styled from 'styled-components'

const { TextArea } = Input

interface EditableTextProps {
  value: string
  riskId: string
  field: string
  placeholder?: string
  multiline?: boolean
  row?: number
  editingRisk: string | null
  editingField: string | null
  editValue: string
  disableAiExtraction?: boolean
  onStartEditing: (riskId: string, field: string, value: string) => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onValueChange: (value: string) => void
  onKeyPress: (e: React.KeyboardEvent) => void
}

const EditableTextInput = styled(Input)`
  font-size: 12px;
`

const EditableTextArea = styled(TextArea)`
  font-size: 12px;
`

const EditableTextSpan = styled.span`
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 2px;
  transition: background-color 0.2s;
  min-height: 20px;
  display: inline-block;
  width: 100%;
  
  &:hover {
    background-color: #f0f0f0;
  }
`

/**
 * Editable text component for inline editing
 */
export default function EditableText({
  value,
  riskId,
  field,
  placeholder,
  multiline = false,
  row,
  editingRisk,
  editingField,
  editValue,
  disableAiExtraction = false,
  onStartEditing,
  onSaveEdit,
  onValueChange,
  onKeyPress
}: EditableTextProps) {
  const isEditing = editingRisk === riskId && editingField === field

  if (isEditing) {
    return multiline ? (
      <EditableTextArea
        value={editValue}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyPress}
        onBlur={onSaveEdit}
        autoFocus
        rows={row || 3}
        placeholder={placeholder}
      />
    ) : (
      <EditableTextInput
        value={editValue}
        onChange={(e) => onValueChange(e.target.value)}
        onKeyDown={onKeyPress}
        onBlur={onSaveEdit}
        autoFocus
        placeholder={placeholder}
      />
    )
  }

  return (
    <EditableTextSpan
      onClick={() => !disableAiExtraction && onStartEditing(riskId, field, value)}
      style={{ 
        cursor: disableAiExtraction ? 'default' : 'pointer',
        opacity: disableAiExtraction ? 0.7 : 1
      }}
      title={disableAiExtraction ? '保存済みリスクのため編集できません' : 'クリックして編集'}
      dangerouslySetInnerHTML={{
        __html: value || placeholder || ''
      }}
    />
  )
}