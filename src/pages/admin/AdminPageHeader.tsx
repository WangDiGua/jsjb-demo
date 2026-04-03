type AdminPageHeaderProps = {
  title: string;
  subtitle?: string;
  extra?: React.ReactNode;
};

export default function AdminPageHeader({ title, subtitle, extra }: AdminPageHeaderProps) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="font-headline text-2xl font-bold tracking-tight text-on-surface md:text-3xl">{title}</h1>
        {subtitle ? <p className="mt-1 text-sm text-on-surface-variant">{subtitle}</p> : null}
      </div>
      {extra ? <div className="flex shrink-0 flex-wrap items-center gap-3">{extra}</div> : null}
    </header>
  );
}
