import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/shared/lib/utils';
import {
  AUTH_FIELD_ERROR_CLASS,
  AUTH_FIELD_LABEL_CLASS,
  AUTH_FIELD_LABEL_GAP_CLASS,
} from '../constants/auth-ui.constants';

interface AuthFormFieldProps {
  readonly id: string;
  readonly label: string;
  readonly error?: string | undefined;
  readonly required?: boolean;
  /** Rendered next to the label, e.g. a hint link. */
  readonly labelAside?: ReactNode;
  /** Receives the `aria-*` props the control must spread for accessibility. */
  readonly children: (control: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby': string | undefined;
  }) => ReactNode;
}

export function AuthFormField({
  id,
  label,
  error,
  required = false,
  labelAside,
  children,
}: AuthFormFieldProps) {
  const errorId = `${id}-error`;
  return (
    <div className={AUTH_FIELD_LABEL_GAP_CLASS}>
      <div className="flex items-center justify-between gap-3">
        <Label htmlFor={id} className={cn(AUTH_FIELD_LABEL_CLASS, 'flex items-center gap-0.5')}>
          <span className="min-w-0 truncate">{label}</span>
          {required ? <span className="text-[#DC2626]">*</span> : null}
        </Label>
        {labelAside}
      </div>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error ? errorId : undefined,
      })}
      {error ? (
        <p id={errorId} className={AUTH_FIELD_ERROR_CLASS} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}