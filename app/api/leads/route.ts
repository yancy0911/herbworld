import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { getDb, type Lead } from '@/lib/db';

export const runtime = 'nodejs';

const client = new Anthropic();

interface ExtractedLead {
  task: string | null;
  location: string | null;
  budget: string | null;
  summary: string | null;
}

// 手动录入时走 LLM 提取（scraper 直接传入预提取字段，跳过此步）
async function extractLeadInfo(text: string): Promise<ExtractedLead> {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [{
      role: 'user',
      content: `从以下文本提取信息，以 JSON 返回，不含其他内容：
{"summary":"一句话说明客户想要什么","task":"任务名称或null","location":"地点或null","budget":"预算或null"}

文本：${text}`,
    }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
  try {
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as ExtractedLead;
  } catch {
    return { task: null, location: null, budget: null, summary: null };
  }
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
  };
  const { text, source_url } = body;
  if (!text?.trim()) {
    return Response.json({ error: '缺少 text 字段' }, { status: 400 });
  }

  const db = getDb();

  if (source_url) {
    const existing = db.prepare('SELECT id FROM leads WHERE source_url = ?').get(source_url);
    if (existing) {
      return Response.json({ error: '已存在相同来源' }, { status: 409 });
    }
  }

  // scraper 已预提取时直接用，否则调 LLM
  let extracted: ExtractedLead = {
    summary: body.summary ?? null,
    task: body.task ?? null,
    location: body.location ?? null,
    budget: body.budget ?? null,
  };

  const needsExtraction = !extracted.summary && !extracted.task;
  if (needsExtraction) {
    try {
      extracted = await extractLeadInfo(text);
    } catch (err) {
      console.warn('[leads] LLM 提取失败:', (err as Error).message);
    }
  }

  const isCrossBorder = body.is_cross_border ?? 0;

  const result = db.prepare(
    'INSERT INTO leads (raw_text, summary, task, location, budget, source_url, is_cross_border) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(text, extracted.summary, extracted.task, extracted.location, extracted.budget, source_url ?? null, isCrossBorder);

  const lead = db.prepare('SELECT * FROM leads WHERE id = ?').get(result.lastInsertRowid) as Lead;
  return Response.json({ lead }, { status: 201 });
}

export async function GET() {
  const db = getDb();
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all() as Lead[];
  return Response.json({ leads });
}
