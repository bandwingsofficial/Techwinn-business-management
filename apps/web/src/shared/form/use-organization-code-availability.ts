import { useCallback, useEffect, useRef, useState } from 'react';
import { ORGANIZATION_CODE_DUPLICATE_MESSAGE } from './organization-code-field-error';

type SetFieldErrors = (
  value: Record<string, string> | ((previous: Record<string, string>) => Record<string, string>),
) => void;

export function useOrganizationCodeAvailability({
  enabled,
  code,
  fieldKey,
  isFormatValid,
  checkAvailable,
  setFieldErrors,
}: {
  enabled: boolean;
  code: string;
  fieldKey: string;
  isFormatValid: (value: string) => boolean;
  checkAvailable: (value: string, signal: AbortSignal) => Promise<boolean>;
  setFieldErrors: SetFieldErrors;
}) {
  const [checking, setChecking] = useState(false);
  const [isDuplicate, setIsDuplicate] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastCheckedRef = useRef<string | null>(null);

  const clearDuplicateError = useCallback(() => {
    setIsDuplicate(false);
    setFieldErrors((previous) => {
      if (previous[fieldKey] !== ORGANIZATION_CODE_DUPLICATE_MESSAGE) return previous;
      const next = { ...previous };
      delete next[fieldKey];
      return next;
    });
  }, [fieldKey, setFieldErrors]);

  const runCheck = useCallback(
    async (raw: string): Promise<boolean> => {
      const trimmed = raw.trim();
      if (!enabled || !trimmed) {
        clearDuplicateError();
        lastCheckedRef.current = null;
        return true;
      }
      if (!isFormatValid(trimmed)) {
        clearDuplicateError();
        lastCheckedRef.current = null;
        return true;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setChecking(true);
      try {
        const available = await checkAvailable(trimmed, controller.signal);
        if (controller.signal.aborted) return !isDuplicate;
        lastCheckedRef.current = trimmed.toUpperCase();
        if (!available) {
          setIsDuplicate(true);
          setFieldErrors((previous) => ({
            ...previous,
            [fieldKey]: ORGANIZATION_CODE_DUPLICATE_MESSAGE,
          }));
          return false;
        }
        clearDuplicateError();
        return true;
      } catch {
        if (controller.signal.aborted) return !isDuplicate;
        return true;
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    },
    [enabled, isFormatValid, checkAvailable, clearDuplicateError, fieldKey, isDuplicate, setFieldErrors],
  );

  const onBlur = useCallback(() => {
    if (!enabled) return;
    void runCheck(code);
  }, [enabled, code, runCheck]);

  const onCodeChange = useCallback(() => {
    abortRef.current?.abort();
    setChecking(false);
    if (isDuplicate) clearDuplicateError();
    lastCheckedRef.current = null;
  }, [clearDuplicateError, isDuplicate]);

  useEffect(() => {
    if (!enabled) return;
    const trimmed = code.trim();
    if (!trimmed || !isFormatValid(trimmed)) return;
    if (
      isDuplicate &&
      lastCheckedRef.current &&
      trimmed.toUpperCase() !== lastCheckedRef.current
    ) {
      void runCheck(trimmed);
    }
  }, [code, enabled, isDuplicate, isFormatValid, runCheck]);

  const ensureBeforeSubmit = useCallback(async () => {
    if (!enabled) return true;
    return runCheck(code);
  }, [enabled, code, runCheck]);

  return {
    checking,
    isDuplicate,
    onBlur,
    onCodeChange,
    ensureBeforeSubmit,
    blocksSubmit: enabled && (checking || isDuplicate),
  };
}