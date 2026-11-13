import { EventEmitter } from 'node:events';
import { Inject, Injectable } from '@nestjs/common';
import { RedisService } from '../../../../infrastructure/cache/redis.service.js';

const FALLBACK_POLL_MS = 1_500;

export type OrgAccessPermissionChangeEvent = {
  readonly revision: string;
  readonly changed: boolean;
};

/**
 * Tenant-scoped permission revision wake channel.
 * Reuses the same authenticated long-poll pattern as WhatsApp realtime
 * (in-process emitter + Redis revision). Clients must refetch effective
 * permissions — the payload is never used as an authorization source.
 */
@Injectable()
export class OrgAccessPermissionRealtimeService {
  private readonly emitter = new EventEmitter();
  private readonly memoryRevisions = new Map<string, number>();

  constructor(@Inject(RedisService) private readonly redis: RedisService) {
    this.emitter.setMaxListeners(0);
  }

  private revisionKey(organizationId: string): string {
    return `org-access:perm-rev:${organizationId}`;
  }

  async currentRevision(organizationId: string): Promise<string> {
    try {
      const raw = await this.redis.client.get(this.revisionKey(organizationId));
      if (raw && /^\d+$/.test(raw)) return raw;
    } catch {
      // Fall through to in-memory revision when Redis is unavailable.
    }
    return String(this.memoryRevisions.get(organizationId) ?? 0);
  }

  async bump(organizationId: string): Promise<string> {
    let next = (this.memoryRevisions.get(organizationId) ?? 0) + 1;
    try {
      next = await this.redis.client.incr(this.revisionKey(organizationId));
    } catch {
      // Keep memory revision when Redis is unavailable.
    }
    this.memoryRevisions.set(organizationId, next);
    this.emitter.emit(organizationId);
    return String(next);
  }

  async waitForChange(
    organizationId: string,
    after: string | undefined,
    waitMs: number,
    signal: AbortSignal,
  ): Promise<OrgAccessPermissionChangeEvent> {
    const latest = await this.currentRevision(organizationId);
    if (after === undefined) {
      return { revision: latest, changed: false };
    }

    let cursor = after;
    try {
      if (BigInt(latest) > BigInt(cursor || '0')) {
        return { revision: latest, changed: true };
      }
    } catch {
      cursor = '0';
    }

    const deadline = Date.now() + waitMs;
    for (;;) {
      if (signal.aborted) {
        return { revision: await this.currentRevision(organizationId), changed: false };
      }
      const remaining = deadline - Date.now();
      if (remaining <= 0) {
        const current = await this.currentRevision(organizationId);
        let changed = false;
        try {
          changed = BigInt(current) > BigInt(cursor || '0');
        } catch {
          changed = current !== cursor;
        }
        return { revision: current, changed };
      }
      await this.waitForWake(organizationId, Math.min(remaining, FALLBACK_POLL_MS), signal);
      const current = await this.currentRevision(organizationId);
      try {
        if (BigInt(current) > BigInt(cursor || '0')) {
          return { revision: current, changed: true };
        }
      } catch {
        if (current !== cursor) return { revision: current, changed: true };
      }
    }
  }

  private waitForWake(organizationId: string, ms: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.emitter.off(organizationId, done);
        signal.removeEventListener('abort', done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.emitter.on(organizationId, done);
      signal.addEventListener('abort', done, { once: true });
    });
  }
}
