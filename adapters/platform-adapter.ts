import { Platform } from '@/types/domain';

export interface PlatformAdapter {
  platform: Platform;
  reconnect(): Promise<{ ok: boolean; message: string }>;
  sync(): Promise<{ ok: boolean; syncedAt: string }>;
  healthCheck(): Promise<{ status: 'Healthy' | 'Warning' | 'Error'; details: string }>;
}

export class MockPlatformAdapter implements PlatformAdapter {
  constructor(public platform: Platform) {}

  async reconnect() {
    return { ok: true, message: `${this.platform} credentials refreshed in sandbox mode.` };
  }

  async sync() {
    return { ok: true, syncedAt: new Date().toISOString() };
  }

  async healthCheck() {
    return { status: 'Healthy' as const, details: 'Mock connector responding with expected scopes.' };
  }
}
