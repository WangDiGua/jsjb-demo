import { useState, useEffect, useRef } from 'react';
import {
  Alert,
  Card,
  Table,
  Tag,
  Input,
  Select,
  Button,
  Space,
  Dropdown,
  Modal,
  message,
  Form,
  Switch,
  Descriptions,
  Divider,
  Spin,
  Typography,
} from 'antd';
import {
  SearchOutlined,
  MoreOutlined,
  CheckOutlined,
  CloseOutlined,
  ExportOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  RiseOutlined,
  FlagOutlined,
  CopyOutlined,
  SwapOutlined,
  BookOutlined,
} from '@ant-design/icons';
import {
  appealService,
  aiService,
  APPEAL_STATUSES_ALLOW_TRANSFER,
  departmentService,
  mockUsers,
  questionTypeService,
  replyService,
  flowService,
} from '@/mock';
import type { Appeal, FlowRecord, QuestionType, Reply } from '@/mock/types';
import type { ReplyReferenceItem } from '@/mock/types';
import { useAppStore } from '@/store';
import { canAuditAppealReplies, canHandleAppeals } from '@/mock/roles';
import AdminPageHeader from './AdminPageHeader';

const { Option } = Select;
const { TextArea } = Input;
const { confirm } = Modal;

const { Paragraph } = Typography;

const flowActionLabel: Record<FlowRecord['action'], string> = {
  submit: '提交诉求',
  accept: '受理',
  transfer: '转派',
  reply: '答复',
  return: '退回',
  escalate: '上报',
  evaluate: '评价',
  urge: '催办',
  resubmit: '再次提交',
  instruct: '批示',
  supervise: '督办',
  report_leader: '校办关注',
  process: '办理中',
  reply_submit_review: '答复送审',
  reply_approve: '审核通过',
  reply_reject: '审核驳回',
};

const statusMap: Record<string, { color: string; text: string }> = {
  pending: { color: 'gold', text: '待受理' },
  accepted: { color: 'processing', text: '已受理' },
  processing: { color: 'blue', text: '处理中' },
  reply_draft: { color: 'purple', text: '待审核答复' },
  replied: { color: 'success', text: '已答复' },
  returned: { color: 'error', text: '已退回' },
  withdrawn: { color: 'default', text: '已撤销' },
  closed: { color: 'default', text: '已关闭' },
};

/** 办理侧可「上报领导 / 申请督办」的状态（不含待审答复/已答复，避免与答复流程叠用） */
const HANDLER_ESCALATION_STATUSES: Appeal['status'][] = ['pending', 'accepted', 'processing'];

function parseAppealCreateMs(t: string): number | null {
  const n = Date.parse(t.replace(/-/g, '/'));
  return Number.isNaN(n) ? null : n;
}

/** 演示：未办结且提交超过 7 天视为可能超期 */
function isAppealOverdueSlack(a: Appeal): boolean {
  if (['replied', 'closed', 'withdrawn'].includes(a.status)) return false;
  const ms = parseAppealCreateMs(a.createTime);
  if (ms == null) return false;
  return (Date.now() - ms) / 86400000 > 7;
}

function isAppealFinished(a: Appeal): boolean {
  return a.status === 'replied' || a.status === 'closed';
}

function leaderAuditDisplay(a: Appeal): { text: string; color: string } {
  if (a.领导批示) return { text: '已批示', color: 'success' };
  if (a.上报领导) return { text: '待领导批示', color: 'processing' };
  if (a.status === 'reply_draft') return { text: '待发布审核', color: 'purple' };
  return { text: '—', color: 'default' };
}

function evalStatusDisplay(a: Appeal): { text: string; color: string } {
  if (a.评价) return { text: `已评价（${a.评价.rating}★）`, color: 'success' };
  if (a.status === 'replied' || a.status === 'closed') return { text: '待评价', color: 'default' };
  return { text: '—', color: 'default' };
}

function appealSubmitterUser(a: Appeal) {
  if (a.isAnonymous) return null;
  return mockUsers.find((x) => x.id === a.userId) ?? null;
}

function submitterUsername(a: Appeal): string {
  const u = appealSubmitterUser(a);
  return u?.username ?? a.userId;
}

function fmtHours(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v}h`;
}

function fmtDaysFromProcessHours(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${(v / 24).toFixed(1)}`;
}

export default function AppealsManagePage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const canAudit = currentUser ? canAuditAppealReplies(currentUser.role) : false;
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [type, setType] = useState<string>('all');
  const [tick, setTick] = useState(0);
  const [qTypes, setQTypes] = useState<QuestionType[]>([]);

  const [replyOpen, setReplyOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [rejectAuditOpen, setRejectAuditOpen] = useState(false);
  const [activeAppeal, setActiveAppeal] = useState<Appeal | null>(null);
  const [replyForm] = Form.useForm<{ content: string; isPublic: boolean }>();
  const [returnForm] = Form.useForm<{ reason: string }>();
  const [transferForm] = Form.useForm<{ departmentId: string }>();
  const [rejectAuditForm] = Form.useForm<{ reason: string }>();
  const [reportOpen, setReportOpen] = useState(false);
  const [superviseReqOpen, setSuperviseReqOpen] = useState(false);
  const [reportForm] = Form.useForm<{ reason: string }>();
  const [superviseReqForm] = Form.useForm<{ level: 'normal' | 'urgent'; note: string }>();
  const [aiTransferLoading, setAiTransferLoading] = useState(false);
  const [replyAiLoading, setReplyAiLoading] = useState(false);
  const [replySubmitting, setReplySubmitting] = useState(false);
  const [refCandidates, setRefCandidates] = useState<ReplyReferenceItem[]>([]);
  const [refIndex, setRefIndex] = useState(0);
  const [refLoading, setRefLoading] = useState(false);
  const [transferBriefLoading, setTransferBriefLoading] = useState(false);
  const [transferBriefText, setTransferBriefText] = useState('');
  const transferBriefAbortRef = useRef<AbortController | null>(null);
  const [transferDupLoading, setTransferDupLoading] = useState(false);
  const [transferDupResult, setTransferDupResult] = useState<Awaited<ReturnType<typeof aiService.duplicateCheck>> | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAppeal, setDetailAppeal] = useState<Appeal | null>(null);
  const [detailReplies, setDetailReplies] = useState<Reply[]>([]);
  const [detailFlows, setDetailFlows] = useState<FlowRecord[]>([]);
  const [deptSelectOptions, setDeptSelectOptions] = useState<{ value: string; label: string }[]>([]);

  const openDetail = (appeal: Appeal) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailAppeal(null);
    setDetailReplies([]);
    setDetailFlows([]);
    void (async () => {
      try {
        const [a, r, f] = await Promise.all([
          appealService.getAppeal(appeal.id),
          replyService.getRepliesForViewer(appeal.id, currentUser ?? null),
          flowService.getFlowRecords(appeal.id),
        ]);
        setDetailAppeal(a);
        setDetailReplies(r);
        const sorted = [...f].sort((x, y) => x.createTime.localeCompare(y.createTime));
        setDetailFlows(sorted);
      } finally {
        setDetailLoading(false);
      }
    })();
  };

  const closeDetail = () => {
    setDetailOpen(false);
    setDetailAppeal(null);
    setDetailReplies([]);
    setDetailFlows([]);
  };

  useEffect(() => {
    void questionTypeService.getQuestionTypes().then(setQTypes);
  }, [tick]);

  useEffect(() => {
    const loadDepts = () => {
      void departmentService.getDepartments().then((deps) =>
        setDeptSelectOptions(deps.map((d) => ({ value: d.id, label: d.name }))),
      );
    };
    loadDepts();
    window.addEventListener('jsjb-mock-updated', loadDepts);
    return () => window.removeEventListener('jsjb-mock-updated', loadDepts);
  }, []);

  useEffect(() => {
    if (!replyOpen || !activeAppeal) {
      setRefCandidates([]);
      setRefIndex(0);
      setRefLoading(false);
      return;
    }
    setRefLoading(true);
    setRefIndex(0);
    void aiService
      .getReplyReferenceCandidates(activeAppeal.id, { limit: 4 })
      .then((items) => setRefCandidates(items))
      .catch(() => setRefCandidates([]))
      .finally(() => setRefLoading(false));
  }, [replyOpen, activeAppeal?.id]);

  useEffect(() => {
    const fetchAppeals = async () => {
      setLoading(true);
      try {
        const result = await appealService.getAppeals(
          {
            keyword: keyword || undefined,
            status: status !== 'all' ? status : undefined,
            type: type !== 'all' ? type : undefined,
            page,
            pageSize,
          },
          currentUser ?? null,
        );
        setAppeals(result.data);
        setTotal(result.total);
      } finally {
        setLoading(false);
      }
    };
    void fetchAppeals();
  }, [page, status, type, keyword, tick, currentUser]);

  const refetch = () => setTick((t) => t + 1);

  const exportCsv = () => {
    if (!appeals.length) {
      message.info('当前页无数据');
      return;
    }
    const headers = [
      '序号',
      '编号',
      '标题',
      '类型',
      '承办部门',
      '办理进度',
      '是否办结',
      '领导审核',
      '是否超期',
      '办理用时天',
      '诉求者',
      '诉求者单位',
      '账号',
      '查阅状态',
      '提交时间',
      '浏览数',
      '是否满意',
      '满意时间',
      '响应用时h',
      '最后操作时间',
      '联系方式',
      '评价状态',
      '公开',
      '匿名',
    ];
    const lines = [headers.join(',')].concat(
      appeals.map((a, i) => {
        const u = appealSubmitterUser(a);
        const la = leaderAuditDisplay(a);
        const ev = evalStatusDisplay(a);
        const cells = [
          String((page - 1) * pageSize + i + 1),
          a.id,
          a.title,
          a.type,
          a.departmentName,
          statusMap[a.status]?.text ?? a.status,
          isAppealFinished(a) ? '是' : '否',
          la.text,
          isAppealOverdueSlack(a) ? '是' : '否',
          fmtDaysFromProcessHours(a.处理时长),
          a.isAnonymous ? '匿名' : a.userName,
          a.isAnonymous ? '匿名' : u?.department ?? '—',
          a.isAnonymous ? '—' : u?.username ?? a.userId,
          (a.浏览量 ?? 0) > 0 ? '有浏览' : '无浏览',
          a.createTime,
          String(a.浏览量 ?? 0),
          a.评价 ? '是' : '否',
          a.评价?.time ?? '',
          a.响应时长 ?? '',
          a.updateTime,
          a.isAnonymous ? '—' : u?.phone ?? '—',
          ev.text,
          a.isPublic ? '是' : '否',
          a.isAnonymous ? '是' : '否',
        ];
        return cells.map((c) => JSON.stringify(String(c))).join(',');
      }),
    );
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `appeals_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('已导出当前页');
  };

  const handleAction = (appeal: Appeal, action: string) => {
    if (action === 'detail') {
      openDetail(appeal);
      return;
    }
    if (!currentUser) {
      message.error('会话已失效，请重新登录');
      return;
    }
    const op = { operatorId: currentUser.id, operatorName: currentUser.nickname };
    if (action === 'accept') {
      confirm({
        title: '确认受理',
        content: `确定受理「${appeal.title}」吗？`,
        onOk: async () => {
          const r = await appealService.acceptAppeal(appeal.id, op);
          if (r) {
            message.success('受理成功');
            refetch();
          } else message.error('当前状态不可受理');
        },
      });
      return;
    }
    if (action === 'reply') {
      if (appeal.上报领导 && !appeal.领导批示) {
        message.warning('已上报领导批示，请先等待领导批示后再提交答复送审。');
        return;
      }
      setActiveAppeal(appeal);
      replyForm.resetFields();
      replyForm.setFieldsValue({ content: '', isPublic: true });
      setReplyOpen(true);
      return;
    }
    if (action === 'return') {
      setActiveAppeal(appeal);
      returnForm.resetFields();
      setReturnOpen(true);
      return;
    }
    if (action === 'transfer') {
      setActiveAppeal(appeal);
      transferForm.resetFields();
      transferForm.setFieldsValue({ departmentId: appeal.departmentId });
      transferBriefAbortRef.current?.abort();
      setTransferBriefText('');
      setTransferDupResult(null);
      setTransferOpen(true);
      return;
    }
    if (action === 'approve_audit') {
      confirm({
        title: '审核通过',
        content: `发布「${appeal.title}」的待审答复？用户将立即看到答复内容。`,
        onOk: async () => {
          const r = await appealService.approveReply(appeal.id, op);
          if (r) {
            message.success('已发布');
            refetch();
          } else message.error('当前状态不可审核');
        },
      });
      return;
    }
    if (action === 'reject_audit') {
      setActiveAppeal(appeal);
      rejectAuditForm.resetFields();
      setRejectAuditOpen(true);
      return;
    }
    if (action === 'report_leader_action') {
      if (appeal.上报领导) {
        message.warning('该诉求已上报过领导，不可重复上报。');
        return;
      }
      if (!HANDLER_ESCALATION_STATUSES.includes(appeal.status)) {
        message.warning('当前已进入答复审核或已办结，不可再上报领导。');
        return;
      }
      setActiveAppeal(appeal);
      reportForm.resetFields();
      setReportOpen(true);
      return;
    }
    if (action === 'supervision_request_action') {
      if (appeal.上报领导 && !appeal.领导批示) {
        message.warning('待领导批示期间请先完成批示流程，再申请校办督办。');
        return;
      }
      if (!HANDLER_ESCALATION_STATUSES.includes(appeal.status)) {
        message.warning('当前已进入答复审核或已办结，不可再申请督办。');
        return;
      }
      setActiveAppeal(appeal);
      superviseReqForm.resetFields();
      superviseReqForm.setFieldsValue({ level: 'normal', note: '' });
      setSuperviseReqOpen(true);
    }
  };

  const queueSummary = [
    { key: 'pending', label: '待受理', count: appeals.filter((a) => a.status === 'pending').length, icon: 'hourglass_top' },
    { key: 'processing', label: '办理中', count: appeals.filter((a) => ['accepted', 'processing'].includes(a.status)).length, icon: 'sync' },
    { key: 'reply_draft', label: '待审核', count: appeals.filter((a) => a.status === 'reply_draft').length, icon: 'rate_review' },
    { key: 'replied', label: '已答复', count: appeals.filter((a) => isAppealFinished(a)).length, icon: 'task_alt' },
  ];

  return (
    <div className="appeals-manage-page min-h-full">
      <AdminPageHeader title="诉求管理" subtitle="受理、转派、答复送审与审核发布" />

      <main className="grid gap-5 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="admin-queue-card sticky top-28 hidden self-start rounded-[2rem] p-5 xl:block">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">QUEUE LANES</p>
          <h2 className="mt-2 font-headline text-xl font-black text-on-surface">受理队列</h2>
          <div className="mt-5 space-y-3">
            {queueSummary.map((lane) => (
              <button
                key={lane.key}
                type="button"
                className="flex w-full items-center gap-3 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest/72 px-3 py-3 text-left hover:border-primary/35"
                onClick={() => {
                  setStatus(lane.key === 'processing' ? 'processing' : lane.key);
                  setPage(1);
                }}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <span className="material-symbols-outlined text-[20px]">{lane.icon}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-on-surface">{lane.label}</span>
                  <span className="text-xs text-on-surface-variant">当前页 {lane.count} 件</span>
                </span>
                <span className="font-headline text-xl font-black text-primary">{lane.count}</span>
              </button>
            ))}
          </div>
          <Button className="mt-5 w-full rounded-2xl" onClick={() => { setStatus('all'); setPage(1); }}>
            查看全部
          </Button>
        </aside>

        <section className="min-w-0">
        <Card className="filter-card rounded-[1.5rem] border-outline-variant/20 shadow-[0_18px_44px_rgba(29,79,113,0.09)]">
          <Space wrap>
            <Input.Search
              placeholder="搜索标题或内容"
              prefix={<SearchOutlined />}
              allowClear
              onSearch={(v) => {
                setKeyword(v);
                setPage(1);
              }}
            />
            <Select value={status} onChange={(v) => { setStatus(v); setPage(1); }} style={{ width: 140 }}>
              <Option value="all">全部状态</Option>
              {Object.entries(statusMap).map(([k, v]) => (
                <Option key={k} value={k}>
                  {v.text}
                </Option>
              ))}
            </Select>
            <Select value={type} onChange={(v) => { setType(v); setPage(1); }} style={{ width: 140 }}>
              <Option value="all">全部类型</Option>
              {qTypes.map((t) => (
                <Option key={t.id} value={t.name}>
                  {t.name}
                </Option>
              ))}
            </Select>
            <Button icon={<ExportOutlined />} onClick={exportCsv}>
              导出
            </Button>
          </Space>
        </Card>

        <Card className="table-card mt-4 rounded-[1.5rem] border-outline-variant/20 shadow-[0_18px_44px_rgba(29,79,113,0.09)]">
          <Table
            loading={loading}
            dataSource={appeals}
            rowKey="id"
            size="small"
            scroll={{ x: 2900 }}
            columns={[
              {
                title: '序号',
                width: 56,
                fixed: 'left',
                render: (_, __, index) => (page - 1) * pageSize + index + 1,
              },
              { title: '编号', dataIndex: 'id', width: 168, fixed: 'left', ellipsis: true },
              { title: '诉求标题', dataIndex: 'title', width: 200, ellipsis: true },
              {
                title: '诉求类别',
                dataIndex: 'type',
                width: 100,
                render: (v: string) => (
                  <Tag className="!mr-0" bordered>
                    {v}
                  </Tag>
                ),
              },
              { title: '承办部门', dataIndex: 'departmentName', width: 120, ellipsis: true },
              {
                title: '办理进度',
                dataIndex: 'status',
                width: 112,
                render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text ?? v}</Tag>,
              },
              {
                title: '是否办结',
                width: 88,
                render: (_, a: Appeal) =>
                  isAppealFinished(a) ? (
                    <Tag color="success">是</Tag>
                  ) : (
                    <Tag>否</Tag>
                  ),
              },
              {
                title: '领导审核',
                width: 108,
                render: (_, a: Appeal) => {
                  const x = leaderAuditDisplay(a);
                  return x.text === '—' ? (
                    <span className="text-on-surface-variant">—</span>
                  ) : (
                    <Tag color={x.color}>{x.text}</Tag>
                  );
                },
              },
              {
                title: '是否超期',
                width: 88,
                render: (_, a: Appeal) =>
                  isAppealOverdueSlack(a) ? (
                    <Tag color="error">是</Tag>
                  ) : (
                    <Tag>否</Tag>
                  ),
              },
              {
                title: '办理用时(天)',
                width: 104,
                render: (_, a: Appeal) => fmtDaysFromProcessHours(a.处理时长),
              },
              {
                title: '诉求者',
                dataIndex: 'userName',
                width: 100,
                ellipsis: true,
                render: (v: string, a: Appeal) => (a.isAnonymous ? '匿名' : v),
              },
              {
                title: '诉求者单位',
                width: 120,
                ellipsis: true,
                render: (_, a: Appeal) => {
                  const u = appealSubmitterUser(a);
                  return a.isAnonymous ? '匿名' : u?.department ?? '—';
                },
              },
              {
                title: '账号',
                width: 120,
                ellipsis: true,
                render: (_, a: Appeal) => (a.isAnonymous ? '—' : submitterUsername(a)),
              },
              {
                title: '查阅状态',
                width: 92,
                render: (_, a: Appeal) =>
                  (a.浏览量 ?? 0) > 0 ? <Tag>有浏览</Tag> : <Tag>无浏览</Tag>,
              },
              { title: '提交时间', dataIndex: 'createTime', width: 156 },
              { title: '浏览数', dataIndex: '浏览量', width: 72 },
              {
                title: '是否满意',
                width: 84,
                render: (_, a: Appeal) => (a.评价 ? <Tag color="success">是</Tag> : <Tag>否</Tag>),
              },
              {
                title: '满意时间',
                width: 156,
                render: (_, a: Appeal) => a.评价?.time ?? '—',
              },
              {
                title: '响应用时',
                width: 88,
                render: (_, a: Appeal) => fmtHours(a.响应时长),
              },
              { title: '最后操作时间', dataIndex: 'updateTime', width: 156 },
              {
                title: '联系方式',
                width: 112,
                render: (_, a: Appeal) => (a.isAnonymous ? '—' : appealSubmitterUser(a)?.phone ?? '—'),
              },
              {
                title: '评价状态',
                width: 128,
                render: (_, a: Appeal) => {
                  const x = evalStatusDisplay(a);
                  return x.text === '—' ? (
                    <span className="text-on-surface-variant">—</span>
                  ) : (
                    <Tag color={x.color}>{x.text}</Tag>
                  );
                },
              },
              {
                title: '首次答复耗时',
                width: 100,
                render: (_, a: Appeal) => fmtHours(a.响应时长),
              },
              {
                title: '操作',
                width: 160,
                fixed: 'right',
                render: (_, record) => (
                  <Dropdown
                    menu={{
                      items: [
                        { key: 'detail', label: '查看详情', icon: <EyeOutlined />, show: true },
                        { key: 'accept', label: '受理', icon: <CheckOutlined />, show: record.status === 'pending' },
                        {
                          key: 'reply',
                          label: '答复送审',
                          icon: <CheckOutlined />,
                          show:
                            (record.status === 'accepted' || record.status === 'processing') &&
                            !(record.上报领导 && !record.领导批示),
                        },
                        { key: 'return', label: '退回', icon: <CloseOutlined />, show: record.status === 'pending' },
                        {
                          key: 'transfer',
                          label: '转派',
                          icon: <MoreOutlined />,
                          show: APPEAL_STATUSES_ALLOW_TRANSFER.includes(record.status as Appeal['status']),
                        },
                        {
                          key: 'approve_audit',
                          label: '审核通过',
                          icon: <CheckOutlined />,
                          show: canAudit && record.status === 'reply_draft',
                        },
                        {
                          key: 'reject_audit',
                          label: '审核驳回',
                          icon: <CloseOutlined />,
                          show: canAudit && record.status === 'reply_draft',
                        },
                        {
                          key: 'report_leader_action',
                          label: '上报领导批示',
                          icon: <RiseOutlined />,
                          show:
                            !!currentUser &&
                            canHandleAppeals(currentUser.role) &&
                            HANDLER_ESCALATION_STATUSES.includes(record.status as Appeal['status']) &&
                            !record.上报领导,
                        },
                        {
                          key: 'supervision_request_action',
                          label: '申请校办督办',
                          icon: <FlagOutlined />,
                          show:
                            !!currentUser &&
                            canHandleAppeals(currentUser.role) &&
                            HANDLER_ESCALATION_STATUSES.includes(record.status as Appeal['status']) &&
                            !(record.上报领导 && !record.领导批示),
                        },
                      ]
                        .filter((item) => item.show)
                        .map((item) => ({
                          key: item.key,
                          label: item.label,
                          icon: item.icon,
                        })),
                      onClick: ({ key }) => handleAction(record, key),
                    }}
                  >
                    <Button size="small" icon={<MoreOutlined />}>
                      操作
                    </Button>
                  </Dropdown>
                ),
              },
            ]}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showSizeChanger: false,
              showQuickJumper: true,
            }}
          />
        </Card>
        </section>
      </main>

      <Modal
        title={
          detailAppeal ? (
            <span className="truncate pr-6" title={detailAppeal.title}>
              诉求详情
            </span>
          ) : (
            '诉求详情'
          )
        }
        open={detailOpen}
        onCancel={closeDetail}
        footer={
          <Space>
            {detailAppeal ? (
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  void navigator.clipboard.writeText(detailAppeal.content).then(
                    () => message.success('已复制诉求正文'),
                    () => message.error('复制失败'),
                  );
                }}
              >
                复制正文
              </Button>
            ) : null}
            <Button onClick={closeDetail}>关闭</Button>
            {detailAppeal ? (
              <Button
                type="link"
                href={`/user/appeal/detail/${detailAppeal.id}`}
                target="_blank"
                rel="noreferrer"
              >
                在用户端页打开
              </Button>
            ) : null}
          </Space>
        }
        width={900}
        styles={{ body: { maxHeight: 'min(72vh, 720px)', overflowY: 'auto', paddingTop: 12 } }}
        destroyOnHidden
      >
        {detailLoading ? (
          <div className="flex justify-center py-16">
            <Spin tip="加载详情…" />
          </div>
        ) : detailAppeal ? (
          <div className="space-y-2">
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} labelStyle={{ width: 96 }}>
              <Descriptions.Item label="编号">{detailAppeal.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detailAppeal.status]?.color}>{statusMap[detailAppeal.status]?.text ?? detailAppeal.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>
                {detailAppeal.title}
              </Descriptions.Item>
              <Descriptions.Item label="类型">{detailAppeal.type}</Descriptions.Item>
              <Descriptions.Item label="部门">{detailAppeal.departmentName}</Descriptions.Item>
              <Descriptions.Item label="提交人">{detailAppeal.isAnonymous ? '匿名' : detailAppeal.userName}</Descriptions.Item>
              <Descriptions.Item label="浏览">{detailAppeal.浏览量 ?? 0}</Descriptions.Item>
              <Descriptions.Item label="提交时间">{detailAppeal.createTime}</Descriptions.Item>
              <Descriptions.Item label="更新时间">{detailAppeal.updateTime}</Descriptions.Item>
              <Descriptions.Item label="公开">{detailAppeal.isPublic ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="响应/办理(h)">
                {[detailAppeal.响应时长 ?? '—', detailAppeal.处理时长 ?? '—'].join(' / ')}
              </Descriptions.Item>
              <Descriptions.Item label="上报领导">{detailAppeal.上报领导 ? '是' : '否'}</Descriptions.Item>
              <Descriptions.Item label="督办等级">{detailAppeal.督办等级 ?? 'none'}</Descriptions.Item>
            </Descriptions>

            {detailAppeal.领导上报 ? (
              <>
                <Divider>上报记录</Divider>
                <div className="rounded border border-outline-variant/20 bg-surface-container-lowest/80 px-3 py-2 text-sm">
                  <div className="font-semibold">
                    {detailAppeal.领导上报.operatorName} · {detailAppeal.领导上报.time}
                  </div>
                  <Paragraph className="mb-0 mt-2 whitespace-pre-wrap">{detailAppeal.领导上报.reason}</Paragraph>
                </div>
              </>
            ) : null}

            {detailAppeal.领导批示 ? (
              <>
                <Divider>领导批示</Divider>
                <div className="rounded border border-outline-variant/20 bg-surface-container-lowest/80 px-3 py-2 text-sm">
                  <div className="font-semibold">
                    {detailAppeal.领导批示.leaderName} · {detailAppeal.领导批示.time}
                  </div>
                  <Paragraph className="mb-0 mt-2 whitespace-pre-wrap">{detailAppeal.领导批示.content}</Paragraph>
                </div>
              </>
            ) : null}

            {detailAppeal.评价 ? (
              <>
                <Divider>用户评价</Divider>
                <div className="rounded border border-outline-variant/20 bg-surface-container-lowest/80 px-3 py-2 text-sm">
                  <span className="font-semibold">{detailAppeal.评价.rating} 星</span>
                  {detailAppeal.评价.comment ? (
                    <Paragraph className="mb-0 mt-2 whitespace-pre-wrap">{detailAppeal.评价.comment}</Paragraph>
                  ) : null}
                  <div className="mt-1 text-on-surface-variant">{detailAppeal.评价.time}</div>
                </div>
              </>
            ) : null}

            <Divider>诉求正文</Divider>
            <Paragraph className="mb-0 whitespace-pre-wrap text-on-surface">{detailAppeal.content}</Paragraph>

            <Divider>答复记录（含草稿，与管理端权限一致）</Divider>
            {detailReplies.length === 0 ? (
              <Paragraph type="secondary" className="mb-0">
                暂无答复
              </Paragraph>
            ) : (
              <ul className="m-0 list-none space-y-3 p-0">
                {detailReplies.map((rep) => (
                  <li key={rep.id} className="rounded-lg border border-outline-variant/25 bg-surface/80 px-3 py-2">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{rep.handlerName}</span>
                      <Tag color={rep.publishStatus === 'draft' ? 'orange' : 'green'}>
                        {rep.publishStatus === 'draft' ? '草稿' : '已发布'}
                      </Tag>
                      <span className="text-xs text-on-surface-variant">{rep.createTime}</span>
                    </div>
                    <Paragraph className="mb-0 whitespace-pre-wrap text-sm">{rep.content}</Paragraph>
                  </li>
                ))}
              </ul>
            )}

            <Divider>办理流程</Divider>
            {detailFlows.length === 0 ? (
              <Paragraph type="secondary" className="mb-0">
                暂无流程节点
              </Paragraph>
            ) : (
              <ol className="m-0 list-decimal space-y-2 pl-5 text-sm">
                {detailFlows.map((flow) => (
                  <li key={flow.id}>
                    <span className="font-medium">{flowActionLabel[flow.action] ?? flow.action}</span>
                    <span className="text-on-surface-variant"> · {flow.operatorName} · {flow.createTime}</span>
                    {flow.content ? (
                      <div className="mt-1 rounded bg-surface-container-high/60 px-2 py-1 text-on-surface">{flow.content}</div>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <Paragraph type="secondary">未找到该诉求</Paragraph>
        )}
      </Modal>

      <Modal
        title="答复送审"
        open={replyOpen}
        onCancel={() => {
          setReplyOpen(false);
          setActiveAppeal(null);
          setRefCandidates([]);
          setRefIndex(0);
          setReplySubmitting(false);
        }}
        destroyOnHidden
        confirmLoading={replySubmitting}
        okButtonProps={{ disabled: replyAiLoading }}
        onOk={() => replyForm.submit()}
        width={760}
      >
        <p className="mb-3 text-sm text-on-surface-variant">
          提交后将由超管/校办审核，通过前用户无法在详情中查看答复正文。若本单已「上报领导批示」，须等领导出具批示后方可送审。
        </p>
        <Form
          form={replyForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!activeAppeal || !currentUser) return;
            setReplySubmitting(true);
            try {
              // 敏感词仅在 submitReplyForReview 内检测一次，避免重复请求大模型导致确定按钮长时间无响应
              const r = await appealService.submitReplyForReview(
                activeAppeal.id,
                values.content,
                values.isPublic,
                { operatorId: currentUser.id, operatorName: currentUser.nickname },
              );
              if (r) {
                message.success('已提交审核');
                setReplyOpen(false);
                setActiveAppeal(null);
                refetch();
              } else message.error('当前不可送审（若已上报领导，请先等待领导批示后再答复）');
            } catch (e) {
              message.error(e instanceof Error ? e.message : '提交失败');
            } finally {
              setReplySubmitting(false);
            }
          }}
        >
          <Form.Item label="答复内容" required>
            <Space direction="vertical" className="w-full" size="middle">
              <div className="grid gap-2 sm:grid-cols-2">
                <Button
                  icon={<ThunderboltOutlined />}
                  loading={replyAiLoading}
                  disabled={!activeAppeal}
                  onClick={async () => {
                    if (!activeAppeal) return;
                    setReplyAiLoading(true);
                    try {
                      const draft = await aiService.aiDraftOfficialReplyForAppeal({
                        title: activeAppeal.title,
                        type: activeAppeal.type,
                        departmentName: activeAppeal.departmentName,
                        content: activeAppeal.content,
                      });
                      replyForm.setFieldsValue({ content: draft.trim() });
                      message.success('已生成答复草稿，请修改后再提交送审');
                    } catch (e) {
                      message.error(e instanceof Error ? e.message : '生成失败，请手写答复');
                    } finally {
                      setReplyAiLoading(false);
                    }
                  }}
                >
                  AI 一键生成答复草稿
                </Button>
              </div>

              <Alert
                type="info"
                showIcon
                icon={<BookOutlined />}
                message="智能题库（参考已办结公开工单）"
                description="基于语义相似度从本校真实工单库中匹配同类诉求及已发布答复，仅供范式参考；请勿原样照抄，请结合本案事实修改后送审。"
                className="text-sm"
              />

              {refLoading ? (
                <div className="flex items-center gap-2 py-2 text-sm text-on-surface-variant">
                  <Spin size="small" />
                  正在匹配参考工单…
                </div>
              ) : refCandidates.length > 0 ? (
                <div className="rounded-lg border border-primary/20 bg-primary/[0.04] px-3 py-3 dark:bg-primary/10">
                  {(() => {
                    const cur = refCandidates[refIndex]!;
                    return (
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <Space>
                            <Tag color="blue">相似度 {Math.round(cur.similarity * 100)}%</Tag>
                            <span className="max-w-[420px] truncate text-sm font-semibold text-on-surface" title={cur.title}>
                              {cur.title}
                            </span>
                          </Space>
                          <Space size="small" wrap>
                            <Button
                              size="small"
                              icon={<SwapOutlined />}
                              onClick={() => setRefIndex((i) => (i + 1) % refCandidates.length)}
                            >
                              换一换
                            </Button>
                            <Button
                              size="small"
                              type="primary"
                              onClick={() => {
                                replyForm.setFieldsValue({ content: cur.referenceReply.trim() });
                                message.success('已填入参考答复，请按本案修改后再提交');
                              }}
                            >
                              一键选用并编辑
                            </Button>
                          </Space>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-on-surface-variant">参考工单摘要</div>
                          <Paragraph className="mb-0 mt-1 text-sm text-on-surface">{cur.caseSummary}</Paragraph>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-on-surface-variant">参考答复（已发布）</div>
                          <Paragraph className="mb-0 mt-1 max-h-40 overflow-y-auto whitespace-pre-wrap rounded border border-outline-variant/25 bg-surface/80 px-2 py-2 text-sm">
                            {cur.referenceReply}
                          </Paragraph>
                        </div>
                        <div className="text-xs text-on-surface-variant/90">
                          单号{' '}
                          <a href={`/user/appeal/detail/${cur.appealId}`} target="_blank" rel="noreferrer" className="font-mono">
                            {cur.appealId}
                          </a>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <Alert type="warning" showIcon message="暂无可用参考" description="库中尚无已办结公开的同类工单，请使用 AI 帮写或手工撰写。" />
              )}

              <Form.Item name="content" noStyle rules={[{ required: true, message: '请输入答复内容' }]}>
                <TextArea rows={8} placeholder="支持纯文本；可使用 AI 帮写或智能题库选用后，务必按本案修改再提交" />
              </Form.Item>
            </Space>
          </Form.Item>
          <Form.Item name="isPublic" label="通过后是否公开" valuePropName="checked">
            <Switch checkedChildren="公开" unCheckedChildren="不公开" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="退回补充材料"
        open={returnOpen}
        onCancel={() => {
          setReturnOpen(false);
          setActiveAppeal(null);
        }}
        destroyOnHidden
        onOk={() => returnForm.submit()}
      >
        <Form
          form={returnForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!activeAppeal || !currentUser) return;
            try {
              const sens = await aiService.checkSensitiveWords(String(values.reason).trim());
              if (!sens.ok) {
                message.error('内容安全检测未完成，请检查网络或大模型配置');
                return;
              }
              if (sens.hasSensitive) {
                message.error(`退回原因包含不适宜表述：${sens.words.join('、')}`);
                return;
              }
            } catch {
              message.error('敏感词检测失败');
              return;
            }
            const r = await appealService.returnAppeal(activeAppeal.id, values.reason, {
              operatorId: currentUser.id,
              operatorName: currentUser.nickname,
            });
            if (r) {
              message.success('已退回用户');
              setReturnOpen(false);
              setActiveAppeal(null);
              refetch();
            } else message.error('当前状态不可退回');
          }}
        >
          <Form.Item name="reason" label="退回原因" rules={[{ required: true, message: '请说明退回原因' }]}>
            <TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="转派部门"
        open={transferOpen}
        onCancel={() => {
          transferBriefAbortRef.current?.abort();
          setTransferBriefText('');
          setTransferDupResult(null);
          setTransferOpen(false);
          setActiveAppeal(null);
        }}
        destroyOnHidden
        onOk={() => transferForm.submit()}
      >
        {activeAppeal ? (
          <Alert
            type="info"
            showIcon
            className="mb-3"
            message="当前待转派诉求"
            description={activeAppeal.title}
          />
        ) : null}
        <Button
          type="primary"
          ghost
          block
          className="mb-4"
          icon={<ThunderboltOutlined />}
          loading={aiTransferLoading}
          disabled={!activeAppeal}
          onClick={async () => {
            if (!activeAppeal) return;
            const text = `标题：${activeAppeal.title}\n问题类型：${activeAppeal.type}\n正文：${activeAppeal.content}`.trim().slice(0, 1200);
            setAiTransferLoading(true);
            try {
              const r = await aiService.matchDepartment(text);
              transferForm.setFieldsValue({ departmentId: r.department.id });
              message.success(
                `AI 推荐：${r.department.name}（置信度约 ${Math.round(r.confidence * 100)}%，请核对后再提交转派）`,
                4,
              );
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'AI 推荐失败，请手动选择部门');
            } finally {
              setAiTransferLoading(false);
            }
          }}
        >
          AI 根据正文推荐目标部门
        </Button>
        <Button
          block
          className="mb-2"
          loading={transferDupLoading}
          disabled={!activeAppeal}
          onClick={async () => {
            if (!activeAppeal) return;
            const text = `${activeAppeal.title}\n${activeAppeal.content}`.trim().slice(0, 800);
            setTransferDupLoading(true);
            setTransferDupResult(null);
            try {
              setTransferDupResult(await aiService.duplicateCheck(text));
              message.success('判重完成，请结合列表人工复核');
            } catch (e) {
              message.error(e instanceof Error ? e.message : '判重失败');
            } finally {
              setTransferDupLoading(false);
            }
          }}
        >
          智能判重（与公开库比对）
        </Button>
        {transferDupResult ? (
          <Alert
            type={transferDupResult.isDuplicate ? 'warning' : 'info'}
            showIcon
            className="mb-3"
            message={transferDupResult.isDuplicate ? '可能存在同类公开诉求' : '未见强重复'}
            description={
              transferDupResult.hits.length > 0 ? (
                <ul className="m-0 mb-0 list-disc pl-4">
                  {transferDupResult.hits.slice(0, 5).map((h) => (
                    <li key={h.id}>
                      <a href={`/user/appeal/detail/${h.id}`} target="_blank" rel="noreferrer">
                        {h.title}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                '未检索到相近公开工单标题，仍请结合全文人工判断。'
              )
            }
          />
        ) : null}
        <Button
          block
          type="default"
          className="mb-2"
          loading={transferBriefLoading}
          disabled={!activeAppeal}
          icon={<ThunderboltOutlined />}
          onClick={async () => {
            if (!activeAppeal) return;
            const seed = `标题：${activeAppeal.title}\n类型：${activeAppeal.type}\n正文：${activeAppeal.content}`
              .trim()
              .slice(0, 1500);
            transferBriefAbortRef.current?.abort();
            const ac = new AbortController();
            transferBriefAbortRef.current = ac;
            setTransferBriefLoading(true);
            setTransferBriefText('');
            try {
              await aiService.explainDispatchStream(
                seed,
                (delta) => {
                  setTransferBriefText((prev) => prev + delta);
                },
                ac.signal,
              );
            } catch (e) {
              if (!(e instanceof DOMException && e.name === 'AbortError')) {
                message.error(e instanceof Error ? e.message : '生成失败');
              }
            } finally {
              if (transferBriefAbortRef.current === ac) transferBriefAbortRef.current = null;
              setTransferBriefLoading(false);
            }
          }}
        >
          生成转派说明（对内沟通参考）
        </Button>
        <TextArea
          className="mb-2"
          rows={5}
          readOnly
          value={transferBriefText}
          placeholder="点击上方按钮生成派单/协同说明，可复制到 OA 或工作群"
        />
        <Button
          block
          className="mb-4"
          disabled={!transferBriefText.trim()}
          onClick={() => {
            void navigator.clipboard.writeText(transferBriefText.trim());
            message.success('已复制转派说明');
          }}
        >
          复制说明全文
        </Button>
        <Form
          form={transferForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!activeAppeal || !currentUser) return;
            const r = await appealService.transferAppeal(activeAppeal.id, values.departmentId, {
              operatorId: currentUser.id,
              operatorName: currentUser.nickname,
            });
            if (r) {
              message.success('转派成功');
              setTransferOpen(false);
              setActiveAppeal(null);
              refetch();
            } else message.error('转派失败');
          }}
        >
          <Form.Item name="departmentId" label="目标部门" rules={[{ required: true, message: '请选择部门' }]}>
            <Select placeholder="选择部门" showSearch optionFilterProp="label" options={deptSelectOptions} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="驳回答复"
        open={rejectAuditOpen}
        onCancel={() => {
          setRejectAuditOpen(false);
          setActiveAppeal(null);
        }}
        destroyOnHidden
        onOk={() => rejectAuditForm.submit()}
      >
        <Form
          form={rejectAuditForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!activeAppeal || !currentUser) return;
            const r = await appealService.rejectReply(activeAppeal.id, values.reason, {
              operatorId: currentUser.id,
              operatorName: currentUser.nickname,
            });
            if (r) {
              message.success('已驳回，处理员可修改后重新送审');
              setRejectAuditOpen(false);
              setActiveAppeal(null);
              refetch();
            } else message.error('当前状态不可驳回');
          }}
        >
          <Form.Item name="reason" label="驳回原因" rules={[{ required: true, message: '请填写原因' }]}>
            <TextArea rows={4} placeholder="说明需修改之处" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="上报领导批示"
        open={reportOpen}
        onCancel={() => {
          setReportOpen(false);
          setActiveAppeal(null);
        }}
        destroyOnHidden
        onOk={() => reportForm.submit()}
      >
        <p className="mb-3 text-sm text-on-surface-variant">
          将记录上报原因、操作人与时间，并通知校办领导待办。同一诉求仅可上报一次；在领导出具批示前，不可提交「答复送审」，也不可「申请校办督办」。诉求状态仍保持为当前「
          {activeAppeal ? statusMap[activeAppeal.status]?.text ?? activeAppeal.status : '—'}」等系统既有状态。
        </p>
        <Form
          form={reportForm}
          layout="vertical"
          onFinish={async (values) => {
            if (!activeAppeal || !currentUser) return;
            const r = await appealService.reportToLeader(activeAppeal.id, values.reason, {
              operatorId: currentUser.id,
              operatorName: currentUser.nickname,
            });
            if (r) {
              message.success('已上报，领导端将收到待办');
              setReportOpen(false);
              setActiveAppeal(null);
              refetch();
            } else message.error('当前不可上报（可能已上报过，或已进入答复审核/办结）');
          }}
        >
          <Form.Item name="reason" label="上报原因" rules={[{ required: true, message: '请填写上报原因' }]}>
            <TextArea rows={4} placeholder="说明需请领导关注与批示的要点" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="申请校办督办"
        open={superviseReqOpen}
        onCancel={() => {
          setSuperviseReqOpen(false);
          setActiveAppeal(null);
        }}
        destroyOnHidden
        onOk={() => superviseReqForm.submit()}
      >
        <p className="mb-3 text-sm text-on-surface-variant">
          在「待领导批示」期间不可申请督办；已进入「待审核答复」或「已答复」后亦不可再申请。
        </p>
        <Form
          form={superviseReqForm}
          layout="vertical"
          initialValues={{ level: 'normal' }}
          onFinish={async (values) => {
            if (!activeAppeal || !currentUser) return;
            const r = await appealService.requestSupervision(activeAppeal.id, values.level, values.note, {
              operatorId: currentUser.id,
              operatorName: currentUser.nickname,
            });
            if (r) {
              message.success('已申请督办，领导工作台「待督办」可见');
              setSuperviseReqOpen(false);
              setActiveAppeal(null);
              refetch();
            } else message.error('申请失败（若待领导批示中请先完成批示，或已进入答复审核/办结）');
          }}
        >
          <Form.Item name="level" label="紧急程度" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'normal', label: '一般' },
                { value: 'urgent', label: '紧急' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="情况说明" rules={[{ required: true, message: '请填写说明' }]}>
            <TextArea rows={4} placeholder="督办关注要点与时限期望" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
