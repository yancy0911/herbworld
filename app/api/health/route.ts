import { databaseHealth } from '@/lib/db';
import { noStoreJson } from '@/lib/community';

export const runtime = 'nodejs';

export async function GET() {
  try {
    await databaseHealth();
    return noStoreJson({ ok: true });
  } catch {
    return noStoreJson({ ok: false }, { status: 503 });
  }
}
