import { Table as AntTable } from 'antd'
import styled from 'styled-components'

export const Table = styled(AntTable)`
  background: #FAFAFA !important;
  
  .ant-table {
    background: #FAFAFA !important;
  }
  
  .ant-table-thead > tr > th {
    background: #FAFAFA !important;
    color: #252525 !important;
    border-bottom: 1px solid #9A9A9A !important;
  }
  
  .ant-table-tbody > tr > td {
    background: #FAFAFA !important;
    color: #252525 !important;
    border-bottom: 1px solid #9A9A9A !important;
  }
  
  .ant-table-tbody > tr:hover > td {
    background: #9A9A9A !important;
  }
`