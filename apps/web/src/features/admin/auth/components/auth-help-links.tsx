import { BookOpen, LifeBuoy } from 'lucide-react';
import { AUTH_HELP_SECTION_CLASS, AUTH_LINK_MUTED_CLASS } from '../constants/auth-ui.constants';

export function AuthHelpLinks() {
  return (
    <div className={AUTH_HELP_SECTION_CLASS}>
      <div className="relative flex items-center py-1">
        <span className="bg-[#E1E5EC] h-px w-full" aria-hidden="true" />
        <span className="text-[#667085] absolute left-1/2 -translate-x-1/2 bg-white px-3 text-[12px] font-normal">
          Need help?
        </span>
      </div>
      <ul
        className={`${AUTH_LINK_MUTED_CLASS} flex flex-wrap items-center justify-center gap-x-12 gap-y-3 pt-3`}
      >
        <li className="flex items-center gap-2">
          <BookOpen className="size-4 shrink-0 text-[#667085]" aria-hidden="true" />
          <span>Documentation</span>
        </li>
        <li className="flex items-center gap-2">
          <LifeBuoy className="size-4 shrink-0 text-[#667085]" aria-hidden="true" />
          <span>Contact Support</span>
        </li>
      </ul>
    </div>
  );
}