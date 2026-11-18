'use client';

import { AlertCircle, Eye, EyeOff, Info, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/shared/lib/utils';
import {
  AUTH_ALERT_COMPACT_CLASS,
  AUTH_DESCRIPTION_CLASS,
  AUTH_FORM_FIELD_CLASS,
  AUTH_FORM_INTRO_CLASS,
  AUTH_FORM_FIELDS_GROUP_CLASS,
  AUTH_FORM_SUBMIT_CLASS,
  AUTH_HEADING_CLASS,
  AUTH_PANEL_CONTENT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from '../constants/auth-ui.constants';
import { useAdminLogin } from '../hooks/use-admin-login';
import { loginNoticeMessage, parseLoginNotice } from '../utils/auth-errors';
import { AuthFormField } from './auth-form-field';
import { AuthHelpLinks } from './auth-help-links';
import { LoginSessionGate } from './login-session-gate';

export function PlatformLoginForm() {
  return (
    <LoginSessionGate>
      <PlatformLoginFormInner />
    </LoginSessionGate>
  );
}

function PlatformLoginFormInner() {
  const noticeRaw = parseLoginNotice(useSearchParams().get('reason'));
  const notice = noticeRaw && noticeRaw !== 'signed_out' ? noticeRaw : null;
  const { form, formError, onSubmit, isSubmitting } = useAdminLogin();
  const [showPassword, setShowPassword] = useState(false);
  const { errors } = form.formState;

  return (
    <div className={AUTH_PANEL_CONTENT_CLASS}>
      <div className={AUTH_FORM_INTRO_CLASS}>
        <h1 className={AUTH_HEADING_CLASS}>Sign in to Techwin</h1>
        <p className={AUTH_DESCRIPTION_CLASS}>
          Use your organization email and password. Platform Super Admin accounts also confirm with
          an authenticator app.
        </p>
      </div>

      {formError ? (
        <Alert variant="destructive" role="alert" className={cn(AUTH_ALERT_COMPACT_CLASS, 'mt-3')}>
          <AlertCircle aria-hidden="true" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : notice ? (
        <Alert variant="info" role="status" className={cn(AUTH_ALERT_COMPACT_CLASS, 'mt-3')}>
          <Info aria-hidden="true" />
          <AlertDescription>{loginNoticeMessage(notice)}</AlertDescription>
        </Alert>
      ) : null}

      <form
        noValidate
        onSubmit={(event) => void onSubmit(event)}
        className="block w-full"
        aria-busy={isSubmitting}
      >
        <div className={AUTH_FORM_FIELDS_GROUP_CLASS}>
        <AuthFormField id="email" label="Email" required error={errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              type="email"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="you@company.com"
              autoFocus
              disabled={isSubmitting}
              className={AUTH_FORM_FIELD_CLASS}
              {...form.register('email')}
            />
          )}
        </AuthFormField>

        <AuthFormField id="password" label="Password" required error={errors.password?.message}>
          {(control) => (
            <div className="relative">
              <Input
                {...control}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className={cn(AUTH_FORM_FIELD_CLASS, 'pr-10')}
                disabled={isSubmitting}
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="text-[#667085] hover:text-[#172033] focus-visible:ring-[#111111]/15 absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-[10px] outline-none focus-visible:ring-2"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                aria-controls="password"
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
          )}
        </AuthFormField>
        </div>

        <Button
          type="submit"
          className={cn(AUTH_PRIMARY_BUTTON_CLASS, AUTH_FORM_SUBMIT_CLASS)}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
      </form>

      <AuthHelpLinks />
    </div>
  );
}

/** @deprecated Use PlatformLoginForm */
export const AdminLoginForm = PlatformLoginForm;