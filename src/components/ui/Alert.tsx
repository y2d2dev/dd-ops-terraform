import { Alert as AntAlert } from 'antd'
import styled from 'styled-components'

export const Alert = styled(AntAlert)`
  background: #FAFAFA !important;
  border: 1px solid #9A9A9A !important;
  
  .ant-alert-message {
    color: #252525 !important;
  }
  
  .ant-alert-description {
    color: #252525 !important;
  }
  
  &.ant-alert-error {
    background: #FAFAFA !important;
    border-color: #252525 !important;
  }
  
  &.ant-alert-warning {
    background: #FAFAFA !important;
    border-color: #9A9A9A !important;
  }
  
  &.ant-alert-info {
    background: #FAFAFA !important;
    border-color: #9A9A9A !important;
  }
  
  &.ant-alert-success {
    background: #FAFAFA !important;
    border-color: #252525 !important;
  }
`