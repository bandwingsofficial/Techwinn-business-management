/** Preset HEX palette for daily-task workflow stages. */
export const WORKFLOW_STAGE_COLOR_PRESETS = [
  '#2563eb',
  '#7c3aed',
  '#db2777',
  '#ea580c',
  '#16a34a',
  '#0891b2',
  '#64748b',
] as const;

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Legacy named tokens → preset HEX (backward compatibility). */
const LEGACY_WORKFLOW_STAGE_COLORS: Record<string, string> = {
  slate: '#64748b',
  blue: '#2563eb',
  purple: '#7c3aed',
  violet: '#7c3aed',
  pink: '#db2777',
  rose: '#db2777',
  orange: '#ea580c',
  amber: '#ea580c',
  green: '#16a34a',
  emerald: '#16a34a',
  cyan: '#0891b2',
};

export const DEFAULT_WORKFLOW_STAGE_COLOR = '#64748b';

/** Normalize HEX or legacy color names to a lowercase `#rrggbb` value. */
export function normalizeWorkflowStageColorToken(value: string): string {
  const trimmed = value.trim();
  if (HEX_COLOR.test(trimmed)) return trimmed.toLowerCase();
  return LEGACY_WORKFLOW_STAGE_COLORS[trimmed.toLowerCase()] ?? trimmed.toLowerCase();
}

export function isWorkflowStageColorHex(value: string): boolean {
  return /^#[0-9a-f]{6}$/.test(value);
}
