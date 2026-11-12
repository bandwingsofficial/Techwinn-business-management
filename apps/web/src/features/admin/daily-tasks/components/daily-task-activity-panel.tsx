'use client';

import type { DailyTaskActivityItem } from '../types';

function formatValue(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.length > 0 ? value.map((entry) => formatValue(entry)).join(', ') : '—';
  }
  return JSON.stringify(value);
}

function changeLine(label: string, from: unknown, to: unknown): string | null {
  if (from === to) return null;
  return `${label}: ${formatValue(from)} → ${formatValue(to)}`;
}

function formatActivityDescription(item: DailyTaskActivityItem): {
  title: string;
  detail: string | null;
} {
  const meta = item.metadata ?? {};
  switch (item.eventType) {
    case 'COMMENT_ADDED': {
      const scope = meta.scope === 'admin' ? 'Administrative note' : 'Note';
      return { title: scope, detail: String(meta.text ?? '').trim() || null };
    }
    case 'STAGE_CHANGED':
    case 'COMPLETED': {
      const fromName = meta.fromStageName ? String(meta.fromStageName) : null;
      const toName = meta.stageName
        ? String(meta.stageName)
        : meta.stageKey
          ? String(meta.stageKey)
          : null;
      if (item.eventType === 'COMPLETED') {
        return {
          title: 'Status changed to Completed',
          detail: fromName && toName ? changeLine('Status', fromName, toName) : toName,
        };
      }
      return {
        title: toName ? `Status changed to ${toName}` : 'Status updated',
        detail: fromName && toName ? changeLine('Status', fromName, toName) : null,
      };
    }
    case 'ASSIGNEES_CHANGED':
      return {
        title: 'Assignees updated',
        detail:
          changeLine('Assignees', meta.fromEmployeeIds, meta.toEmployeeIds) ??
          'Assignment list changed',
      };
    case 'RESCHEDULED':
      return {
        title: 'Assigned date changed',
        detail: changeLine('Assigned date', meta.fromAssignDate, meta.toAssignDate),
      };
    case 'CREATED':
      return {
        title: 'Task created and assigned',
        detail: meta.assignDate ? `Assigned date: ${String(meta.assignDate)}` : null,
      };
    case 'UPDATED': {
      const changes = (meta.changes ?? null) as Record<string, { from?: unknown; to?: unknown }> | null;
      if (changes && typeof changes === 'object') {
        const lines = Object.entries(changes)
          .map(([key, value]) => changeLine(key, value?.from, value?.to))
          .filter((line): line is string => Boolean(line));
        return {
          title: 'Task updated',
          detail: lines.length > 0 ? lines.join('\n') : null,
        };
      }
      return { title: 'Task updated', detail: null };
    }
    case 'PRIORITY_CHANGED':
      return {
        title: 'Priority changed',
        detail: changeLine('Priority', meta.from, meta.to),
      };
    case 'REOPENED':
      return { title: 'Task reopened', detail: null };
    default: {
      const eventType = String(item.eventType);
      return {
        title: eventType.replaceAll('_', ' ').toLowerCase(),
        detail: null,
      };
    }
  }
}

export function DailyTaskActivityPanel({
  items,
  newestFirst = true,
}: {
  items: readonly DailyTaskActivityItem[];
  newestFirst?: boolean;
}) {
  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">No activity recorded yet.</p>;
  }

  const ordered = newestFirst ? [...items].reverse() : items;

  return (
    <ol className="relative space-y-0 border-l border-border/70 pl-4">
      {ordered.map((item) => {
        const { title, detail } = formatActivityDescription(item);
        return (
          <li key={item.id} className="relative pb-4 last:pb-0">
            <span
              className="bg-background border-border absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2"
              aria-hidden
            />
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="text-foreground text-sm font-medium">{title}</p>
              <time className="text-muted-foreground text-xs tabular-nums">
                {new Date(item.occurredAt).toLocaleString()}
              </time>
            </div>
            <p className="text-muted-foreground mt-0.5 text-xs">
              by {item.actorDisplayName || 'Unknown'}
            </p>
            {detail ? (
              <p className="text-foreground/90 mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">
                {detail}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
