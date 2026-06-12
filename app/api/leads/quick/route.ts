/**
 * POST /api/leads/quick
 * 一次请求完成：智能提取 → 存库 → 生成管家回复
 * 专为手动粘贴聊天记录设计
 */
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { insertLead, type Lead } from '@/lib/db';
import { screenRequestRisk } from '@/lib/risk';

export const runtime = 'nodejs';

const client = new Anthropic();

const WECHAT_ID = 'Charming-Furry';
const ACCOUNT_NAME = '纽约私人助理';

interface Extracted {
  summary: string;
  task: string | null;
  location: string | null;
  budget: string | null;
  is_urgent: boolean;
  tier: 'vip' | 'normal';
  is_cross_border: boolean;
}

async function extractAndScore(text: string): Promise<Extracted> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 300,
    messages: [{
      role: 'user',
      content: `从以下聊天记录中提取关键信息，以 JSON 返回，不含其他内容：
{
  "summary": "一句话：客户想在纽约做什么",
  "task": "具体任务名称或null",
  "location": "客户所在地或涉及地点，如'人在上海'、'曼哈顿第五大道'",
  "budget": "预算金额或null",
  "is_urgent": true或false（提到急/紧急/今天/明天/尽快则为true）,
  "tier": "vip"或"normal"（提到重金/酬谢/不差钱/奢侈品/商务/高端则为vip）,
  "is_cross_border": true或false（发帖者明确在中国大陆则为true）
}

聊天记录：
${text}`,
    }],
  });

  const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}';
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as Extracted;
  } catch {
    return { summary: text.slice(0, 40), task: null, location: null, budget: null, is_urgent: false, tier: 'normal', is_cross_border: false };
  }
}

async function generateReply(lead: Lead, extracted: Extracted): Promise<string> {
  const isCrossBorder = extracted.is_cross_border;
  const isVip = extracted.tier === 'vip';

  const context = [
    extracted.summary ? `客户需求：${extracted.summary}` : '',
    extracted.task    ? `任务：${extracted.task}`         : '',
    extracted.location? `地点/来源：${extracted.location}` : '',
    extracted.budget  ? `预算：${extracted.budget}`       : '',
    extracted.is_urgent ? '⚡ 紧急需求' : '',
    isCrossBorder ? '背景：客户人在中国大陆' : '',
  ].filter(Boolean).join('\n');

  const vipExtra = isVip ? `
这是重要客户，语气专业周到，但不得承诺必然成功、绝对保密或第三方一定配合。` : '';

  const crossExtra = isCrossBorder ? `
客户不在当地，重点说明：经相关人员同意后，可通过视频、照片或文字同步现场进度。` : '';

  const res = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system: `你是【${ACCOUNT_NAME}】公众号主理人，驻守纽约曼哈顿的高端私人管家。${vipExtra}${crossExtra}

必须包含以下三个要素（自然融入）：
① 开头或结尾表明"我是【${ACCOUNT_NAME}】公众号的主理人"
② 原文植入：您可以关注我的公众号【${ACCOUNT_NAME}】，查看我往期在曼哈顿为客户代办商务、惊喜送礼和实地考察的真实案例，信任第一。
③ 原文植入：细节可以加微信详聊，我的微信号是：${WECHAT_ID}。平台会先审核合法性、可执行性和风险，再确认范围、价格和记录方式。

字数220字以内，私人管家口吻，直接输出正文。`,
    messages: [{ role: 'user', content: context }],
  });

  return res.content[0].type === 'text' ? res.content[0].text.trim() : '';
}

export async function POST(req: NextRequest) {
  const { text } = await req.json() as { text?: string };
  if (!text?.trim()) {
    return Response.json({ error: '缺少 text 字段' }, { status: 400 });
  }
  const risk = screenRequestRisk(text);
  if (risk.blocked) {
    return Response.json({ error: `平台无法受理该需求：${risk.reason}` }, { status: 422 });
  }

  const extracted = await extractAndScore(text);
  const lead = await insertLead({
    raw_text: text,
    summary: extracted.summary,
    task: extracted.task,
    location: extracted.location,
    budget: extracted.budget,
    is_cross_border: extracted.is_cross_border ? 1 : 0,
    tier: extracted.tier,
    urgency: extracted.is_urgent ? 'urgent' : 'normal',
    platform: 'manual',
  });

  // 生成回复（sonnet）
  const reply = await generateReply(lead, extracted);

  return Response.json({
    lead,
    extracted: { ...extracted },
    reply,
  }, { status: 201 });
}
