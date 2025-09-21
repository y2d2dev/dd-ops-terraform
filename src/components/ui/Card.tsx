import { Card as AntCard } from 'antd'
import styled from 'styled-components'

export const Card = styled(AntCard)`
  background: #FAFAFA !important;
  border: 1px solid #9A9A9A !important;
  border-radius: 6px !important;
  overflow: hidden !important;
  
  .ant-card-head {
    background: #FAFAFA !important;
    border-bottom: 1px solid #9A9A9A !important;
    border-radius: 0 !important;
    color: #252525 !important;
    margin: 0 !important;
    
    .ant-card-head-title {
      color: #252525 !important;
    }
  }
  
  .ant-card-body {
    background: #FAFAFA !important;
    color: #252525 !important;
    border-radius: 0 !important;
    margin: 0 !important;
    padding: 24px !important;
  }
  
  /* ヘッダーがない場合のbodyの上角 */
  &:not(.ant-card-contain-head) .ant-card-body {
    border-top-left-radius: 5px !important;
    border-top-right-radius: 5px !important;
  }
  
  /* ヘッダーがある場合のheadの上角 */
  &.ant-card-contain-head .ant-card-head {
    border-top-left-radius: 5px !important;
    border-top-right-radius: 5px !important;
  }
  
  /* bodyの下角 */
  .ant-card-body {
    border-bottom-left-radius: 5px !important;
    border-bottom-right-radius: 5px !important;
  }
`