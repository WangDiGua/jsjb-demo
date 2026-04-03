import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Switch, Button, Space, message, Tag } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';
import { adminConfigService } from '@/mock/adminConfigService';
import type { ScheduledJobRow } from '@/mock/adminConfigTypes';
import { useAppStore } from '@/store';
import AdminPageHeader from '../AdminPageHeader';

const statusTag: Record<ScheduledJobRow['status'], string> = {
  idle: 'default',
  running: 'processing',
  failed: 'error',
  success: 'success',
};

export default function SchedulerPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const [rows, setRows] = useState<ScheduledJobRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setRows(b.scheduledJobs);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (id: string, enabled: boolean) => {
    await adminConfigService.updateScheduledJob(id, { enabled }, currentUser?.nickname ?? '管理员');
    message.success(enabled ? '已启用' : '已停用');
    void load();
  };

  const runDemo = async (id: string) => {
    await adminConfigService.runScheduledJobDemo(id, currentUser?.nickname ?? '管理员');
    message.success('已触发执行并完成记录');
    void load();
  };

  return (
    <div className="min-h-full">
      <AdminPageHeader title="调度管理" subtitle="Cron 表达式与启用状态；支持手动触发单次运行并写入审计日志" />
      <Card className="rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
        <Table
          loading={loading}
          rowKey="id"
          dataSource={rows}
          columns={[
            { title: '任务', dataIndex: 'name' },
            { title: 'Cron', dataIndex: 'cron', width: 120, className: 'font-mono text-xs' },
            {
              title: '启用',
              dataIndex: 'enabled',
              width: 100,
              render: (en: boolean, r: ScheduledJobRow) => (
                <Switch checked={en} onChange={(v) => void toggle(r.id, v)} />
              ),
            },
            {
              title: '状态',
              dataIndex: 'status',
              width: 100,
              render: (s: ScheduledJobRow['status']) => <Tag color={statusTag[s]}>{s}</Tag>,
            },
            { title: '上次运行', dataIndex: 'lastRun', width: 170 },
            {
              title: '操作',
              width: 140,
              render: (_, r: ScheduledJobRow) => (
                <Space>
                  <Button type="link" icon={<PlayCircleOutlined />} onClick={() => void runDemo(r.id)}>
                    立即执行
                  </Button>
                </Space>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
