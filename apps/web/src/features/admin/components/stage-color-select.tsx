'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { stageColorOptions, normalizeStageColor } from '@/features/admin/crm/utils/stage-color';

import type { ComponentProps } from 'react';
import type { FormControlState } from '@/shared/form/form-control-state';
import { formControlStateAttrs, mergeFormControlClass } from '@/shared/form/form-control-state';
import { cn } from '@/shared/lib/utils';

export function StageColorSelect({
  id,
  value,
  onValueChange,
  'aria-label': ariaLabel = 'Stage color',
  controlState = 'neutral',
  onBlur,
  className,
}: {
  id?: string;
  value: string;
  onValueChange: (color: string) => void;
  'aria-label'?: string;
  controlState?: FormControlState;
  onBlur?: ComponentProps<'button'>['onBlur'];
  className?: string;
}) {
  const normalized = normalizeStageColor(value);
  const options = stageColorOptions(normalized);

  return (
    <Select value={normalized} onValueChange={(next) => onValueChange(normalizeStageColor(next))}>
      <SelectTrigger
        id={id}
        className={cn('w-full', mergeFormControlClass(controlState), className)}
        aria-label={ariaLabel}
        onBlur={onBlur}
        {...formControlStateAttrs(controlState)}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 truncate text-left">
          <span
            className="size-3.5 shrink-0 rounded-full border border-black/10 shadow-sm"
            style={{ backgroundColor: normalized }}
            aria-hidden="true"
          />
          <span className="font-mono text-sm tracking-tight text-foreground">
            {normalized.toUpperCase()}
          </span>
        </span>
      </SelectTrigger>
      <SelectContent className="rounded-lg border bg-white shadow-md">
        {options.map((color) => {
          const option = normalizeStageColor(color);
          return (
            <SelectItem
              key={option}
              value={option}
              className="rounded-md py-2 data-[state=checked]:bg-sky-50 data-[highlighted]:bg-sky-50/70"
            >
              <span className="flex items-center gap-2.5">
                <span
                  className="size-3.5 rounded-full border border-black/10 shadow-sm"
                  style={{ backgroundColor: option }}
                  aria-hidden="true"
                />
                <span className="font-mono text-sm tracking-tight text-foreground">
                  {option.toUpperCase()}
                </span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
