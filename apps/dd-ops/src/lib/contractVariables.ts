/**
 * Contract variable definitions and utilities
 */

export interface ContractVariable {
  key: string;
  displayName: string;
  description: string;
  example: string;
  category: 'basic' | 'date' | 'party';
}

export const CONTRACT_VARIABLES: ContractVariable[] = [
  // 基本情報
  {
    key: '契約名',
    displayName: '契約名',
    description: '契約の名称',
    example: 'ソフトウェア開発業務委託契約',
    category: 'basic'
  },
  
  // 日付関連
  {
    key: '開始日',
    displayName: '契約開始日',
    description: '契約の開始日',
    example: '2024年4月1日',
    category: 'date'
  },
  {
    key: '終了日',
    displayName: '契約終了日',
    description: '契約の終了日',
    example: '2025年3月31日',
    category: 'date'
  },
  {
    key: '締結日',
    displayName: '契約締結日',
    description: '契約を締結した日',
    example: '2024年3月15日',
    category: 'date'
  },
  
  // 当事者情報
  {
    key: '当事者',
    displayName: '当事者',
    description: '契約の当事者',
    example: '株式会社〇〇, △△株式会社',
    category: 'party'
  }
];

/**
 * Convert variable key to user-friendly display format
 */
export function formatVariable(key: string): string {
  return `{{${key}}}`;
}

/**
 * Get variable by key
 */
export function getVariableByKey(key: string): ContractVariable | undefined {
  return CONTRACT_VARIABLES.find(v => v.key === key);
}

/**
 * Parse variables from text
 */
export function parseVariables(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

/**
 * Replace variables in text with actual values
 */
export function replaceVariables(
  text: string,
  values: Record<string, string>
): string {
  return text.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    return values[key] || match;
  });
}

/**
 * Get variables grouped by category
 */
export function getVariablesByCategory(): Record<string, ContractVariable[]> {
  return CONTRACT_VARIABLES.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, ContractVariable[]>);
}

/**
 * Category display names
 */
export const CATEGORY_NAMES: Record<string, string> = {
  basic: '基本情報',
  date: '日付',
  party: '当事者'
};