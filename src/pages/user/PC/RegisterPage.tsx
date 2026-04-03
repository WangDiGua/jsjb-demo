import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { User } from '@/mock/types';
import { userService } from '@/mock';
import { useAppStore } from '@/store';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { PortalButton, PortalSelect } from './ui';

function mapRegisterRole(r: string): User['role'] {
  if (r === 'teacher') return 'teacher';
  return 'student';
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const login = useAppStore((s) => s.login);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [role, setRole] = useState('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [captcha, setCaptcha] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (password !== confirm) {
      setErr('两次密码不一致');
      return;
    }
    if (username.length < 4 || username.length > 20) {
      setErr('用户名 4–20 字符');
      return;
    }
    setLoading(true);
    try {
      const res = await userService.register({
        username: username.trim(),
        password,
        phone,
        email,
        role: mapRegisterRole(role),
      });
      if (!res.success) {
        setErr(res.message);
        return;
      }
      login(res.data);
      navigate('/user/home');
    } finally {
      setLoading(false);
    }
  };

  const card = (
    <div className={`rounded-2xl border border-outline-variant/20 bg-surface-container-lowest shadow-lg ${isMobile ? 'p-5' : 'p-8'}`}>
      <div className={`text-center ${isMobile ? 'mb-6' : 'mb-8'}`}>
        <h1 className={`font-headline font-bold text-on-surface ${isMobile ? 'sr-only' : 'text-2xl'}`}>用户注册</h1>
        {!isMobile ? <p className="mt-1 text-sm text-on-surface-variant">兰途接诉即办</p> : null}
        {isMobile ? <p className="text-sm text-on-surface-variant">兰途接诉即办</p> : null}
      </div>
          {err ? <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p> : null}
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-on-surface-variant">用户类型</label>
              <PortalSelect className="w-full" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="student">在校学生</option>
                <option value="teacher">教师</option>
                <option value="alumni">校友</option>
                <option value="external">校外</option>
              </PortalSelect>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-on-surface-variant">用户名</label>
              <input
                className="w-full rounded-xl border border-outline-variant/40 px-4 py-3"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={4}
                maxLength={20}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-on-surface-variant">密码</label>
              <input
                type="password"
                className="w-full rounded-xl border border-outline-variant/40 px-4 py-3"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-on-surface-variant">确认密码</label>
              <input
                type="password"
                className="w-full rounded-xl border border-outline-variant/40 px-4 py-3"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-on-surface-variant">手机</label>
              <input
                className="w-full rounded-xl border border-outline-variant/40 px-4 py-3"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-on-surface-variant">邮箱</label>
              <input
                type="email"
                className="w-full rounded-xl border border-outline-variant/40 px-4 py-3"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-on-surface-variant">验证码</label>
              <input
                className="w-full rounded-xl border border-outline-variant/40 px-4 py-3"
                value={captcha}
                onChange={(e) => setCaptcha(e.target.value)}
                placeholder="请输入验证码"
              />
            </div>
            <PortalButton type="submit" variant="primary" fullWidth size="lg" disabled={loading}>
              {loading ? '提交中…' : '注册'}
            </PortalButton>
          </form>
      <p className="mt-6 text-center text-sm text-on-surface-variant">
        已有账号？
        <Link to="/user/login" className="ml-1 font-bold text-primary">
          登录
        </Link>
      </p>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="用户注册" onBack={() => navigate('/user/login')} contentClassName="pt-2 pb-10">
        {card}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="portal-skin min-h-screen bg-surface py-10 font-body">
      <div className="mx-auto max-w-md px-6">
        {card}
      </div>
    </div>
  );
}
