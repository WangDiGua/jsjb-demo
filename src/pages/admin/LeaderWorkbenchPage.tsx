import { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Input,
  Button,
  Space,
  Modal,
  message,
  Form,
  Descriptions,
  Divider,
  Spin,
  Typography,
  Tabs,
} from 'antd';
import { SearchOutlined, EyeOutlined, CopyOutlined, EditOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { appealService, flowService, replyService } from '@/mock';
import type { Appeal, FlowRecord, Reply } from '@/mock/types';
import { useAppStore } from '@/store';
import { canLeaderInstructAppeal, canSuperviseAppeals, canUseLeaderWorkbench } from '@/mock/roles';
import AdminPageHeader from './AdminPageHeader';

const { TextArea } = Input;
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

type DeskTab = 'pending_instruct' | 'done_instruct' | 'pending_supervise' | 'done_supervise' | 'all';

export default function LeaderWorkbenchPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [tab, setTab] = useState<DeskTab>('pending_instruct');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [counts, setCounts] = useState({ pending_instruct: 0, done_instruct: 0, pending_supervise: 0, done_supervise: 0 });
  const [tick, setTick] = useState(0);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailAppeal, setDetailAppeal] = useState<Appeal | null>(null);
  const [detailReplies, setDetailReplies] = useState<Reply[]>([]);
  const [detailFlows, setDetailFlows] = useState<FlowRecord[]>([]);

  const [instructOpen, setInstructOpen] = useState(false);
  const [instructAppeal, setInstructAppeal] = useState<Appeal | null>(null);
  const [instructForm] = Form.useForm<{ content: string }>();

  const [superviseOpen, setSuperviseOpen] = useState(false);
  const [superviseAppeal, setSuperviseAppeal] = useState<Appeal | null>(null);
  const [superviseForm] = Form.useForm<{ note: string }>();

  const refetch = () => setTick((t) => t + 1);

  const loadCounts = useCallback(() => {
    if (!currentUser || !canUseLeaderWorkbench(currentUser.role)) return;
    void appealService.getLeaderDeskTabCounts(currentUser).then(setCounts);
  }, [currentUser]);

  useEffect(() => {
    loadCounts();
    window.addEventListener('jsjb-mock-updated', loadCounts);
    return () => window.removeEventListener('jsjb-mock-updated', loadCounts);
  }, [loadCounts]);

  useEffect(() => {
    const run = async () => {
      if (!currentUser || !canUseLeaderWorkbench(currentUser.role)) {
        setAppeals([]);
        setTotal(0);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const r = await appealService.getLeaderDeskAppeals(
          { tab, keyword: keyword || undefined, page, pageSize },
          currentUser,
        );
        setAppeals(r.data);
        setTotal(r.total);
      } finally {
        setLoading(false);
      }
    };
    void run();
  }, [tab, keyword, page, pageSize, tick, currentUser]);

  const openDetail = (a: Appeal) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailAppeal(null);
    setDetailReplies([]);
    setDetailFlows([]);
    void (async () => {
      try {
        const [ap, rep, flows] = await Promise.all([
          appealService.getAppeal(a.id),
          replyService.getRepliesForViewer(a.id, currentUser ?? null),
          flowService.getFlowRecords(a.id),
        ]);
        setDetailAppeal(ap);
        setDetailReplies(rep);
        setDetailFlows([...flows].sort((x, y) => x.createTime.localeCompare(y.createTime)));
      } finally {
        setDetailLoading(false);
      }
    })();
  };

  const copyContent = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      message.success('已复制诉求正文');
    } catch {
      message.error('复制失败，请手动选择复制');
    }
  };

  if (!currentUser || !canUseLeaderWorkbench(currentUser.role)) {
    return (
      <div className="min-h-full">
        <AdminPageHeader title="领导工作台" subtitle="校办、超管与二级单位领导办理" />
        <Card className="mt-4">当前账号无权使用领导工作台。</Card>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'pending_instruct',
      label: `待批示 (${counts.pending_instruct})`,
    },
    {
      key: 'done_instruct',
      label: `已批示 (${counts.done_instruct})`,
    },
    {
      key: 'pending_supervise',
      label: `待督办 (${counts.pending_supervise})`,
    },
    {
      key: 'done_supervise',
      label: `已督办 (${counts.done_supervise})`,
    },
    { key: 'all', label: '全部可见' },
  ];

  return (
    <div className="leader-workbench-page min-h-full">
      <AdminPageHeader
        title="领导工作台"
        subtitle="按页签查看待批示/已批示/待督办/已督办；支持关键字检索。诉求状态沿用系统既有「待受理、处理中」等标识。"
      />

      <main>
        <Card className="rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
          <Tabs
            activeKey={tab}
            items={tabItems}
            onChange={(k) => {
              setTab(k as DeskTab);
              setPage(1);
            }}
          />
          <Space wrap className="mb-4">
            <Input.Search
              placeholder="标题、正文或单号"
              prefix={<SearchOutlined />}
              allowClear
              onSearch={(v) => {
                setKeyword(v);
                setPage(1);
              }}
            />
          </Space>
          <Table<Appeal>
            loading={loading}
            rowKey="id"
            dataSource={appeals}
            columns={[
              { title: '单号', dataIndex: 'id', width: 108 },
              { title: '标题', dataIndex: 'title', ellipsis: true },
              {
                title: '状态',
                dataIndex: 'status',
                width: 120,
                render: (v: string) => <Tag color={statusMap[v]?.color}>{statusMap[v]?.text ?? v}</Tag>,
              },
              { title: '部门', dataIndex: 'departmentName', width: 120, ellipsis: true },
              { title: '更新时间', dataIndex: 'updateTime', width: 168 },
              {
                title: '操作',
                width: 220,
                render: (_, record) => (
                  <Space wrap size="small">
                    <Button size="small" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
                      详情
                    </Button>
                    {tab === 'pending_instruct' &&
                    canLeaderInstructAppeal(currentUser.role, record.departmentId, currentUser.departmentId) ? (
                      <Button
                        size="small"
                        type="primary"
                        icon={<EditOutlined />}
                        onClick={() => {
                          setInstructAppeal(record);
                          instructForm.resetFields();
                          setInstructOpen(true);
                        }}
                      >
                        批示
                      </Button>
                    ) : null}
                    {tab === 'pending_supervise' && canSuperviseAppeals(currentUser.role) &&
                    (currentUser.role !== 'dept_leader' || currentUser.departmentId === record.departmentId) ? (
                      <Button
                        size="small"
                        icon={<CheckCircleOutlined />}
                        onClick={() => {
                          setSuperviseAppeal(record);
                          superviseForm.resetFields();
                          setSuperviseOpen(true);
                        }}
                      >
                        办结督办
                      </Button>
                    ) : null}
                  </Space>
                ),
              },
            ]}
            pagination={{
              current: page,
              pageSize,
              total,
              onChange: setPage,
              showSizeChanger: false,
            }}
          />
        </Card>
      </main>

      <Modal
        title="诉求详情"
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailAppeal(null);
        }}
        width={900}
        footer={
          <Space>
            {detailAppeal ? (
              <Button icon={<CopyOutlined />} onClick={() => void copyContent(detailAppeal.content)}>
                复制诉求正文
              </Button>
            ) : null}
            <Button
              onClick={() => {
                setDetailOpen(false);
                setDetailAppeal(null);
              }}
            >
              关闭
            </Button>
          </Space>
        }
        destroyOnHidden
      >
        {detailLoading ? (
          <div className="flex justify-center py-16">
            <Spin />
          </div>
        ) : detailAppeal ? (
          <div className="space-y-2">
            <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="单号">{detailAppeal.id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={statusMap[detailAppeal.status]?.color}>{statusMap[detailAppeal.status]?.text}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="标题" span={2}>
                {detailAppeal.title}
              </Descriptions.Item>
              <Descriptions.Item label="部门">{detailAppeal.departmentName}</Descriptions.Item>
              <Descriptions.Item label="类型">{detailAppeal.type}</Descriptions.Item>
            </Descriptions>
            {detailAppeal.领导上报 ? (
              <>
                <Divider>上报记录</Divider>
                <Paragraph className="mb-1 text-sm">
                  <strong>{detailAppeal.领导上报.operatorName}</strong> · {detailAppeal.领导上报.time}
                </Paragraph>
                <Paragraph className="whitespace-pre-wrap text-sm">{detailAppeal.领导上报.reason}</Paragraph>
              </>
            ) : null}
            {detailAppeal.领导批示 ? (
              <>
                <Divider>领导批示</Divider>
                <Paragraph className="mb-1 text-sm">
                  <strong>{detailAppeal.领导批示.leaderName}</strong> · {detailAppeal.领导批示.time}
                </Paragraph>
                <Paragraph className="whitespace-pre-wrap text-sm">{detailAppeal.领导批示.content}</Paragraph>
              </>
            ) : null}
            <Divider>诉求正文</Divider>
            <Paragraph className="whitespace-pre-wrap">{detailAppeal.content}</Paragraph>
            <Divider>答复</Divider>
            {detailReplies.length === 0 ? (
              <Paragraph type="secondary">暂无答复</Paragraph>
            ) : (
              <ul className="m-0 list-none space-y-2 p-0">
                {detailReplies.map((r) => (
                  <li key={r.id} className="rounded border border-outline-variant/20 px-2 py-1 text-sm">
                    <span className="font-semibold">{r.handlerName}</span> · {r.createTime}
                    <Paragraph className="mb-0 mt-1 whitespace-pre-wrap">{r.content}</Paragraph>
                  </li>
                ))}
              </ul>
            )}
            <Divider>流转记录</Divider>
            <ol className="m-0 list-decimal space-y-1 pl-5 text-sm">
              {detailFlows.map((f) => (
                <li key={f.id}>
                  {flowActionLabel[f.action] ?? f.action} · {f.operatorName} · {f.createTime}
                  {f.content ? (
                    <Typography.Text type="secondary" className="mt-0.5 block text-sm">
                      {f.content}
                    </Typography.Text>
                  ) : null}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </Modal>

      <Modal
        title="领导批示"
        open={instructOpen}
        onCancel={() => {
          setInstructOpen(false);
          setInstructAppeal(null);
        }}
        onOk={() => instructForm.submit()}
        destroyOnHidden
      >
        <Form
          form={instructForm}
          layout="vertical"
          onFinish={async (v) => {
            if (!instructAppeal || !currentUser) return;
            const r = await appealService.submitLeaderInstruction(instructAppeal.id, v.content, {
              operatorId: currentUser.id,
              operatorName: currentUser.nickname,
            });
            if (r) {
              message.success('批示已保存，已提醒承办人');
              setInstructOpen(false);
              setInstructAppeal(null);
              refetch();
              loadCounts();
            } else message.error('当前不可批示');
          }}
        >
          <Form.Item name="content" label="批示意见" rules={[{ required: true, message: '请填写批示' }]}>
            <TextArea rows={6} placeholder="请填写指导性意见" />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="办结督办"
        open={superviseOpen}
        onCancel={() => {
          setSuperviseOpen(false);
          setSuperviseAppeal(null);
        }}
        onOk={() => superviseForm.submit()}
        destroyOnHidden
      >
        <Form
          form={superviseForm}
          layout="vertical"
          onFinish={async (v) => {
            if (!superviseAppeal || !currentUser) return;
            const r = await appealService.completeSupervision(superviseAppeal.id, v.note, {
              operatorId: currentUser.id,
              operatorName: currentUser.nickname,
            });
            if (r) {
              message.success('已记录督办办结');
              setSuperviseOpen(false);
              setSuperviseAppeal(null);
              refetch();
              loadCounts();
            } else message.error('当前不可办结督办');
          }}
        >
          <Form.Item name="note" label="督办意见/纪要" rules={[{ required: true, message: '请填写说明' }]}>
            <TextArea rows={4} placeholder="简要记录督办结论或交办要点" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
