import zhCN from 'antd/locale/zh_CN';
import rcPaginationZhCN from '@rc-component/pagination/es/locale/zh_CN';

/**
 * Ant Design 全局 locale：显式挂载 rc-pagination 中文包，避免 Table 内部分页「快速跳页」回退为 Go to / Page。
 */
export const appAntdLocale = {
  ...zhCN,
  Pagination: {
    ...rcPaginationZhCN,
    ...(zhCN as { Pagination?: typeof rcPaginationZhCN }).Pagination,
    jump_to: '前往',
    page: '页',
    jump_to_confirm: '确定',
  },
};
