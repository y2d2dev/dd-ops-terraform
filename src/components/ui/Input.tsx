import { Input as AntInput } from 'antd'
import styled from 'styled-components'

export const Input = styled(AntInput)`
  background-color: #FAFAFA !important;
  border-color: #9A9A9A !important;
  color: #252525 !important;
  
  &:hover {
    border-color: #252525 !important;
  }
  
  &:focus, &.ant-input-focused {
    border-color: #252525 !important;
    box-shadow: 0 0 0 2px rgba(37, 37, 37, 0.1) !important;
  }
  
  &::placeholder {
    color: #9A9A9A !important;
  }
`