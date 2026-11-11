import { normalizeStageColor } from '@/features/admin/crm/utils/stage-color';

/** Resolve workflow stage color tokens (HEX or legacy names) to a HEX value. */
export function colorTokenToHex(token: string): string {
  return normalizeStageColor(token);
}
