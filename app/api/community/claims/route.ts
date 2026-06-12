import { NextRequest } from 'next/server';
import { insertItemClaim } from '@/lib/db';
import { clean, noStoreJson, POLICY_VERSION, rateLimit } from '@/lib/community';
import { notifyCommunitySubmission } from '@/services/notifier';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!await rateLimit(req, 'community-claim', 8)) return noStoreJson({ error: '提交过于频繁，请稍后再试' }, { status: 429 });
  let body: { item_id?: number; contact?: string; pickup_time?: string; transport_plan?: string; note?: string; accepted_rules?: boolean };
  try { body = await req.json(); } catch { return noStoreJson({ error: '提交格式无效' }, { status: 400 }); }
  if (!body.item_id || !body.contact?.trim() || !body.pickup_time?.trim() || !body.transport_plan?.trim() || !body.accepted_rules) {
    return noStoreJson({ error: '请完整填写资料并接受交接规则' }, { status: 400 });
  }
  try {
    const claim = await insertItemClaim({
      item_id: body.item_id,
      contact: clean(body.contact, 300),
      pickup_time: clean(body.pickup_time, 300),
      transport_plan: clean(body.transport_plan, 500),
      note: clean(body.note, 1000) || null,
      policy_version: POLICY_VERSION,
    });
    if (!claim) return noStoreJson({ error: '该物品尚未开放领取或已经下架' }, { status: 409 });
    await notifyCommunitySubmission({
      kind: '领取申请',
      contact: clean(body.contact, 300),
      summary: `物品 #${body.item_id}；${clean(body.pickup_time, 300)}；${clean(body.transport_plan, 500)}`,
      recordId: Number(claim.id),
    }).catch(error => console.error('[community-notify]', (error as Error).message));
    return noStoreJson({ claim: { id: claim.id, status: claim.status } }, { status: 201 });
  } catch {
    return noStoreJson({ error: '领取申请暂时未保存，请稍后再试' }, { status: 503 });
  }
}
