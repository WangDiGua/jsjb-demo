import type { FlowAction, FlowRecord } from './types';

/**
 * 用户端（诉求者/访客）不应看到的办理节点：内部上报、领导批示、督办链路、答复审核管线等。
 * 管理端、领导工作台等仍使用完整 `getFlowRecords`。
 */
export const FLOW_ACTIONS_INTERNAL_ONLY = new Set<FlowAction>([
  'escalate',
  'instruct',
  'supervise',
  'report_leader',
  /** 内部送审节点；用户端已有「答复审核中」状态提示，此处不重复展示审核前后细节 */
  'reply_submit_review',
]);

export function filterFlowRecordsForPublicPortal(flows: FlowRecord[]): FlowRecord[] {
  return flows.filter((f) => !FLOW_ACTIONS_INTERNAL_ONLY.has(f.action));
}
