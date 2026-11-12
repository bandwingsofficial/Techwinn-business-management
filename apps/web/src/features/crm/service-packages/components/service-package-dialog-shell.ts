import { cn } from '@/shared/lib/utils';
import { CRM_PIPELINE_FORM_DIALOG_CLASS } from '@/features/admin/crm/constants';

/**
 * Shared form-modal layout used by packages, quotations, clients, and attendance settings.
 *
 * Architecture:
 * - Container: flex column, max-height calc(100dvh - 48px), overflow hidden, min-height 0
 * - Header / footer: shrink-0 (stay visible)
 * - Body: flex 1 1 auto + min-height 0 + overflow-y auto (scrolls; never collapses under max-height)
 *
 * Do not use `flex-1` / `basis-0` for the body when the parent only has max-height
 * (not a definite height)—the flex item base size becomes 0 and the form clips.
 */

/** Radix close control styling (matches Pipeline / Lead modals). */
const DIALOG_CLOSE_BUTTON_CLASS =
  '[&>button]:text-foreground [&>button]:top-5 [&>button]:right-5 [&>button]:size-9 [&>button]:rounded-lg [&>button]:border [&>button]:border-input [&>button]:bg-card [&>button]:shadow-none [&>button]:hover:bg-muted/50';

/** Shared width for create, edit, and view package modals (slightly wider than pipeline 720px). */
const SERVICE_PACKAGE_MODAL_WIDTH_CLASS =
  'w-[min(752px,calc(100vw-2rem))] max-w-[752px] sm:w-[752px] sm:max-w-[752px]';

const SERVICE_PACKAGE_MODAL_VIEWPORT_CLASS = cn(
  CRM_PIPELINE_FORM_DIALOG_CLASS,
  SERVICE_PACKAGE_MODAL_WIDTH_CLASS,
  'max-h-[calc(100dvh-48px)] min-h-0 overscroll-contain',
  DIALOG_CLOSE_BUTTON_CLASS,
);

/** View package details — centered, viewport-bound, scrollable body. */
export const SERVICE_PACKAGE_DETAILS_DIALOG_CLASS = SERVICE_PACKAGE_MODAL_VIEWPORT_CLASS;

/** Create / edit package form — same shell as details. */
export const SERVICE_PACKAGE_FORM_DIALOG_CLASS = SERVICE_PACKAGE_MODAL_VIEWPORT_CLASS;

/**
 * Force flex column on DialogContent (default is grid) and cap height to the viewport.
 * Inline style wins over conflicting utility/display rules from the base DialogContent.
 */
export const SERVICE_PACKAGE_MODAL_DIALOG_STYLE = {
  display: 'flex',
  flexDirection: 'column',
  maxHeight: 'calc(100dvh - 48px)',
  minHeight: 0,
  overflow: 'hidden',
} as const;

/**
 * Scroll region for form and details modals (flex middle).
 * `flex-auto` = flex: 1 1 auto — content-sized base, shrinks under max-height, then scrolls.
 */
export const SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS =
  'min-h-0 flex-auto overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-3';

/** @deprecated Use SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS */
export const SERVICE_PACKAGE_DIALOG_SCROLL_CLASS = SERVICE_PACKAGE_FORM_DIALOG_SCROLL_CLASS;

export const SERVICE_PACKAGE_DIALOG_HEADER_CLASS =
  'border-border/60 shrink-0 space-y-0 border-b px-6 pt-6 pb-3 text-left';

export const SERVICE_PACKAGE_DIALOG_FOOTER_CLASS =
  'border-border/60 shrink-0 flex-wrap gap-2 border-t px-6 py-4 sm:justify-end';
