import { NextRequest } from 'next/server';
import { insertServiceRequest } from '@/lib/db';
import { clean, noStoreJson, POLICY_VERSION, rateLimit, SERVICE_TYPES } from '@/lib/community';
import { notifyCommunitySubmission } from '@/services/notifier';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!await rateLimit(req, 'community-service', 5)) return noStoreJson({ error: '提交过于频繁，请稍后再试' }, { status: 429 });
  let body: { item_id?: number; service_type?: string; contact?: string; details?: string; accepted_rules?: boolean };
  try { body = await req.json(); } catch { return noStoreJson({ error: '提交格式无效' }, { status: 400 }); }
  if (!body.service_type?.trim() || !body.contact?.trim() || !body.details?.trim() || !body.accepted_rules) {
    return noStoreJson({ error: '请完整填写资料并接受服务规则' }, { status: 400 });
  }
  if (body.item_id !== undefined && (!Number.isInteger(body.item_id) || body.item_id <= 0)) {
    return noStoreJson({ error: '关联物品编号无效' }, { status: 400 });
  }
  if (!SERVICE_TYPES.includes(body.service_type as typeof SERVICE_TYPES[number])) return noStoreJson({ error: '无效的服务类型' }, { status: 400 });
  try {
    const request = await insertServiceRequest({
      item_id: body.item_id || null,
      service_type: clean(body.service_type, 100),
      contact: clean(body.contact, 300),
      details: clean(body.details, 2000),
      policy_version: POLICY_VERSION,
    });
    await notifyCommunitySubmission({
      kind: '服务需求',
      contact: clean(body.contact, 300),
      summary: `${clean(body.service_type, 100)}；${clean(body.details, 2000)}`,
      recordId: Number(request.id),
    }).catch(error => console.error('[community-notify]', (error as Error).message));
    return noStoreJson({ request: { id: request.id, status: request.status } }, { status: 201 });
  } catch {
    return noStoreJson({ error: '服务需求暂时未保存，请稍后再试' }, { status: 503 });
  }
}
