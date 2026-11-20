'use client';

import type { ReactNode } from 'react';
import {
  Focus,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  RotateCw,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';

const ZOOM_MIN = 1;
const ZOOM_MAX = 3;

export function ProfileImageEditorControls({
  zoom,
  onZoomChange,
  onRotateLeft,
  onRotateRight,
  onReset,
  onCenter,
  disabled,
  className,
}: {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onReset: () => void;
  onCenter: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <ControlLabelRow label="Zoom">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled || zoom <= ZOOM_MIN}
          aria-label="Zoom out"
          onClick={() => onZoomChange(Math.max(ZOOM_MIN, Number((zoom - 0.1).toFixed(2))))}
        >
          <Minus className="size-4" aria-hidden="true" />
        </Button>
        <input
          type="range"
          min={ZOOM_MIN}
          max={ZOOM_MAX}
          step={0.02}
          value={zoom}
          disabled={disabled}
          aria-label="Zoom level"
          className="h-2 min-w-0 flex-1 cursor-pointer accent-[#2563EB]"
          onChange={(event) => onZoomChange(Number(event.target.value))}
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-8 shrink-0"
          disabled={disabled || zoom >= ZOOM_MAX}
          aria-label="Zoom in"
          onClick={() => onZoomChange(Math.min(ZOOM_MAX, Number((zoom + 0.1).toFixed(2))))}
        >
          <Plus className="size-4" aria-hidden="true" />
        </Button>
      </ControlLabelRow>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label="Rotate left"
          onClick={onRotateLeft}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          Rotate left
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label="Rotate right"
          onClick={onRotateRight}
        >
          <RotateCw className="size-4" aria-hidden="true" />
          Rotate right
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          aria-label="Center image"
          onClick={onCenter}
        >
          <Focus className="size-4" aria-hidden="true" />
          Center
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          aria-label="Reset adjustments"
          onClick={onReset}
        >
          <Undo2 className="size-4" aria-hidden="true" />
          Reset
        </Button>
      </div>
    </div>
  );
}

export function ProfileImageEditorFooter({
  processing,
  onCancel,
  onSave,
  saveDisabled,
}: {
  processing: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3">
      <Button type="button" variant="outline" disabled={processing} onClick={onCancel}>
        Cancel
      </Button>
      <Button type="button" disabled={processing || saveDisabled} onClick={onSave}>
        {processing ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            Processing…
          </>
        ) : (
          'Save Image'
        )}
      </Button>
    </div>
  );
}

function ControlLabelRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5 sm:flex-row sm:items-center">
      <span className="w-12 shrink-0 text-xs font-medium text-slate-600">{label}</span>
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
    </div>
  );
}