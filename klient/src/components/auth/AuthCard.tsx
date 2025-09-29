import { ReactNode } from "react";

export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="w-full bg-white rounded-3xl shadow-2xl border border-slate-200/70 p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        <span className="underline decoration-4 decoration-blue-600 underline-offset-8">
          {title}
        </span>
      </h1>
      {subtitle && <p className="text-slate-600 mt-2">{subtitle}</p>}
      <div className="mt-6 space-y-4">{children}</div>
      {footer && <div className="mt-6 text-center">{footer}</div>}
    </div>
  );
}
