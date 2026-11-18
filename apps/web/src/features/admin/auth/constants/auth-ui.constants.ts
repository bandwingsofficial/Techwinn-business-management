import { cn } from '@/shared/lib/utils';

/** Auth screens (login, TOTP) — compact layout sizing shared across both states. */
export const AUTH_PAGE_BACKGROUND_CLASS = 'bg-white';

export const AUTH_CARD_SHELL_CLASS = cn(
  'box-border grid w-[calc(100%-48px)] max-w-[960px] auto-rows-auto grid-cols-1 overflow-hidden rounded-[18px]',
  'border border-[#E1E5EC] bg-white shadow-[0_16px_40px_-14px_rgba(23,32,51,0.12)]',
  'max-h-[calc(100dvh-80px)] h-auto min-h-0',
  'md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-stretch',
  /** Keep login/TOTP card footprint identical when TOTP has less form content. */
  'md:min-h-[min(540px,calc(100dvh-80px))]',
);

/** Right panel placeholder while TOTP session gate resolves — avoids card height jump. */
export const AUTH_GATE_LOADING_PANEL_CLASS = 'flex min-h-[22rem] items-center justify-center py-6';

export const AUTH_PANEL_LEFT_CLASS = cn(
  'relative hidden min-h-[240px] overflow-hidden md:block md:min-h-0 md:h-full',
);

export const AUTH_PANEL_RIGHT_CLASS = cn(
  'flex min-h-0 min-w-0 w-full flex-col justify-center',
  'px-6 py-7 sm:px-8',
  'md:overflow-x-hidden md:px-8 md:py-6',
);

export const AUTH_HEADING_CLASS =
  'text-[#172033] text-[24px] font-medium leading-tight tracking-tight';

export const AUTH_DESCRIPTION_CLASS =
  'text-[#667085] text-[14px] font-normal leading-normal';

export const AUTH_FORM_FIELD_CLASS = cn(
  'h-11 rounded-[10px] border border-transparent bg-[#F4F7FC] px-[14px] text-[14px] text-[#172033] shadow-none',
  'placeholder:text-[#667085]/70',
  'focus-visible:border-transparent focus-visible:ring-2 focus-visible:ring-[#111111]/15',
);

export const AUTH_PRIMARY_BUTTON_CLASS = cn(
  'h-[46px] w-full rounded-[10px] border-0 bg-[#111111] text-[14px] font-medium text-white shadow-none',
  'hover:bg-[#1f1f1f] disabled:cursor-not-allowed disabled:opacity-55',
);

export const AUTH_FORM_FIELDS_GROUP_CLASS = 'mt-5 flex flex-col gap-[14px]';

export const AUTH_FORM_SUBMIT_CLASS = 'mt-[18px]';

export const AUTH_FIELD_ERROR_CLASS = 'mt-1 text-[12px] leading-snug text-[#DC2626]';

export const AUTH_FIELD_LABEL_CLASS = 'text-[#172033] text-[13px] font-medium';

export const AUTH_FIELD_LABEL_GAP_CLASS = 'flex flex-col gap-1.5';

export const AUTH_TOTP_GROUP_CLASS =
  'flex w-full flex-nowrap items-center justify-center gap-[10px]';

export const AUTH_TOTP_DIGIT_CLASS = cn(
  'h-[46px] w-11 max-w-11 shrink-0 rounded-[10px] border border-transparent bg-[#F4F7FC]',
  'text-center font-mono text-base font-medium text-[#172033] shadow-none',
  'focus:border-transparent focus:ring-2 focus:ring-[#111111]/15 focus:outline-none',
  'disabled:cursor-not-allowed disabled:opacity-60',
);

export const AUTH_FORM_INTRO_CLASS = 'grid gap-2';


export const AUTH_ALERT_COMPACT_CLASS = 'py-2 text-[13px] [&_svg]:size-4';

export const AUTH_HELP_SECTION_CLASS = 'mt-4';

export const AUTH_LINK_MUTED_CLASS = 'text-[13px] font-normal text-[#667085]';

/** Right panel inner wrapper — no height lock or clipping. */
export const AUTH_PANEL_CONTENT_CLASS =
  'flex w-full min-w-0 flex-col justify-center py-1';