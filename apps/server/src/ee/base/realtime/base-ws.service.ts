import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Minimal realtime handler referenced by `ws/base-realtime.bridge.ts`. The full
 * collaborative editing broadcast for bases is out of scope for this backend
 * scaffold; this implementation satisfies the bridge contract so the websocket
 * layer loads without error. Row/page mutations are still reflected on clients
 * via the optimistic-update layer in `apps/client/src/ee/base/hooks`.
 */
@Injectable()
export class BaseWsService {
  private readonly logger = new Logger(BaseWsService.name);
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  isBaseEvent(data: unknown): boolean {
    if (!data || typeof data !== 'object') return false;
    const d = data as Record<string, unknown>;
    if (typeof d.operation === 'string' && d.operation.startsWith('base:')) {
      return true;
    }
    const entity = d.entity;
    if (Array.isArray(entity)) {
      return entity.some((e) =>
        ['baseRows', 'baseProperties', 'baseViews', 'bases'].includes(
          String(e),
        ),
      );
    }
    return false;
  }

  async handleInbound(_client: Socket, _data: unknown): Promise<void> {
    // No server-side collaboration broadcast implemented yet. Clients apply
    // their own optimistic updates and reconcile via query invalidation.
    return;
  }

  async handleDisconnect(_client: Socket): Promise<void> {
    return;
  }
}
