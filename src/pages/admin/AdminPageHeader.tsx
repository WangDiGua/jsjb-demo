type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
};

export default function AdminPageHeader({ title, subtitle, extra }: AdminPageHeaderProps) {
  return (
    <header className="admin-command-card mb-8 flex flex-col gap-4 rounded-[2rem] p-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">WORKSPACE</p>
        <h1 className="mt-2 font-headline text-2xl font-black tracking-tight text-on-surface md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-3 max-w-3xl text-sm leading-relaxed text-on-surface-variant">{subtitle}</p> : null}
      </div>
      {extra ? <div className="flex shrink-0 flex-wrap items-center gap-3">{extra}</div> : null}
    </header>
  );
}
