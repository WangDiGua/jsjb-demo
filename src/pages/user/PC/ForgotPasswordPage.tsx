import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useIsMobileLayout } from '@/context/MobileLayoutContext';
import MobileSubPageScaffold from '@/components/mobile/MobileSubPageScaffold';
import { PortalButton } from './ui';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const isMobile = useIsMobileLayout();
  const [loading, setLoading] = useState(false);
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr('');
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setErr('手机号格式不正确');
      return;
    }
    setLoading(true);
    try {
      await new Promise((r) => setTimeout(r, 500));
      navigate('/user/login');
    } finally {
      setLoading(false);
    }
  };

  const formCard = (
    <div className="rounded-2xl border border-outline-variant/20 bg-surface-container-lowest p-6 shadow-lg sm:p-8">
      <h1 className={`font-headline font-bold text-on-surface ${isMobile ? 'sr-only' : 'mt-0 text-xl'}`}>密码重置</h1>
      {!isMobile ? <p className="mt-2 text-sm text-on-surface-variant">验证通过后将引导您完成密码更新。</p> : null}
      {isMobile ? <p className="text-sm leading-relaxed text-on-surface-variant">验证通过后将引导您完成密码更新。</p> : null}
      {err ? <p className="mt-4 text-sm text-red-600">{err}</p> : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="mb-1 block text-xs font-bold text-on-surface-variant">手机号</label>
          <input
            className="w-full rounded-xl border border-outline-variant/40 px-4 py-3"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <PortalButton type="submit" variant="primary" fullWidth size="lg" disabled={loading}>
          {loading ? '提交中…' : '提交'}
        </PortalButton>
      </form>
    </div>
  );

  if (isMobile) {
    return (
      <MobileSubPageScaffold title="密码重置" onBack={() => navigate('/user/login')} contentClassName="pt-3 pb-10">
        {formCard}
      </MobileSubPageScaffold>
    );
  }

  return (
    <div className="portal-skin flex min-h-screen items-center justify-center bg-surface px-6 py-10 font-body">
      <div className="w-full max-w-md">{formCard}</div>
    </div>
  );
}
