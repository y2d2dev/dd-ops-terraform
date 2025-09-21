'use client'

import React from 'react'
import { ConfigProvider } from 'antd'
import { StyleProvider } from '@ant-design/cssinjs'
import locale from 'antd/locale/ja_JP'

/**
 * Ant Design provider component with Japanese locale
 * @param children - Child components to render
 * @returns JSX element
 */
export function AntdProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider
      locale={locale}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <StyleProvider hashPriority="high">
        {children}
      </StyleProvider>
    </ConfigProvider>
  )
}