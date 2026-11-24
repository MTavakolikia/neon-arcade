'use client';

import { useTransition, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { toast } from 'sonner';
import type { ActionResult } from '@/lib/action-result';
import { Button, type ButtonProps } from '@/components/admin/ui';

/**
 * Wraps a server action that returns an ActionResult so forms get pending
 * state, field errors and toasts for free. Keeps `useActionState` plumbing out
 * of every admin form.
 */
export function ActionForm<T>({
  action,
  children,
  successMessage,
  className,
  onSuccess,
  resetOnSuccess = false,
}: {
  action: (prev: ActionResult<T>, formData: FormData) => Promise<ActionResult<T>>;
  children: ReactNode;
  successMessage?: string;
  className?: string;
  onSuccess?: (data: T | undefined) => void;
  resetOnSuccess?: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <form
      className={className}
      action={(formData) => {
        startTransition(async () => {
          const result = await action({ ok: true } as ActionResult<T>, formData);
          if (result.ok) {
            if (successMessage) toast.success(successMessage);
            onSuccess?.(result.data);
          } else {
            toast.error(result.message);
          }
        });
      }}
    >
      {children}
      {pending && <span className="sr-only" role="status">Saving…</span>}
      <PendingOverlay visible={pending} />
    </form>
  );
}

/** Submit button that reflects the enclosing form's pending state. */
export function SubmitButton({
  children,
  pendingLabel = 'Saving…',
  ...props
}: ButtonProps & { pendingLabel?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || props.disabled} {...props}>
      {pending ? pendingLabel : children}
    </Button>
  );
}

/** Opacity wash so a saving form is visibly, but non-blockingly, busy. */
export function PendingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 rounded-2xl bg-black/35 opacity-0 animate-in fade-in"
    />
  );
}