import { Typography as AntTypography } from 'antd'
import styled from 'styled-components'

export const Typography = AntTypography

export const Title = styled(AntTypography.Title)`
  color: #252525 !important;
`

export const Text = styled(AntTypography.Text)`
  color: #252525 !important;
  
  &.ant-typography-caption {
    color: #9A9A9A !important;
  }
  
  &[type="secondary"] {
    color: #9A9A9A !important;
  }
`

export const Paragraph = styled(AntTypography.Paragraph)`
  color: #252525 !important;
`

export const Link = styled(AntTypography.Link)`
  color: #252525 !important;
  
  &:hover {
    color: #9A9A9A !important;
  }
`