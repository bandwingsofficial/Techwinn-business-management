import { z } from 'zod';

/** Optional create-form code: empty/whitespace → omitted; otherwise trimmed (and optionally normalized). */
export function optionalOrgCodeInputSchema(options: {
  readonly isValid: (value: string) => boolean;
  readonly invalidMessage: string;
  readonly normalize?: (value: string) => string;
}) {
  return z
    .string()
    .optional()
    .transform((raw) => {
      if (raw === undefined) return undefined;
      const trimmed = raw.trim();
      if (!trimmed) return undefined;
      return options.normalize ? options.normalize(trimmed) : trimmed;
    })
    .superRefine((value, ctx) => {
      if (value === undefined) return;
      if (!options.isValid(value)) {
        ctx.addIssue({ code: 'custom', message: options.invalidMessage });
      }
    });
}