import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Empty,
  message,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import {
  BellOutlined,
  CloudDownloadOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import { weeklyReportService, canViewAllData } from '@/mock';
import type { WeeklyReportSnapshot } from '@/mock/types';
import { useAppStore } from '@/store';
import AdminPageHeader from './AdminPageHeader';
import HotWordCloud from '@/components/portal/HotWordCloud';

dayjs.extend(isoWeek);

function downloadText(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function WeeklyReportPage() {
  const currentUser = useAppStore((s) => s.currentUser);
  const canManage = currentUser ? canViewAllData(currentUser.role) : false;
  const [searchParams, setSearchParams] = useSearchParams();

  const [weekAnchor, setWeekAnchor] = useState<Dayjs>(() => dayjs().startOf('isoWeek'));
  const [preview, setPreview] = useState<WeeklyReportSnapshot | null>(null);
  const [savedList, setSavedList] = useState<WeeklyReportSnapshot[]>([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [loadingPush, setLoadingPush] = useState(false);

  const selectedSavedId = searchParams.get('saved');

  const loadSaved = useCallback(async () => {
    const list = await weeklyReportService.list();
    setSavedList(list);
    return list;
  }, []);

  const runPreview = useCallback(async (anchor: Dayjs) => {
    setLoadingPreview(true);
    try {
      const d = anchor.startOf('isoWeek').toDate();
      const snap = await weeklyReportService.previewForDate(d);
      setPreview(snap);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '预览失败');
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  useEffect(() => {
    void loadSaved();
  }, [loadSaved]);

  useEffect(() => {
    void runPreview(weekAnchor);
  }, [weekAnchor, runPreview]);

  const display = useMemo(() => {
    if (selectedSavedId) {
      const hit = savedList.find((x) => x.id === selectedSavedId);
      if (hit) return { mode: 'saved' as const, report: hit };
    }
    return { mode: 'preview' as const, report: preview };
  }, [selectedSavedId, savedList, preview]);

  const report = display.report;

  const syncUrlAfterSave = (id: string) => {
    setSearchParams({ saved: id }, { replace: true });
  };

  const handleGenerateSave = async () => {
    if (!currentUser || !canManage) {
      message.warning('仅超管或校办可生成并归档周报');
      return;
    }
    setLoadingSave(true);
    try {
      const snap = await weeklyReportService.generateAndSave(weekAnchor.startOf('isoWeek').toDate(), currentUser);
      message.success('已生成并归档');
      await loadSaved();
      syncUrlAfterSave(snap.id);
      setPreview(snap);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '保存失败');
    } finally {
      setLoadingSave(false);
    }
  };

  const handlePush = async () => {
    if (!report?.id || !currentUser) return;
    if (!canManage) {
      message.warning('仅超管或校办可推送');
      return;
    }
    setLoadingPush(true);
    try {
      const r = await weeklyReportService.notifyManagers(report.id, currentUser);
      message.success(`已推送站内信（${r.pushed} 人）`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : '推送失败');
    } finally {
      setLoadingPush(false);
    }
  };

  const handleDownloadWord = () => {
    if (!report) return;
    const html = weeklyReportService.buildWordHtml(report);
    const safe = report.weekLabel.replace(/[/\\?%*:|"<>]/g, '_');
    downloadText(html, `${safe}.doc`, 'application/msword;charset=utf-8');
    message.success('已下载 Word 兼容文档（HTML，可用 Word 打开另存为 docx）');
  };

  return (
    <div className="weekly-report-page min-h-full pb-10">
      <AdminPageHeader
        title="周报生成"
        subtitle="按自然周（周一至周日）聚合要情、热点、督办、质效指标；支持归档、下载与站内推送（演示）"
        extra={
          <Space wrap>
            <DatePicker
              picker="week"
              value={weekAnchor}
              onChange={(d) => {
                if (!d) return;
                setWeekAnchor(d);
                setSearchParams({});
              }}
              format="YYYY 第 wo 周"
              allowClear={false}
            />
            <Button icon={<ReloadOutlined />} loading={loadingPreview} onClick={() => void runPreview(weekAnchor)}>
              刷新预览
            </Button>
            {canManage ? (
              <Button type="primary" icon={<SaveOutlined />} loading={loadingSave} onClick={() => void handleGenerateSave()}>
                生成并归档
              </Button>
            ) : null}
            {canManage ? (
              <Button icon={<BellOutlined />} loading={loadingPush} disabled={!report} onClick={() => void handlePush()}>
                推送校办及相关人员
              </Button>
            ) : null}
            <Button icon={<CloudDownloadOutlined />} disabled={!report} onClick={handleDownloadWord}>
              下载 Word
            </Button>
          </Space>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span className="text-sm text-on-surface-variant">已归档周报</span>
        <Select
          allowClear
          placeholder="查看历史归档（可选）"
          style={{ minWidth: 280 }}
          value={selectedSavedId ?? undefined}
          onChange={(id) => {
            if (id) setSearchParams({ saved: id });
            else setSearchParams({});
          }}
          options={savedList.map((r) => ({
            value: r.id,
            label: `${r.weekLabel} · ${r.generatedAt}`,
          }))}
        />
        {display.mode === 'saved' ? <Tag color="blue">当前为已归档版本</Tag> : <Tag>当前为实时预览（所选周）</Tag>}
      </div>

      {!report ? (
        <Empty description={loadingPreview ? '加载中…' : '暂无数据'} />
      ) : (
        <main className="flex flex-col gap-6">
          <Card title={report.weekLabel} className="rounded-xl border-outline-variant/20 shadow-sm">
            <Descriptions column={2} size="small" bordered styles={{ label: { width: 140 } }}>
              <Descriptions.Item label="统计周期">
                {report.weekStart} ～ {report.weekEnd}
              </Descriptions.Item>
              <Descriptions.Item label="生成时间">{report.generatedAt}</Descriptions.Item>
              {report.generatorName ? (
                <Descriptions.Item label="生成人">{report.generatorName}</Descriptions.Item>
              ) : null}
            </Descriptions>
          </Card>

          <Card title="要情概况" className="rounded-xl border-outline-variant/20 shadow-sm">
            <Typography.Paragraph className="mb-0 text-base leading-relaxed">{report.要情概况}</Typography.Paragraph>
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="诉求受理总量" value={report.诉求受理总量} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="办结总量" value={report.办结总量} />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="办结率" value={report.办结率} suffix="%" />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="平均响应时长" value={report.平均响应时长} suffix="小时" />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="平均处理时长" value={report.平均处理时长} suffix="小时" />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="满意度均分" value={report.满意度评价统计.平均分} suffix="分" />
              </Card>
            </Col>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Card>
                <Statistic title="评价条数" value={report.满意度评价统计.评价条数} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="热点话题" className="h-full rounded-xl border-outline-variant/20 shadow-sm">
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(r) => r.label}
                  dataSource={report.热点话题}
                  columns={[
                    { title: '主题（类型）', dataIndex: 'label' },
                    { title: '件数', dataIndex: 'count', width: 90 },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="诉求类型分布" className="h-full rounded-xl border-outline-variant/20 shadow-sm">
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(r) => r.type}
                  dataSource={report.诉求类型分布}
                  columns={[
                    { title: '类型', dataIndex: 'type' },
                    { title: '件数', dataIndex: 'count', width: 90 },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Card title="热点词云分析" className="rounded-xl border-outline-variant/20 shadow-sm">
            <HotWordCloud items={report.热点词云} />
          </Card>

          <Row gutter={[16, 16]}>
            <Col xs={24} lg={12}>
              <Card title="部门处理效率排名（本周办结）" className="rounded-xl border-outline-variant/20 shadow-sm">
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(r) => r.departmentName}
                  dataSource={report.部门处理效率排名}
                  columns={[
                    { title: '部门', dataIndex: 'departmentName' },
                    { title: '办结数', dataIndex: '办结数', width: 90 },
                    { title: '平均处理(h)', dataIndex: 'avgHandleHours', width: 110 },
                  ]}
                />
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card title="单位接诉即办（本周受理/办结）" className="rounded-xl border-outline-variant/20 shadow-sm">
                <Table
                  size="small"
                  pagination={false}
                  rowKey={(r) => r.departmentName}
                  dataSource={report.单位即诉即办}
                  columns={[
                    { title: '单位', dataIndex: 'departmentName' },
                    { title: '受理', dataIndex: '受理', width: 70 },
                    { title: '办结', dataIndex: '办结', width: 70 },
                    { title: '办结率%', dataIndex: '办结率pct', width: 90 },
                    { title: '均处理(h)', dataIndex: 'avgHandleHours', width: 100 },
                  ]}
                />
              </Card>
            </Col>
          </Row>

          <Card title="满意度评价统计" className="rounded-xl border-outline-variant/20 shadow-sm">
            <Table
              size="small"
              pagination={false}
              rowKey={(r) => String(r.star)}
              dataSource={report.满意度评价统计.分布}
              columns={[
                { title: '星级', dataIndex: 'star' },
                { title: '条数', dataIndex: 'count' },
              ]}
            />
          </Card>

          <Card title="真问深答" className="rounded-xl border-outline-variant/20 shadow-sm">
            {report.真问深答.length ? (
              <ul className="m-0 list-none space-y-4 p-0">
                {report.真问深答.map((x) => (
                  <li key={x.appealId} className="rounded-lg border border-outline-variant/25 bg-surface-container-low/30 p-4">
                    <Typography.Text strong>{x.title}</Typography.Text>
                    <Typography.Paragraph type="secondary" className="mb-1 mt-2 text-sm">
                      诉求：{x.excerpt}
                    </Typography.Paragraph>
                    <Typography.Paragraph className="mb-0 text-sm">答复摘录：{x.replyExcerpt}</Typography.Paragraph>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本周暂无符合条件的深度互动工单" />
            )}
          </Card>

          <Card title="本期督办与领导关注" className="rounded-xl border-outline-variant/20 shadow-sm">
            {report.本期督办.length ? (
              <ul className="m-0 list-none space-y-3 p-0">
                {report.本期督办.map((x) => (
                  <li key={x.appealId} className="rounded-lg border border-outline-variant/20 px-3 py-2">
                    <Typography.Text strong>{x.title}</Typography.Text>
                    <Typography.Paragraph className="mb-0 mt-1 text-sm text-on-surface-variant">{x.detail}</Typography.Paragraph>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本周无督办流或领导关注记录" />
            )}
          </Card>

          <Card title="优秀回复案例" className="rounded-xl border-outline-variant/20 shadow-sm">
            {report.优秀回复案例.length ? (
              <ul className="m-0 list-none space-y-4 p-0">
                {report.优秀回复案例.map((x) => (
                  <li
                    key={x.appealId}
                    className="rounded-lg border border-outline-variant/25 bg-surface-container-low/30 p-4"
                  >
                    <Space wrap>
                      <Typography.Text strong>{x.title}</Typography.Text>
                      <Tag color="success">{x.rating} 星</Tag>
                    </Space>
                    {x.comment ? (
                      <Typography.Paragraph type="secondary" className="mb-1 mt-2 text-sm">
                        用户评价：{x.comment}
                      </Typography.Paragraph>
                    ) : null}
                    <Typography.Paragraph className="mb-0 text-sm">答复摘录：{x.replyExcerpt}</Typography.Paragraph>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="本周暂无高分评价案例" />
            )}
          </Card>
        </main>
      )}
    </div>
  );
}
