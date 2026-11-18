import Image from 'next/image';
import { FolderKanban, ShieldCheck, Users } from 'lucide-react';
import { TechwinLogo } from '@/shared/components/techwin-logo';
import { cn } from '@/shared/lib/utils';
import { AUTH_PANEL_LEFT_CLASS } from '../constants/auth-ui.constants';

const FEATURE_HIGHLIGHTS = [
  { label: 'Team Management', icon: Users },
  { label: 'Project Tracking', icon: FolderKanban },
  { label: 'Secure & Reliable', icon: ShieldCheck },
] as const;

export function PlatformAuthVisualPanel({ className }: { className?: string }) {
  return (
    <aside className={cn(AUTH_PANEL_LEFT_CLASS, 'h-full min-h-[inherit]', className)} aria-hidden="true">
      <Image
        src="/login/login-visual.png"
        alt=""
        fill
        priority
        sizes="(min-width: 768px) 540px, 0px"
        className="object-cover"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/5"
        aria-hidden="true"
      />
      <div className="relative z-10 flex h-full min-h-0 flex-col justify-between overflow-hidden p-[30px]">
        <div className="shrink-0 text-white [&_.fill-primary]:fill-white/20 [&_.fill-primary-foreground]:fill-white [&_span]:text-white [&_.text-foreground]:text-[14px] [&_.text-foreground]:font-medium [&_.text-muted-foreground]:text-[11px] [&_.text-muted-foreground]:text-white/75">
          <TechwinLogo subtitle="Platform administration" title="Techwin" compact />
        </div>
        <div className="mt-auto min-h-0 shrink-0 space-y-2.5 text-white">
          <h2 className="text-[23px] font-medium leading-snug tracking-tight text-white">
            Manage your business operations, all in one place.
          </h2>
          <p className="text-[13px] leading-snug text-white/85">
            A unified platform to manage your team, projects, operations and more, securely and
            efficiently.
          </p>
          <ul className="flex max-w-full flex-col gap-1.5">
            {FEATURE_HIGHLIGHTS.map(({ label, icon: Icon }) => (
              <li
                key={label}
                className="flex w-full items-center gap-1.5 rounded-md bg-black/25 px-2 py-1 text-[12px] font-normal text-white/95 backdrop-blur-[2px]"
              >
                <span className="flex size-[26px] shrink-0 items-center justify-center rounded bg-black/35">
                  <Icon className="size-[17px]" aria-hidden="true" />
                </span>
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}