import { useCallback, useEffect, useState } from 'react';
import { Card, Table, Tabs, Typography } from 'antd';
import { adminConfigService } from '@/mock/adminConfigService';
import type { AuditLogRow, BusinessRoleRow } from '@/mock/adminConfigTypes';
import AdminPageHeader from '../AdminPageHeader';

export default function SystemManagePage() {
  const [audit, setAudit] = useState<AuditLogRow[]>([]);
  const [roles, setRoles] = useState<BusinessRoleRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const b = await adminConfigService.getBundle();
      setAudit(b.auditLogs);
      setRoles(b.businessRoles);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-full">
      <AdminPageHeader
        title="系统管理"
        subtitle="审计日志（配置类操作）与内置菜单说明；完整 RBAC 需对接真实身份系统"
      />
      <Card loading={loading} className="rounded-xl border-outline-variant/20 shadow-[0_18px_44px_rgba(16,37,60,0.09)]">
        <Tabs
          items={[
            {
              key: 'audit',
              label: '操作审计',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={audit}
                  pagination={{ pageSize: 12 }}
                  columns={[
                    { title: '时间', dataIndex: 'time', width: 170 },
                    { title: '操作人', dataIndex: 'operator', width: 120 },
                    { title: '模块', dataIndex: 'module', width: 120 },
                    { title: '动作', dataIndex: 'action', width: 100 },
                    { title: '详情', dataIndex: 'detail', ellipsis: true },
                  ]}
                />
              ),
            },
            {
              key: 'menu',
              label: '菜单与权限（说明）',
              children: (
                <Typography.Paragraph className="text-on-surface-variant">
                  系统<strong>登录身份</strong>角色与用户主数据一致（student / teacher / admin / handler / dept_leader /
                  leader），与 <strong>业务角色配置</strong>（业务角色管理页）相互独立。顶部菜单与可访问路由由{' '}
                  <code>src/mock/adminNavPolicy.ts</code> 定义，<code>AdminLayout</code> 按角色过滤分组；子路由由{' '}
                  <code>AdminPermissionOutlet</code> 二次校验，避免仅靠隐藏菜单绕过。
                  <br />
                  <br />
                  管理端由 <code>AdminGuard</code> 守护：仅具备管理端入口的角色可登录后台。
                </Typography.Paragraph>
              ),
            },
            {
              key: 'bizroles',
              label: '业务角色快照',
              children: (
                <Table
                  rowKey="id"
                  size="small"
                  dataSource={roles}
                  pagination={false}
                  columns={[
                    { title: '编码', dataIndex: 'code', width: 100 },
                    { title: '名称', dataIndex: 'name', width: 140 },
                    { title: '权限', dataIndex: 'permissions', render: (p: string[]) => p.join(', ') },
                  ]}
                />
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}
