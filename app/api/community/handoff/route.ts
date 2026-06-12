import { NextRequest } from 'next/server';
import { completeClaimHandoff } from '@/lib/db';
import { clean, hashHandoffCode, noStoreJson, rateLimit } from '@/lib/community';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  if (!await rateLimit(req, 'community-handoff', 12)) {
    return noStoreJson({ error: '尝试次数过多，请稍后再试' }, { status: 429 });
  }

  let body: { claim_id?: number; handoff_code?: string };
  try { body = await req.json(); } catch {
    return noStoreJson({ error: '提交格式无效' }, { status: 400 });
  }

  const claimId = Number(body.claim_id);
  const code = clean(body.handoff_code, 6);
  if (!Number.isInteger(claimId) || claimId <= 0 || !/^\d{6}$/.test(code)) {
    return noStoreJson({ error: '请输入正确的领取申请编号和六位取货码' }, { status: 400 });
  }

  try {
    const claim = await completeClaimHandoff(claimId, hashHandoffCode(claimId, code));
    return claim
      ? noStoreJson({ completed: true, item_id: Number(claim.item_id) })
      : noStoreJson({ error: '取货码无效、已使用或已经过期' }, { status: 409 });
  } catch {
    return noStoreJson({ error: '暂时无法完成交接，请联系平台' }, { status: 503 });
  }
}
