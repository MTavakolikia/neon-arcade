// ─── Neon Arcade · Admin/Staff shared UI primitives ────────────────────────────

'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

// ─── Button ───────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'ghost' | 'outline' | 'danger' | 'subtle';
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'text-[#16041f] bg-gradient-to-br from-fuchsia-400 to-cyan-300 shadow-[0_0_18px_rgba(232,121,249,.35)] hover:brightness-110',
  ghost: 'text-white/75 hover:text-white hover:bg-white/8',
  outline: 'text-white/85 border border-white/15 hover:border-white/30 hover:bg-white/5',
  danger: 'text-rose-300 border border-rose-400/40 hover:bg-rose-400/12',
  subtle: 'text-white/60 bg-white/6 hover:bg-white/12 hover:text-white',
};

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-sm',
  icon: 'h-9 w-9 p-0',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'subtle', size = 'md', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold whitespace-nowrap',
        'transition-all duration-150 active:scale-[.97]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fuchsia-400/70',
        'disabled:pointer-events-none disabled:opacity-45',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        className,
      )}
      {...props}
    />
  );
});

// ─── Form fields ──────────────────────────────────────────────────────────────

export const Field = ({
  label,
  name,
  error,
  hint,
  children,
  required,
  className,
}: {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}) => (
  <label htmlFor={name} className={cn('block', className)}>
    <span className="mb-1.5 flex items-baseline justify-between gap-2">
      <span className="text-[11px] font-bold uppercase tracking-widest text-white/45">
        {label}
        {required && <span className="ml-1 text-fuchsia-400">*</span>}
      </span>
      {hint && <span className="text-[10px] text-white/30">{hint}</span>}
    </span>
    {children}
    {error && (
      <span role="alert" className="mt-1.5 block text-xs font-semibold text-rose-300">
        {error}
      </span>
    )}
  </label>
);

const CONTROL_BASE =
  'w-full rounded-xl border border-white/12 bg-black/35 px-3.5 text-sm text-white placeholder:text-white/25 ' +
  'transition-colors focus:border-fuchsia-400/70 focus:bg-black/50 focus:outline-none ' +
  'disabled:opacity-50 aria-[invalid=true]:border-rose-400/70';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(CONTROL_BASE, 'h-11', className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className, ...props }, ref) {
    return (
      <textarea
        ref={ref}
        className={cn(CONTROL_BASE, 'py-2.5 leading-relaxed resize-y', className)}
        {...props}
      />
    );
  },
);

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(CONTROL_BASE, 'h-11 cursor-pointer appearance-none pr-8', className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M2 4l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          backgroundSize: '12px',
        }}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function Checkbox({
  label,
  name,
  defaultChecked,
  description,
}: {
  label: string;
  name: string;
  defaultChecked?: boolean;
  description?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-black/40 accent-fuchsia-400"
      />
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-white/85">{label}</span>
        {description && <span className="block text-xs text-white/40">{description}</span>}
      </span>
    </label>
  );
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

export const Card = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <section className={cn('rounded-2xl border border-white/10 bg-white/[.035]', className)}>{children}</section>
);

export const CardHeader = ({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <header className="flex flex-wrap items-start justify-between gap-3 border-b border-white/8 px-5 py-4">
    <div className="min-w-0">
      <h2 className="text-sm font-black tracking-tight text-white">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-white/45">{description}</p>}
    </div>
    {action}
  </header>
);

export const CardBody = ({ className, children }: { className?: string; children: React.ReactNode }) => (
  <div className={cn('px-5 py-5', className)}>{children}</div>
);

export const StatCard = ({
  label,
  value,
  sub,
  icon,
  accent = '#e879f9',
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  accent?: string;
}) => (
  <div
    className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[.035] p-4"
    style={{ boxShadow: `inset 0 1px 0 0 ${accent}22` }}
  >
    <div className="flex items-start justify-between gap-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">{label}</p>
      {icon && <span style={{ color: accent }}>{icon}</span>}
    </div>
    <p className="mt-2 font-mono text-2xl font-black tracking-tight text-white">{value}</p>
    {sub && <p className="mt-0.5 text-[11px] text-white/40">{sub}</p>}
  </div>
);

export const Badge = ({
  children,
  tone = 'neutral',
  className,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'info';
  className?: string;
}) => {
  const tones = {
    neutral: 'bg-white/8 text-white/60 border-white/12',
    good: 'bg-emerald-400/12 text-emerald-300 border-emerald-400/25',
    warn: 'bg-amber-400/12 text-amber-300 border-amber-400/25',
    bad: 'bg-rose-400/12 text-rose-300 border-rose-400/25',
    info: 'bg-cyan-400/12 text-cyan-300 border-cyan-400/25',
  } as const;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
};

export const EmptyState = ({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
    <span className="text-4xl opacity-35" aria-hidden>
      {icon}
    </span>
    <p className="text-sm font-bold text-white/75">{title}</p>
    {description && <p className="max-w-sm text-xs leading-relaxed text-white/40">{description}</p>}
    {action}
  </div>
);

// ─── Data table ───────────────────────────────────────────────────────────────

export const Th = ({ className, children, ...rest }: React.ThHTMLAttributes<HTMLTableCellElement>) => (
  <th
    className={cn(
      'px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/40',
      className,
    )}
    {...rest}
  >
    {children}
  </th>
);

export const Td = ({ className, children, ...rest }: React.TdHTMLAttributes<HTMLTableCellElement>) => (
  <td className={cn('px-4 py-3 text-sm text-white/75', className)} {...rest}>
    {children}
  </td>
);

export const Table = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className="overflow-x-auto">
    <table className={cn('w-full min-w-[640px] border-collapse', className)}>{children}</table>
  </div>
);

// ─── Feedback ─────────────────────────────────────────────────────────────────

export const Notice = ({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'good' | 'bad';
  children: React.ReactNode;
}) => {
  const tones = {
    info: 'border-cyan-400/25 bg-cyan-400/8 text-cyan-200',
    good: 'border-emerald-400/25 bg-emerald-400/8 text-emerald-200',
    bad: 'border-rose-400/25 bg-rose-400/8 text-rose-200',
  } as const;
  return (
    <div role="status" className={cn('rounded-xl border px-4 py-3 text-sm', tones[tone])}>
      {children}
    </div>
  );
};

/** Small inline confirm-once button used for destructive row actions. */
export function ConfirmButton({
  children,
  confirmLabel = 'Confirm?',
  onConfirm,
  ...props
}: {
  children: React.ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
} & Omit<ButtonProps, 'onClick' | 'children'>) {
  return (
    <Button
      variant="danger"
      size="sm"
      onClick={(event) => {
        event.stopPropagation();
        if (window.confirm(confirmLabel)) onConfirm();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}