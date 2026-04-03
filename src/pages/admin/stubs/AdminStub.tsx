import { Card, Typography } from 'antd';
import AdminPageHeader from '../AdminPageHeader';

export default function AdminStub({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="admin-stub-wrap min-h-full">
      <AdminPageHeader title={title} subtitle="功能规划与需求对齐说明" />
      <Card className="stub-card rounded-xl border-outline-variant/20 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.06)]">
        <Typography.Paragraph>{desc}</Typography.Paragraph>
        <Typography.Text type="secondary">本页为建设中的功能占位，后续将接入配置与业务接口。</Typography.Text>
      </Card>
    </div>
  );
}
