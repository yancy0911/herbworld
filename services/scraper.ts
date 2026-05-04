/**
 * 获客雷达 — SearchAPI + Claude 智能初筛
 * 定位：国内客户在纽约的超级管家需求
 */

import Anthropic from '@anthropic-ai/sdk';

const SEARCH_QUERIES = [
  'site:1point3acres.com 纽约 代办 跑腿',
  'site:1point3acres.com 纽约 帮忙 国内',
  'site:reddit.com 纽约 代买 中国',
  'site:reddit.com nyc errand chinese help',
  '纽约代送礼 -"我们" -"服务" -"联系"',
  '纽约跑腿代买 求 -"专业" -"收费" -"提供"',
];

const LEADS_API_URL = process.env.LEADS_API_URL ?? 'http://localhost:3000/api/leads';

interface OrganicResult {
  title: string;
  snippet: string;
  link: string;
}

interface SearchApiResponse {
  organic_results?: OrganicResult[];
  error?: string;
}

interface Screening {
  valid: boolean;
  is_recent: boolean;        // 帖子发布于 2025 年或更晚
  is_cross_border: boolean;  // 人在国内、求助纽约
  summary: string;
  task: string | null;
  location: string | null;
  budget: string | null;
}

function isListPage(url: string): boolean {
  try {
    const u = new URL(url);
    const p = u.pathname;
    const listPatterns = [
      /\/tag[s]?\//i, /\/categor/i, /\/search/i,
      /\/page\//i, /\/topics?\//i, /\/forum[s]?\/?$/i,
    ];
    const listParams = ['q', 's', 'search', 'tag', 'page', 'keyword'];
    return (
      listPatterns.some(re => re.test(p)) ||
      listParams.some(k => u.searchParams.has(k)) ||
      p.split('/').filter(Boolean).length === 0
    );
  } catch {
    return false;
  }
}

async function screenWithAI(client: Anthropic, item: OrganicResult): Promise<Screening> {
  const currentYear = new Date().getFullYear(); // 2026
  const prompt = `判断以下搜索结果是否是真实用户发出的"求办事/求帮忙"帖子。
特别关注：是否是"人在中国大陆/国内，需要有人在纽约本地帮忙"的跨国需求。
今年是 ${currentYear} 年。

标题：${item.title}
摘要：${item.snippet}
链接：${item.link}

以 JSON 返回，不含其他内容：
{
  "valid": true或false（是否是真实求助帖，广告/新闻/攻略返回false）,
  "is_recent": true或false（帖子发布于2025年或更晚；若无法判断时间则返回true；若明确是2024年及以前则返回false）,
  "is_cross_border": true或false（发帖者是否人在国内、求纽约本地人帮忙）,
  "summary": "一句话：客户具体想要做什么（若非求助则写null）",
  "task": "任务名或null",
  "location": "地点或null",
  "budget": "预算或null"
}`;

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}';
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    return JSON.parse(cleaned) as Screening;
  } catch {
    return { valid: false, is_recent: true, is_cross_border: false, summary: '', task: null, location: null, budget: null };
  }
}

async function postLead(rawText: string, sourceUrl: string, s: Screening): Promise<boolean> {
  const res = await fetch(LEADS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: rawText,
      source_url: sourceUrl,
      summary: s.summary,
      task: s.task,
      location: s.location,
      budget: s.budget,
      is_cross_border: s.is_cross_border ? 1 : 0,
    }),
  });
  if (res.status === 409) return false;
  if (!res.ok) throw new Error(`POST /api/leads 失败: ${res.status}`);
  return true;
}

async function searchApiQuery(query: string, apiKey: string): Promise<OrganicResult[]> {
  const url = new URL('https://www.searchapi.io/api/v1/search');
  url.searchParams.set('engine', 'google');
  url.searchParams.set('q', query);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('tbs', 'qdr:w');   // 过去 7 天（中文内容索引延迟大）
  url.searchParams.set('num', '5');
  url.searchParams.set('gl', 'us');
  url.searchParams.set('hl', 'zh-cn');

  const res = await fetch(url.toString());
  const data = await res.json() as SearchApiResponse;
  if (!res.ok) throw new Error(`SearchAPI 错误: ${data.error ?? res.status}`);
  return data.organic_results ?? [];
}

let queryOffset = 0;
const BATCH_SIZE = 2;

export async function runScraper(): Promise<void> {
  const searchKey = process.env.SEARCHAPI_API_KEY;
  if (!searchKey) throw new Error('缺少 SEARCHAPI_API_KEY');

  const anthropic = new Anthropic();
  const batch = SEARCH_QUERIES.slice(queryOffset, queryOffset + BATCH_SIZE);
  queryOffset = (queryOffset + BATCH_SIZE) % SEARCH_QUERIES.length;

  console.log(`[${new Date().toISOString()}] 雷达扫描 — ${batch.join(' | ')}`);

  let found = 0; let skipped = 0; let filtered = 0;

  for (const query of batch) {
    try {
      const results = await searchApiQuery(query, searchKey);
      const posts = results.filter(r => !isListPage(r.link));
      filtered += results.length - posts.length;

      for (const item of posts) {
        const s = await screenWithAI(anthropic, item);
        if (!s.valid) { filtered++; continue; }

        if (!s.is_recent) {
          console.log(`  ✗ 僵尸帖（2024年前），丢弃: ${item.title.slice(0, 40)}`);
          filtered++;
          continue;
        }

        const tag = s.is_cross_border ? '[跨国需求] ' : '';
        console.log(`  ✓ ${tag}${s.summary}`);

        const rawText = [`[关键词: ${query}]`, `标题: ${item.title}`, `摘要: ${item.snippet}`, `链接: ${item.link}`].join('\n');
        const added = await postLead(rawText, item.link, s);
        if (added) found++; else skipped++;
      }
    } catch (err) {
      console.error(`  搜索 "${query}" 失败:`, (err as Error).message);
    }
  }

  console.log(`[${new Date().toISOString()}] 完成 — 新增 ${found} 条，过滤 ${filtered} 条，重复 ${skipped} 条`);
}
