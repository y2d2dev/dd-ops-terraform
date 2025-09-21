import { Button as AntButton } from 'antd'
import styled from 'styled-components'

export const Button = styled(AntButton)`
  &.ant-btn-primary {
    background-color: #252525 !important;
    border-color: #252525 !important;
    
    &:hover:not(:disabled) {
      background-color: #9A9A9A !important;
      border-color: #9A9A9A !important;
    }
    
    &:focus {
      background-color: #252525 !important;
      border-color: #252525 !important;
    }
    
    &:active {
      background-color: #9A9A9A !important;
      border-color: #9A9A9A !important;
    }
  }
  
  &.ant-btn-default {
    background-color: #FAFAFA !important;
    border-color: #9A9A9A !important;
    color: #252525 !important;
    
    &:hover:not(:disabled) {
      background-color: #9A9A9A !important;
      border-color: #252525 !important;
      color: #FAFAFA !important;
    }
    
    &:focus {
      background-color: #FAFAFA !important;
      border-color: #9A9A9A !important;
      color: #252525 !important;
    }
    
    &:active {
      background-color: #9A9A9A !important;
      border-color: #252525 !important;
      color: #FAFAFA !important;
    }
  }
`