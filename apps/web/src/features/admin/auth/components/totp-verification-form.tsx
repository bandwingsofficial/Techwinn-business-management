'use client';

import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/shared/lib/utils';
import { TOTP_CODE_LENGTH } from '../schemas/totp.schema';
import {
  AUTH_DESCRIPTION_CLASS,
  AUTH_FORM_INTRO_CLASS,
  AUTH_FORM_FIELDS_GROUP_CLASS,
  AUTH_FORM_SUBMIT_CLASS,
  AUTH_HEADING_CLASS,
  AUTH_LINK_MUTED_CLASS,
  AUTH_PANEL_CONTENT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from '../constants/auth-ui.constants';
import { useTotpVerification } from '../hooks/use-totp-verification';
import { AuthFormField } from './auth-form-field';
import { AuthHelpLinks } from './auth-help-links';
import { TotpCodeInput } from './totp-code-input';

export function TotpVerificationForm() {
  const setup = useSearchParams().get('setup') === '1';
  const { code, error, isVerifying, isComplete, onCodeChange, submit } = useTotpVerification();
  const hintId = 'totp-hint';
  const headingId = 'totp-heading';
  const busy = isVerifying || isComplete;

  const description = setup
    ? `Enter the ${TOTP_CODE_LENGTH}-digit code from the authenticator app you enrolled during setup.`
    : 'Enter the 6-digit code from your authenticator app to continue.';

  return (
    <div className={AUTH_PANEL_CONTENT_CLASS}>
      <header className={AUTH_FORM_INTRO_CLASS}>
        <h1 id={headingId} className={AUTH_HEADING_CLASS}>
          Verify your sign in
        </h1>
        <p id={hintId} className={AUTH_DESCRIPTION_CLASS}>
          {description}
        </p>
      </header>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="block w-full"
        aria-busy={busy}
      >
        <div className={AUTH_FORM_FIELDS_GROUP_CLASS}>
          <AuthFormField id="totp-code" label="Authentication code" required error={error ?? undefined}>
            {() => (
              <TotpCodeInput
                value={code}
                onChange={onCodeChange}
                length={TOTP_CODE_LENGTH}
                disabled={busy}
                invalid={Boolean(error)}
                autoFocus
                labelledBy={headingId}
                describedBy={error ? `${'totp-code'}-error` : hintId}
              />
            )}
          </AuthFormField>
        </div>

        <Button
          type="submit"
          className={cn(AUTH_PRIMARY_BUTTON_CLASS, AUTH_FORM_SUBMIT_CLASS)}
          disabled={busy || code.length !== TOTP_CODE_LENGTH}
        >
          {busy ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Verifying...
            </>
          ) : (
            'Verify and continue'
          )}
        </Button>
      </form>

      <AuthHelpLinks />

      <Button
        variant="ghost"
        className={cn(
          AUTH_LINK_MUTED_CLASS,
          'mt-4 h-auto shrink-0 justify-start gap-1.5 px-0 hover:bg-transparent',
        )}
        asChild
      >
        <Link href="/login">
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to sign in
        </Link>
      </Button>
    </div>
  );
}