import { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Table, Select, DatePicker, Button, Space, message } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, ClockCircleOutlined, RiseOutlined, ExportOutlined } from '@ant-design/icons';
import { statisticsService } from '@/mock';
import type { Statistics } from '@/mock/types';
import AdminPageHeader from './AdminPageHeader';
import HotWordCloud from '@/components/portal/HotWordCloud';

const { RangePicker } = DatePicker;

export default function StatisticsPage() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const data = await statisticsService.getStatistics();
        setStats(data);
      } catch (e) {
        message.error(e instanceof Error ? e.message : '统计数据加载失败');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return (
    <div className="statistics-page min-h-full">
      <AdminPageHeader
        title="数据统计"
        subtitle="多维度质效分析与报表导出"
        extra={
          <Space wrap>
            <Select defaultValue="week" style={{ width: 120 }}>
              <Select.Option value="week">本周</Select.Option>
              <Select.Option value="month">本月</Select.Option>
              <Select.Option value="year">本年</Select.Option>
            </Select>
            <RangePicker />
            <Button
              icon={<ExportOutlined />}
              onClick={() => message.success('演示环境：已生成报表导出任务（实际项目可对接下载）')}
            >
              导出报表
            </Button>
          </Space>
        }
      />

      <main>
        <Row gutter={[16, 16]} className="stats-row">
          <Col span={6}>
            <Card className="stat-card rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
              <Statistic title="诉求总量" value={stats?.诉求总量 || 0} prefix={<FileTextOutlined />} loading={loading} />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
              <Statistic title="已答复" value={stats?.已答复 || 0} prefix={<CheckCircleOutlined />} styles={{ content: { color: 'var(--success-color, #2a9d7a)' } }} loading={loading} />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
              <Statistic title="平均响应时长" value={stats?.平均响应时长 || 0} suffix="小时" prefix={<ClockCircleOutlined />} loading={loading} />
            </Card>
          </Col>
          <Col span={6}>
            <Card className="stat-card rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
              <Statistic title="满意度" value={stats?.满意度 || 0} suffix="分" prefix={<RiseOutlined />} styles={{ content: { color: 'var(--primary-color)' } }} loading={loading} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card title="部门处理效率" className="table-card rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
              <Table
                loading={loading}
                dataSource={stats?.部门排名 || []}
                rowKey="departmentId"
                pagination={false}
                columns={[
                  { title: '部门', dataIndex: 'departmentName' },
                  { title: '受理数', dataIndex: 'count' },
                  { title: '平均处理时长', dataIndex: 'avgTime', render: (v) => `${v}小时` },
                ]}
              />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="热点词云" className="table-card rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
              <HotWordCloud items={stats?.热点词云 || []} />
              <p className="mt-3 text-center text-xs text-on-surface-variant">
                词频明细见管理端统计与台账；字形大小表示相对热度。
              </p>
            </Card>
          </Col>
        </Row>
      </main>

      <style>{`
        .stats-row { margin-bottom: 16px; }
      `}</style>
    </div>
  );
}
