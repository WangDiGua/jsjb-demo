import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Form, Input, Button, Card, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined, QrcodeOutlined } from '@ant-design/icons';
import { userService, canAccessAdmin, ROLE_LABELS } from '@/mock';
import { useAppStore } from '@/store';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useAppStore((s) => s.login);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const res = await userService.login(values.username, values.password);
      if (res.success && res.data) {
        if (!canAccessAdmin(res.data.role)) {
          message.error(`账号角色为「${ROLE_LABELS[res.data.role]}」，无权登录管理端`);
          return;
        }
        login(res.data);
        message.success('登录成功');
        navigate('/admin/dashboard');
      } else {
        message.error(res.message || '登录失败');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login-page flex min-h-screen flex-col bg-surface font-body text-on-surface md:flex-row">
      <aside className="relative hidden flex-col justify-between border-b border-outline-variant bg-surface-container-low px-10 py-12 md:flex md:w-[42%] md:border-b-0 md:border-r lg:px-14">
        <div>
          <h1 className="font-headline text-2xl font-black tracking-tight text-primary">接诉即办</h1>
          <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant opacity-70">
            管理终端
          </p>
          <p className="mt-10 max-w-sm text-lg font-semibold leading-snug text-on-surface">
            受理、交办、督办与质效分析统一入口
          </p>
          <p className="mt-4 max-w-sm text-sm text-on-surface-variant">
            供管理员、校办与二级单位处理员使用的工作台。
          </p>
        </div>
        <div className="flex items-center gap-3 text-on-surface-variant">
          <span className="material-symbols-outlined text-primary text-3xl">shield_person</span>
          <span className="text-xs font-medium">安全登录 · 权限按角色控制</span>
        </div>
      </aside>

      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <Card
          className="w-full max-w-md rounded-2xl border border-outline-variant/25 shadow-[0_12px_32px_-4px_rgba(0,71,144,0.08)]"
          bordered={false}
        >
          <div className="mb-8 md:hidden">
            <h2 className="font-headline text-xl font-black text-primary">接诉即办 · 管理终端</h2>
            <p className="mt-1 text-sm text-on-surface-variant">请使用授权账号登录</p>
          </div>
          <div className="mb-6 hidden md:block">
            <h2 className="font-headline text-xl font-bold text-on-surface">登录</h2>
            <p className="mt-1 text-sm text-on-surface-variant">接诉即办平台管理系统</p>
          </div>

          <Form name="adminLogin" onFinish={handleLogin} layout="vertical" requiredMark={false}>
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input prefix={<UserOutlined />} placeholder="如 admin001 / handler001" size="large" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password prefix={<LockOutlined />} placeholder="请输入密码" size="large" />
            </Form.Item>
            <Form.Item name="rememberMe" valuePropName="checked">
              <Checkbox>记住我</Checkbox>
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" size="large" block loading={loading} className="h-11 font-semibold">
                登录
              </Button>
            </Form.Item>
          </Form>

          <p className="mb-4 text-xs leading-relaxed text-on-surface-variant">
            学生与教职工账号不可登录管理端；如遇账号问题请联系信息化部门。
            <span className="mt-2 block opacity-90">
              管理端与门户端登录态分开保存、互不覆盖；处理员在手机与电脑上均可办理同一批工单。
            </span>
          </p>

          <div className="border-t border-outline-variant/20 pt-4 text-center text-on-surface-variant">
            <QrcodeOutlined style={{ fontSize: 22, color: 'var(--on-surface-variant, #44546F)' }} />
            <p className="mt-2 text-xs">使用手机扫码登录（规划中）</p>
          </div>

          <div className="mt-6 text-center text-sm">
            <Link to="/user/login" className="font-semibold text-primary hover:underline">
              返回用户端
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
