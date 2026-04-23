import { Card, Typography } from 'antd';
import AdminPageHeader from '../AdminPageHeader';

export default function AdminStub({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="admin-stub-wrap min-h-full">
      <AdminPageHeader title={title} subtitle="功能规划与需求对齐说明" />
      <Card className="stub-card rounded-[2rem] border-outline-variant/20 shadow-[0_18px_44px_rgba(29,79,113,0.09)]">
        <Typography.Paragraph>{desc}</Typography.Paragraph>
        <Typography.Text type="secondary">本页为建设中的功能占位，后续将接入配置与业务接口。</Typography.Text>
      </Card>
    </div>
  );
}
