import { createHash } from 'node:crypto';
import { NextRequest } from 'next/server';
import { allowSubmission, findLeadBySourceUrl, insertLead, listLeads } from '@/lib/db';
import { screenRequestRisk } from '@/lib/risk';
import { notifyFormLead } from '@/services/notifier';

export const runtime = 'nodejs';

interface ExtractedLead {
  task: string | null;
  location: string | null;
  budget: string | null;
  summary: string | null;
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    text?: string;
    source_url?: string;
    summary?: string;
    task?: string;
    location?: string;
    budget?: string;
    is_cross_border?: number;
    tier?: string;
    auto_reply?: string;
    author?: string;
    platform?: string;
    author_url?: string;
    post_content?: string;
    confidence?: number;
    name?: string;
    contact?: string;
    privacy_level?: string;
    urgency?: string;
    submission_kind?: string;
    service_country?: string;
    accepted_terms?: boolean;
  };
  const { text, source_url } = body;
  if (!text?.trim()) {
    return Response.json({ error: '缺少 text 字段' }, { status: 400 });
  }
  if (!body.accepted_terms) {
    return Response.json({ error: '请先确认服务条款与隐私政策' }, { status: 400 });
  }
  if (!body.contact?.trim() || !body.location?.trim()) {
    return Response.json({ error: '请填写联系方式和办事区域' }, { status: 400 });
  }
  if (body.platform === 'official-account') {
    if (!['customer', 'provider', 'merchant'].includes(body.submission_kind ?? '')) {
      return Response.json({ error: '缺少有效的提交类型' }, { status: 400 });
    }
    if (body.service_country !== 'US') {
      return Response.json({ error: '当前仅接受美国境内的事务、服务者和商家信息' }, { status: 422 });
    }
  }
  if (body.contact.length > 300 || body.location.length > 500) {
    return Response.json({ error: '联系方式或办事区域内容过长' }, { status: 413 });
  }
  if (text.length > 10_000) {
    return Response.json({ error: '提交内容过长，请精简后重试' }, { status: 413 });
  }

  const risk = screenRequestRisk(text);
  if (risk.blocked) {
    return Response.json(
      { error: `平台无法受理该需求：${risk.reason}` },
      { status: 422 },
    );
  }

  try {
    const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const sourceKey = createHash('sha256').update(forwardedFor).digest('hex');
    if (!await allowSubmission(sourceKey)) {
      return Response.json({ error: '提交过于频繁，请稍后再试或联系平台' }, { status: 429 });
    }

    if (source_url) {
      const existing = await findLeadBySourceUrl(source_url);
      if (existing) {
        return Response.json({ error: '已存在相同来源' }, { status: 409 });
      }
    }

    const extracted: ExtractedLead = {
      summary: body.summary ?? null,
      task: body.task ?? null,
      location: body.location ?? null,
      budget: body.budget ?? null,
    };

    const isCrossBorder = body.is_cross_border ?? 0;
    const tier = body.tier === 'vip' ? 'vip' : 'normal';
    const autoReply = body.auto_reply ?? null;
    const author = body.author ?? null;
    const platform = body.platform ?? 'web';
    const authorUrl = body.author_url ?? null;
    const postContent = body.post_content ?? null;
    const confidence = body.confidence ?? 0;
    const privacyLevel = body.privacy_level === 'private' ? 'private' : 'normal';
    const urgency = body.urgency === 'urgent' ? 'urgent' : 'normal';

    const lead = await insertLead({
      raw_text: text,
      summary: extracted.summary,
      task: extracted.task,
      location: extracted.location,
      budget: extracted.budget,
      source_url: source_url ?? null,
      is_cross_border: isCrossBorder,
      tier,
      auto_reply: autoReply,
      author,
      platform,
      author_url: authorUrl,
      post_content: postContent,
      confidence,
      requester_contact: body.contact.trim(),
      privacy_level: privacyLevel,
      urgency,
    });
    if (platform === 'official-account') {
      await notifyFormLead({
        name: body.name ?? '',
        contact: body.contact ?? '',
        need: text,
        score: confidence,
        tier,
        persisted: true,
      });
    }
    return Response.json({ lead }, { status: 201 });
  } catch (err) {
    console.error('[leads] 云端需求库写入失败:', (err as Error).message);
    await notifyFormLead({
      name: body.name ?? '',
      contact: body.contact ?? '',
      need: text,
      score: body.confidence ?? 0,
      tier: body.tier === 'vip' ? 'vip' : 'normal',
      persisted: false,
    });
    return Response.json({ error: '需求暂时未保存，请稍后重试或联系平台' }, { status: 503 });
  }
}

export async function GET(req: NextRequest) {
  const since = req.nextUrl.searchParams.get('since');
  const leads = await listLeads(since);
  return Response.json({ leads });
}
