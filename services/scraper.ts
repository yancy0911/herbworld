/**
 * 获客雷达 v3 — 直连源头，零搜索引擎依赖
 * · Reddit JSON API  — 无 key，实时，含作者+永久链接
 * · 1point3acres     — 直接 HTML 搜索解析
 * · Serper / Brave   — 可选，设 env var 后自动启用
 */

import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import fs from 'node:fs';
import { findLeadBySourceUrl, insertLead } from '../lib/db';
import { screenRequestRisk } from '../lib/risk';
import { notifyNewLead } from './notifier';

const WECHAT_ID = 'Charming-Furry';
const ACCOUNT_NAME = '纽约私人助理';
const REDDIT_UA = 'HerbWorldBot/3.1 (nyc-private-assistant-radar; personal use)';

const POVERTY_SIGNALS = ['免费', '白嫖', '便宜', '拼人', '拼单', '求顺风', '纯咨询', '不收费'];

// ── Radar policy (optional; injected by cron.ts via env) ─────────────────────

function parseCsvLower(s: string | undefined): string[] {
  if (!s) return [];
  return s.split(',').map(x => x.trim().toLowerCase()).filter(Boolean);
}

const RADAR_MAX_AGE_MS = process.env.RADAR_MAX_AGE_MS ? Number(process.env.RADAR_MAX_AGE_MS) : NaN;
const RADAR_REQUIRED_TERMS = parseCsvLower(process.env.RADAR_REQUIRED_TERMS);
const RADAR_NEGATIVE_TERMS = parseCsvLower(process.env.RADAR_NEGATIVE_TERMS);
const RADAR_REQUIRED_MODE = (process.env.RADAR_REQUIRED_MODE ?? 'all').toLowerCase(); // 'all' | 'any'
const RADAR_STRICT_RECENCY = process.env.RADAR_STRICT_RECENCY === '1' || process.env.RADAR_STRICT_RECENCY === 'true';
const RADAR_LOG_FILTERED_TITLES = process.env.RADAR_LOG_FILTERED_TITLES === '1' || process.env.RADAR_LOG_FILTERED_TITLES === 'true';
const RADAR_RAW_FOUND_MODE = process.env.RADAR_RAW_FOUND_MODE === '1' || process.env.RADAR_RAW_FOUND_MODE === 'true';
const RADAR_AI_SUMMARY_MODE = process.env.RADAR_AI_SUMMARY_MODE === '1' || process.env.RADAR_AI_SUMMARY_MODE === 'true';
const RADAR_STOP_SELLING = process.env.RADAR_STOP_SELLING === '1' || process.env.RADAR_STOP_SELLING === 'true';
const RADAR_LLM_CLASSIFY_MODE = process.env.RADAR_LLM_CLASSIFY_MODE === '1' || process.env.RADAR_LLM_CLASSIFY_MODE === 'true';
const RADAR_LLM_CLASSIFY_MAX = process.env.RADAR_LLM_CLASSIFY_MAX ? Number(process.env.RADAR_LLM_CLASSIFY_MAX) : 25;

const OPENAI_MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o';
const MEDIA_INDEX_PATH = process.env.MEDIA_INDEX_PATH ?? '/Volumes/Manhattan_12TB/media_index.json';

type MediaIndex = {
  // lowercase landmark -> list of matching file paths
  landmarks?: Record<string, string[]>;
  // optional flat list of file paths
  files?: string[];
};

function loadMediaIndex(): MediaIndex | null {
  try {
    if (!fs.existsSync(MEDIA_INDEX_PATH)) return null;
    const raw = fs.readFileSync(MEDIA_INDEX_PATH, 'utf8');
    return JSON.parse(raw) as MediaIndex;
  } catch {
    return null;
  }
}

function collectAllPathsFromIndex(obj: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<unknown>();

  const walk = (v: unknown) => {
    if (v == null) return;
    if (seen.has(v)) return;
    if (typeof v === 'string') {
      // Heuristic: treat absolute-ish paths as paths
      if (v.startsWith('/') || v.includes('/Volumes/')) out.push(v);
      return;
    }
    if (typeof v !== 'object') return;
    seen.add(v);
    if (Array.isArray(v)) {
      for (const x of v) walk(x);
      return;
    }
    for (const x of Object.values(v as Record<string, unknown>)) walk(x);
  };

  walk(obj);
  return out;
}

function findGalleryStudioMedia(mediaIndex: MediaIndex | null): string[] {
  if (!mediaIndex) return [];
  const all = [
    ...(mediaIndex.files ?? []),
    ...Object.values(mediaIndex.landmarks ?? {}).flat(),
    ...collectAllPathsFromIndex(mediaIndex),
  ];
  const dedup = Array.from(new Set(all)).filter(Boolean);
  return dedup.filter(p => /(?:^|\/)[^/]*(Gallery|Studio)[^/]*$/i.test(p) || /\/(Gallery|Studio)\b/i.test(p));
}

function findMediaMatches(mediaIndex: MediaIndex | null, terms: string[]): string[] {
  if (!mediaIndex || terms.length === 0) return [];
  const hay = [
    ...(mediaIndex.files ?? []),
    ...Object.values(mediaIndex.landmarks ?? {}).flat(),
    ...collectAllPathsFromIndex(mediaIndex),
  ];
  const uniq = Array.from(new Set(hay));
  const t = terms.map(x => x.toLowerCase()).filter(Boolean);
  return uniq.filter(p => {
    const lp = String(p).toLowerCase();
    return t.some(k => lp.includes(k));
  });
}

function extractLandmarks(text: string): string[] {
  const t = text.toLowerCase();
  const known = [
    'times square', 'central park', 'fifth avenue', '5th avenue', 'soho', 'tribeca',
    'wall street', 'brooklyn bridge', 'grand central', 'penn station', 'columbia',
    'nyu', 'met museum', 'the met', 'rockefeller', 'hudson yards', 'high line',
  ];
  return known.filter(k => t.includes(k)).map(k => k === '5th avenue' ? 'fifth avenue' : k);
}

async function summarizeLatentIntentOpenAI(item: OrganicResult): Promise<{ subtext: string; landmarks: string[]; draft: string }> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY for GPT-4 summaries');
  }

  const client = new OpenAI({ apiKey });
  const content = [
    `Title: ${item.title}`,
    `Snippet: ${item.snippet}`,
    item.fullContent ? `Body: ${item.fullContent.slice(0, 1500)}` : '',
    `Link: ${item.link}`,
  ].filter(Boolean).join('\n');

  const resp = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a NYC insider. Return JSON only.',
      },
      {
        role: 'user',
        content:
          `Analyze this post and return JSON:\n` +
          `{"subtext":"<潜台词/真实需求，1-2句中文>","landmarks":["<地标/区域名>"],"draft":"<纽约圈内人视角建议草稿，中文，150-260字，像在曼哈顿生活10年财务自由的朋友随口帮忙，别推销>"}\n\n` +
          content,
      },
    ],
    temperature: 0.2,
    max_tokens: 420,
  });

  const raw = resp.choices[0]?.message?.content?.trim() ?? '{}';
  try {
    const parsed = JSON.parse(raw) as { subtext?: string; landmarks?: string[]; draft?: string };
    const subtext = typeof parsed.subtext === 'string' ? parsed.subtext : '';
    const landmarks = Array.isArray(parsed.landmarks) ? parsed.landmarks.filter(x => typeof x === 'string') : [];
    const draft = typeof parsed.draft === 'string' ? parsed.draft : '';
    return { subtext, landmarks, draft };
  } catch {
    // Fallback: extract landmarks locally even if JSON parse fails
    return { subtext: raw.slice(0, 300), landmarks: extractLandmarks(content), draft: '' };
  }
}

type LlmClassify = {
  isHighValue: boolean;
  score: number; // 0-100
  needType: string;
  keywords: string[];
  landmarks: string[];
  subtext: string;
};

async function classifyHighValueOpenAI(item: OrganicResult): Promise<LlmClassify> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY for GPT-4 classification');

  const client = new OpenAI({ apiKey });
  const content = [
    `Title: ${item.title}`,
    `Snippet: ${item.snippet}`,
    item.fullContent ? `Body: ${item.fullContent.slice(0, 1500)}` : '',
    `Link: ${item.link}`,
  ].filter(Boolean).join('\n');

  const resp = await client.chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      {
        role: 'system',
        content:
          'You are a NYC private assistant lead analyst. Detect high-value New York service demands: real estate, LLC/company setup, lawyer/accountant/bank coordination, private school admissions, relocation, or remote local execution for people not in NYC. Return JSON only.',
      },
      {
        role: 'user',
        content:
          `Return JSON:\n` +
          `{"isHighValue":true|false,"score":0-100,"needType":"...","keywords":["..."],"landmarks":["..."],"subtext":"中文潜台词(1-2句)"}\n\n` +
          content,
      },
    ],
    temperature: 0.2,
    max_tokens: 260,
  });

  const raw = resp.choices[0]?.message?.content?.trim() ?? '{}';
  try {
    const j = JSON.parse(raw) as Partial<LlmClassify>;
    return {
      isHighValue: Boolean(j.isHighValue),
      score: typeof j.score === 'number' ? j.score : 0,
      needType: typeof j.needType === 'string' ? j.needType : '',
      keywords: Array.isArray(j.keywords) ? j.keywords.filter(x => typeof x === 'string') : [],
      landmarks: Array.isArray(j.landmarks) ? j.landmarks.filter(x => typeof x === 'string') : [],
      subtext: typeof j.subtext === 'string' ? j.subtext : '',
    };
  } catch {
    return { isHighValue: false, score: 0, needType: '', keywords: [], landmarks: [], subtext: '' };
  }
}

function radarCutoffEpochSec(): number | null {
  if (!Number.isFinite(RADAR_MAX_AGE_MS) || RADAR_MAX_AGE_MS <= 0) return null;
  return Date.now() / 1000 - RADAR_MAX_AGE_MS / 1000;
}

function mergeSinceEpochSec(hoursBack: number): number {
  const soft = Date.now() / 1000 - hoursBack * 3600;
  const hard = radarCutoffEpochSec();
  if (hard == null) return soft;
  // stricter = larger epoch (more recent)
  return Math.max(soft, hard);
}

function itemTextBlob(item: OrganicResult): string {
  return `${item.title} ${item.snippet} ${item.fullContent ?? ''}`.toLowerCase();
}

function passesRadarGates(item: OrganicResult): boolean {
  const blob = itemTextBlob(item);
  if (RADAR_NEGATIVE_TERMS.length && RADAR_NEGATIVE_TERMS.some(t => blob.includes(t))) return false;
  if (RADAR_REQUIRED_TERMS.length) {
    const ok =
      RADAR_REQUIRED_MODE === 'any'
        ? RADAR_REQUIRED_TERMS.some(t => blob.includes(t))
        : RADAR_REQUIRED_TERMS.every(t => blob.includes(t));
    if (!ok) return false;
  }
  return true;
}

// ── Source configuration ──────────────────────────────────────────────────────

// Reddit /new feeds — NYC local, real estate, school, finance and relocation intent
const REDDIT_NEW_FEEDS = [
  { sub: 'AskNYC',              hours: 12 },
  { sub: 'manhattan',           hours: 12 },
  { sub: 'nyc',                 hours: 12 },
  { sub: 'NYCapartments',       hours: 24 },
  { sub: 'realestateinvesting',  hours: 72 },
  { sub: 'fatFIRE',             hours: 72 },
  { sub: 'immigration',         hours: 72 },
  { sub: 'law',                 hours: 72 },
  { sub: 'personalfinance',     hours: 48 },
];

// High-value NYC service searches — remote owner/buyer/family needs local execution
const REDDIT_SEARCHES = [
  { q: 'buy apartment NYC LLC non resident lawyer bank',             hours: 168, t: 'month' },
  { q: 'NYC condo purchase LLC foreign buyer attorney accountant',    hours: 168, t: 'month' },
  { q: 'Manhattan real estate buyer not in New York need local help', hours: 168, t: 'month' },
  { q: 'NYC LLC formation real estate foreign owner bank account',    hours: 168, t: 'month' },
  { q: 'New York company registration non resident bank lawyer',      hours: 168, t: 'month' },
  { q: 'NYC private school admissions relocation family help',        hours: 168, t: 'month' },
  { q: 'moving to NYC from abroad school apartment bank attorney',    hours: 168, t: 'month' },
  { q: 'NYC concierge relocation apartment school bank setup',        hours: 168, t: 'month' },
  { q: 'need someone in NYC to handle local paperwork attorney bank', hours: 168, t: 'month' },
  { q: 'not in NYC need local representative real estate lawyer',     hours: 168, t: 'month' },
  { q: 'NYC property management out of state owner local help',       hours: 168, t: 'month' },
  { q: 'NYC attorney accountant referral LLC real estate investor',   hours: 168, t: 'month' },
];

// 1point3acres — Chinese-speaking remote NYC service needs
const P3A_QUERIES = [
  '人在国内 纽约买房 律师 会计 LLC',
  '纽约 买房 注册公司 持有 房产',
  '纽约 LLC 注册 银行开户 律师',
  '纽约 公司注册 非居民 银行开户',
  '纽约 私校申请 搬家 落地',
  '纽约 买公寓 外州 本地帮忙',
  '纽约 律师 会计 银行 对接',
  '曼哈顿 置业 海外买家 LLC',
  '纽约 本地代办 房产 公司',
  '纽约 高净值 私人助理',
  '纽约 投资房 管理 外州房东',
  '纽约 家庭落地 私校 租房',
];

// Google fallback queries (Serper / Brave)
const GOOGLE_QUERIES = [
  '"人在国内" 纽约 买房 LLC 律师 会计',
  '"人在外地" 纽约 公司注册 银行开户',
  'NYC real estate LLC foreign buyer attorney accountant',
  'NYC relocation private school apartment bank setup',
  'New York local representative real estate lawyer bank',
];

// ── Types ─────────────────────────────────────────────────────────────────────

interface OrganicResult {
  title: string;
  snippet: string;
  link: string;
  knownAuthor?: string;   // set when source provides it directly (Reddit API)
  fullContent?: string;   // full post body when available
}

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  permalink: string;
  created_utc: number;
  subreddit: string;
  is_self: boolean;
  removed_by_category?: string | null;
  url: string;
}

interface Screening {
  valid: boolean;
  is_recent: boolean;
  is_vip: boolean;
  is_cross_border: boolean;
  tier: 'vip' | 'normal';
  summary: string;
  summary_zh: string;
  task: string | null;
  location: string | null;
  budget: string | null;
  author: string | null;
  confidence: number;
}

// ── URL helpers ───────────────────────────────────────────────────────────────

function isListPage(url: string): boolean {
  try {
    const u = new URL(url);
    const p = u.pathname;
    return (
      [/\/tag[s]?\//i, /\/categor/i, /\/search/i, /\/page\//i, /\/topics?\//i].some(r => r.test(p)) ||
      ['q', 's', 'search', 'tag', 'page'].some(k => u.searchParams.has(k)) ||
      p.split('/').filter(Boolean).length === 0
    );
  } catch { return false; }
}

function detectPlatform(url: string): string {
  if (/reddit\.com/i.test(url))                            return 'reddit';
  if (/1point3acres\.com/i.test(url))                      return '1point3acres';
  if (/xiaohongshu\.com|xhslink\.com|xhs\.link/i.test(url)) return 'xiaohongshu';
  if (/weibo\.com/i.test(url))                             return 'weibo';
  if (/zhihu\.com/i.test(url))                             return 'zhihu';
  if (/twitter\.com|x\.com/i.test(url))                   return 'twitter';
  return 'web';
}

function isRedditDirectPost(url: string): boolean {
  return /reddit\.com\/r\/[^/]+\/comments\/[a-z0-9]+/i.test(url);
}

function normalizeDirectUrl(url: string, platform: string): string {
  try {
    const u = new URL(url);
    if (platform === 'reddit') {
      const path = u.pathname.endsWith('/') ? u.pathname : `${u.pathname}/`;
      return `https://www.reddit.com${path}`;
    }
    return `${u.origin}${u.pathname}${u.search}`;
  } catch { return url; }
}

function buildDmUrl(platform: string, author: string): string | null {
  const enc = encodeURIComponent(author);
  if (platform === 'reddit')        return `https://www.reddit.com/message/compose/?to=${enc}`;
  if (platform === '1point3acres')  return `https://www.1point3acres.com/bbs/pm.php?action=newpm&touser=${enc}`;
  return null;
}

function cleanAuthor(raw: string): string {
  return raw.replace(/^(@|u\/|\/u\/)/i, '').trim();
}

function hasPovertySignal(item: OrganicResult): boolean {
  const text = `${item.title} ${item.snippet}`;
  return POVERTY_SIGNALS.some(s => text.includes(s));
}

// Must match at least one signal keyword to proceed to AI screening
// Only buyer-intent phrases reach the AI — style advice is filtered before paying for a call
const SIGNAL_KEYWORDS = [
  'buy apartment', 'buy condo', 'real estate', 'property', 'llc',
  'company formation', 'registered agent', 'bank account', 'attorney',
  'accountant', 'private school', 'school admission', 'relocation',
  'concierge', 'local representative', 'not in new york', 'not in nyc',
  'out of state', 'abroad', 'foreign buyer', 'non resident', 'need someone in nyc',
  '纽约买房', '纽约置业', '曼哈顿买房', '注册公司', '有限责任公司',
  '银行开户', '律师', '会计', '私校', '学校申请', '家庭落地',
  '人在国内', '人在外地', '不在纽约', '本地代办', '本地对接',
  '私人助理', '投资房', '房产管理', '海外买家', '高净值',
];

function hasSignalKeyword(item: OrganicResult): boolean {
  const text = `${item.title} ${item.snippet}`.toLowerCase();
  return SIGNAL_KEYWORDS.some(kw => text.includes(kw.toLowerCase()));
}

// ── Reddit direct API ─────────────────────────────────────────────────────────

function redditPostToResult(p: RedditPost): OrganicResult {
  return {
    title:       p.title,
    snippet:     p.selftext ? p.selftext.slice(0, 500) : p.title,
    link:        `https://www.reddit.com${p.permalink}`,
    knownAuthor: p.author,
    fullContent: p.is_self ? `${p.title}\n\n${p.selftext}`.trim() : p.title,
  };
}

async function fetchRedditNew(sub: string, hoursBack: number): Promise<OrganicResult[]> {
  const since = mergeSinceEpochSec(hoursBack);
  try {
    const res = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=50`, {
      headers: { 'User-Agent': REDDIT_UA },
    });
    if (!res.ok) return [];
    const data = await res.json() as { data: { children: { data: RedditPost }[] } };
    return data.data.children
      .map(c => c.data)
      .filter(p => p.created_utc > since && p.author !== '[deleted]' && !p.removed_by_category)
      .map(redditPostToResult);
  } catch { return []; }
}

async function searchReddit(q: string, hoursBack: number, t: string): Promise<OrganicResult[]> {
  const since = mergeSinceEpochSec(hoursBack);
  try {
    const url = new URL('https://www.reddit.com/search.json');
    url.searchParams.set('q', q);
    url.searchParams.set('sort', 'new');
    url.searchParams.set('t', t);
    url.searchParams.set('limit', '25');
    const res = await fetch(url.toString(), { headers: { 'User-Agent': REDDIT_UA } });
    if (!res.ok) return [];
    const data = await res.json() as { data: { children: { data: RedditPost }[] } };
    return data.data.children
      .map(c => c.data)
      .filter(p => p.created_utc > since && p.author !== '[deleted]' && !p.removed_by_category)
      .map(redditPostToResult);
  } catch { return []; }
}

// ── 1point3acres direct HTML scraping ────────────────────────────────────────

async function search1point3acres(query: string): Promise<OrganicResult[]> {
  const url = new URL('https://www.1point3acres.com/bbs/search.php');
  url.searchParams.set('mod', 'forum');
  url.searchParams.set('searchsubmit', 'yes');
  url.searchParams.set('orderby', 'lastpost');
  url.searchParams.set('ascdesc', 'desc');
  url.searchParams.set('q', query);

  let html: string;
  try {
    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://www.1point3acres.com/bbs/',
      },
    });
    if (!res.ok) return [];
    html = await res.text();
  } catch { return []; }

  // Bail if no thread links in response (login wall or empty)
  if (!html.includes('thread-')) return [];

  const results: OrganicResult[] = [];
  const seen = new Set<string>();

  // Discuz! BBS thread links: href="thread-XXXXXX-1-1.html" with title text following
  const re = /href="(thread-(\d+)-\d+-\d+\.html)"[^>]*>([^<]{4,120})</g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const [, relPath, threadId, rawTitle] = m;
    if (seen.has(threadId)) continue;
    const title = rawTitle
      .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#\d+;/g, '').trim();
    if (title.length < 5) continue;
    seen.add(threadId);
    results.push({
      title,
      snippet: `一亩三分地论坛 — 搜索词: ${query}`,
      link: `https://www.1point3acres.com/bbs/${relPath}`,
    });
    if (results.length >= 8) break;
  }

  return results;
}

// ── Optional: Serper / Brave ──────────────────────────────────────────────────

async function searchSerper(query: string, apiKey: string): Promise<OrganicResult[]> {
  let tbs = 'qdr:h';
  if (Number.isFinite(RADAR_MAX_AGE_MS)) {
    if (RADAR_MAX_AGE_MS <= 2 * 60 * 60 * 1000) tbs = 'qdr:2';
    else if (RADAR_MAX_AGE_MS <= 4 * 60 * 60 * 1000) tbs = 'qdr:4';
  }
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: 10, tbs, gl: 'us', hl: 'zh-cn' }),
  });
  if (!res.ok) throw new Error(`Serper HTTP ${res.status}`);
  const data = await res.json() as { organic?: { title: string; snippet: string; link: string }[] };
  return (data.organic ?? []).map(r => ({ title: r.title, snippet: r.snippet, link: r.link }));
}

async function searchBrave(query: string, apiKey: string): Promise<OrganicResult[]> {
  const url = new URL('https://api.search.brave.com/res/v1/web/search');
  url.searchParams.set('q', query);
  url.searchParams.set('count', '10');
  url.searchParams.set('country', 'US');
  url.searchParams.set('freshness', 'pd');
  const res = await fetch(url.toString(), {
    headers: { 'X-Subscription-Token': apiKey, 'Accept': 'application/json' },
  });
  if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
  const data = await res.json() as { web?: { results?: { title: string; description: string; url: string }[] } };
  return (data.web?.results ?? []).map(r => ({ title: r.title, snippet: r.description, link: r.url }));
}

// ── AI screening ──────────────────────────────────────────────────────────────

async function screenWithAI(client: Anthropic, item: OrganicResult): Promise<Screening> {
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月`;
  const prompt = `现在是${dateStr}。你是纽约私人助理获客雷达，只识别"高价值纽约事务"——即人不在纽约或不熟悉纽约，需要纽约当地人协助判断、对接或执行的真实付费需求。

标题：${item.title}
摘要：${item.snippet.slice(0, 600)}
链接：${item.link}

【valid=true — 满足以下任一场景即可】：

场景A：纽约置业或房产事务
① 用户要在纽约/曼哈顿买房、租房、看房、持有房产、管理投资房
② 涉及 LLC、律师、会计、银行、产权、税务、远程看房或本地核实

场景B：公司/法律/金融对接
① 用户需要注册纽约/美国公司、开银行账户、找律师或会计
② 用户不清楚顺序、预算、合规边界，需要当地人梳理和对接

场景C：家庭落地/私校/高端事务
① 涉及私校申请、家庭搬迁、纽约本地安排、远程办事
② 用户时间紧、人在国内/外州、预算明确或有高净值特征

【valid=false（立即拒绝）】：
- 只是问旅游攻略、餐厅推荐、普通租房省钱、免费咨询
- 学生低预算、拼车拼单、纯吐槽、新闻讨论
- 没有纽约本地执行或多方对接需求
- 已经解决了，只是分享经验

- is_vip=true：涉及买房/投资房/公司结构/私校/律师会计银行/高预算/跨境家庭
- is_cross_border=true：发帖人在中国大陆/亚洲/欧洲/外州，或明确不在纽约
- confidence：0-100。只有"纽约事务、付费可能、需要本地对接或执行"三者清晰时才≥85
- summary_zh：一句中文精准描述这个客户的核心需求

JSON返回（单行，无markdown）：{"valid":bool,"is_recent":bool,"is_vip":bool,"tier":"vip"或"normal","is_cross_border":bool,"summary":"English summary or null","summary_zh":"中文买家需求描述","task":"task or null","location":"city or null","budget":"budget or null","author":"username or null","confidence":0-100}`;

  try {
    const res = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });
    const raw = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}';
    return JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()) as Screening;
  } catch {
    return { valid: false, is_recent: true, is_vip: false, tier: 'normal', is_cross_border: false, summary: '', summary_zh: '', task: null, location: null, budget: null, author: null, confidence: 0 };
  }
}

async function generateAutoReply(s: Screening): Promise<string> {
  const vipExtra   = s.is_vip          ? '\n这是高净值客户，语气更专业克制，强调本地判断、多方对接和隐私边界。' : '';
  const crossExtra = s.is_cross_border ? '\n客户不在纽约，重点强调可远程沟通、在纽约本地核实和按步骤推进。' : '';
  const context    = [
    s.summary  ? `需求：${s.summary}`  : '',
    s.task     ? `任务：${s.task}`     : '',
    s.location ? `地点：${s.location}` : '',
    s.budget   ? `预算：${s.budget}`   : '',
  ].filter(Boolean).join('\n');

  try {
    const res = await new Anthropic().messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: `你是【${ACCOUNT_NAME}】公众号主理人，驻守纽约曼哈顿的高端私人管家。${vipExtra}${crossExtra}
必须包含（自然融入）：
①"我是【${ACCOUNT_NAME}】公众号的主理人"
②原文：您可以关注我的公众号【${ACCOUNT_NAME}】，查看我往期关于纽约置业、公司注册、律师会计银行对接和本地事务执行的内容。
③原文：细节咱们可以加个微信详聊，我的微信号是：${WECHAT_ID}。如果要认真推进，可以先做一次纽约事务诊断，把路径、预算和风险边界拆清楚。
200字以内，专业克制，直接输出正文。`,
      messages: [{ role: 'user', content: context || '纽约本地事务咨询' }],
    });
    return res.content[0].type === 'text' ? res.content[0].text.trim() : '';
  } catch { return ''; }
}

async function saveLead(
  rawText: string, sourceUrl: string, s: Screening, autoReply: string,
  platform: string, author: string | null, authorUrl: string | null, postContent: string
): Promise<boolean> {
  if (screenRequestRisk(rawText).blocked) return false;
  const existing = await findLeadBySourceUrl(sourceUrl);
  if (existing) return false;
  await insertLead({
    raw_text: rawText,
    summary: s.summary,
    summary_zh: s.summary_zh || null,
    task: s.task,
    location: s.location,
    budget: s.budget,
    source_url: sourceUrl,
    is_cross_border: s.is_cross_border ? 1 : 0,
    tier: s.tier,
    auto_reply: autoReply,
    author,
    platform,
    author_url: authorUrl,
    post_content: postContent,
    confidence: s.confidence,
  });
  return true;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function runScraper(): Promise<{ found: number; filtered: number }> {
  const anthropic  = new Anthropic();
  const serperKey  = process.env.SERPER_API_KEY;
  const braveKey   = process.env.BRAVE_SEARCH_KEY;

  if (RADAR_STOP_SELLING) {
    console.log('   🧊 推销逻辑已停用：不会写库、不会通知、不会生成自动回复');
  }
  if (RADAR_AI_SUMMARY_MODE) {
    console.log(`   🧠 GPT-4 总结已启用：model=${OPENAI_MODEL}`);
  }

  if (RADAR_RAW_FOUND_MODE) {
    console.log('   🔎 原始观察模式：仅输出匹配词的原始链接（不走 AI，不做额外过滤）');
  }

  const sources: string[] = [
    `Reddit(${REDDIT_NEW_FEEDS.length}版+${REDDIT_SEARCHES.length}词)`,
  ];
  if (!RADAR_STRICT_RECENCY) sources.push(`1point3acres(${P3A_QUERIES.length}词)`);
  if (serperKey) sources.push('Serper');
  if (braveKey && !RADAR_STRICT_RECENCY) sources.push('Brave');
  console.log(`\n[${new Date().toISOString()}] 🚨 截胡巡逻 — ${sources.join(' + ')}`);
  if (RADAR_STRICT_RECENCY) {
    const winH = Number.isFinite(RADAR_MAX_AGE_MS) && RADAR_MAX_AGE_MS > 0 ? RADAR_MAX_AGE_MS / 3600000 : null;
    const winLabel = winH == null ? '设定' : `${winH}小时`;
    console.log(`   ⏱ 严格时效：跳过 1point3acres；Brave 关闭（避免无法对齐最近 ${winLabel} 窗口）`);
  }
  if (RADAR_REQUIRED_TERMS.length) {
    const modeLabel = RADAR_REQUIRED_MODE === 'any' ? 'ANY' : 'AND';
    console.log(`   ✅ 关键词门槛(${modeLabel})：`, RADAR_REQUIRED_TERMS.join(', '));
  }
  if (RADAR_NEGATIVE_TERMS.length) {
    console.log('   🚫 负面过滤：', RADAR_NEGATIVE_TERMS.join(', '));
  }

  type Batch = Promise<{ label: string; results: OrganicResult[] }>;

  const tasks: Batch[] = [
    // Reddit /new per subreddit
    ...REDDIT_NEW_FEEDS.map(({ sub, hours }) =>
      fetchRedditNew(sub, hours)
        .then(r => ({ label: `r/${sub}`, results: r }))
        .catch(() => ({ label: `r/${sub}`, results: [] as OrganicResult[] }))
    ),
    // Reddit keyword searches
    ...REDDIT_SEARCHES.map(({ q, hours, t }) =>
      searchReddit(q, hours, t)
        .then(r => ({ label: 'reddit-kw', results: r }))
        .catch(() => ({ label: 'reddit-kw', results: [] as OrganicResult[] }))
    ),
    // 1point3acres direct (skipped in strict recency mode — no reliable post timestamps in list HTML)
    ...(RADAR_STRICT_RECENCY ? [] : P3A_QUERIES.map(q =>
      search1point3acres(q)
        .then(r => { if (r.length) console.log(`  ⛏ 1p3a"${q}" → ${r.length}条`); return { label: '1p3a', results: r }; })
        .catch(() => ({ label: '1p3a', results: [] as OrganicResult[] }))
    )),
    // Optional: Serper
    ...(serperKey ? GOOGLE_QUERIES.map(q =>
      searchSerper(q, serperKey)
        .then(r => ({ label: 'serper', results: r }))
        .catch((e: Error) => { console.error('  Serper失败:', e.message); return { label: 'serper', results: [] as OrganicResult[] }; })
    ) : []),
    // Optional: Brave
    ...(braveKey && !RADAR_STRICT_RECENCY ? GOOGLE_QUERIES.map(q =>
      searchBrave(q, braveKey)
        .then(r => ({ label: 'brave', results: r }))
        .catch((e: Error) => { console.error('  Brave失败:', e.message); return { label: 'brave', results: [] as OrganicResult[] }; })
    ) : []),
  ];

  const batches = await Promise.allSettled(tasks);

  // Merge + deduplicate by link
  const seenLinks = new Set<string>();
  const allItems: OrganicResult[] = [];
  for (const b of batches) {
    if (b.status === 'rejected') { console.error('  批次失败:', b.reason); continue; }
    for (const item of b.value.results) {
      if (!seenLinks.has(item.link)) {
        seenLinks.add(item.link);
        allItems.push(item);
      }
    }
  }
  console.log(`  共 ${allItems.length} 条候选，开始 AI 筛选...`);

  let found = 0, filtered = 0;
  const filteredTitles: string[] = [];
  const posts = allItems.filter(r => !isListPage(r.link));
  filtered += allItems.length - posts.length;

  if (RADAR_LLM_CLASSIFY_MODE) {
    console.log(`   🧠 LLM 识别高净值需求：max=${Number.isFinite(RADAR_LLM_CLASSIFY_MAX) ? RADAR_LLM_CLASSIFY_MAX : 25}`);
    const mediaIndex = loadMediaIndex();
    const galleryStudioHits = findGalleryStudioMedia(mediaIndex);
    let inspected = 0;

    for (const item of posts) {
      if (inspected >= (Number.isFinite(RADAR_LLM_CLASSIFY_MAX) ? RADAR_LLM_CLASSIFY_MAX : 25)) break;
      if (!passesRadarGates(item)) continue;

      // Cheap prefilter: avoid spending LLM calls on obvious noise
      const blob = itemTextBlob(item);
      const likely = /artist|framing|frame|bespoke|concierge|courier|gift|gallery|studio|nyc|manhattan/i.test(blob);
      if (!likely) continue;

      inspected++;
      const platform = detectPlatform(item.link);
      const directUrl = normalizeDirectUrl(item.link, platform);

      const c = await classifyHighValueOpenAI(item);
      if (!c.isHighValue || c.score < 70) continue;

      console.log(`\n[FOUND] ${directUrl}`);
      console.log(`  [SCORE] ${c.score}  [TYPE] ${c.needType || 'high-value'}`);
      if (c.subtext) console.log(`  [SUBTEXT] ${c.subtext}`);

      const terms = Array.from(new Set([...(c.keywords ?? []), ...(c.landmarks ?? [])]))
        .map(x => x.trim())
        .filter(Boolean);

      if (!mediaIndex) {
        console.log(`  [MEDIA] no index at ${MEDIA_INDEX_PATH}`);
      } else {
        const hits = findMediaMatches(mediaIndex, terms).slice(0, 10);
        if (hits.length) {
          console.log('  [MEDIA] keyword hits:');
          for (const p of hits) console.log(`    - ${p}`);
        }
        const gs = galleryStudioHits.slice(0, 10);
        if (gs.length) {
          console.log('  [MEDIA+] Gallery/Studio hits:');
          for (const p of gs) console.log(`    - ${p}`);
        }
        if (!hits.length && !gs.length) {
          console.log('  [MEDIA] no hits');
        }
      }

      found++;
    }

    console.log(`\n[${new Date().toISOString()}] 完成 — FOUND ${found} 条 (inspected ${inspected})`);
    return { found, filtered: 0 };
  }

  if (RADAR_AI_SUMMARY_MODE) {
    const mediaIndex = loadMediaIndex();
    const galleryStudioHits = findGalleryStudioMedia(mediaIndex);
    for (const item of posts) {
      if (!passesRadarGates(item)) continue;
      const platform = detectPlatform(item.link);
      const directUrl = normalizeDirectUrl(item.link, platform);
      const { subtext, landmarks, draft } = await summarizeLatentIntentOpenAI(item);

      console.log(`\n[FOUND] ${directUrl}`);
      if (subtext) console.log(`  [SUBTEXT] ${subtext}`);
      if (draft) console.log(`  [DRAFT] ${draft}`);

      const lm = landmarks.length ? Array.from(new Set(landmarks.map(x => x.toLowerCase()))) : extractLandmarks(itemTextBlob(item));
      if (lm.length) {
        if (!mediaIndex?.landmarks) {
          console.log(`  [MEDIA] landmarks=${lm.join(', ')} (no index at ${MEDIA_INDEX_PATH})`);
        } else {
          const hits = lm.flatMap(k => mediaIndex.landmarks?.[k]?.slice(0, 3) ?? []);
          if (hits.length) {
            console.log(`  [MEDIA] hit for ${lm.join(', ')}:\n    - ${hits.join('\n    - ')}`);
          } else {
            console.log(`  [MEDIA] no hits for ${lm.join(', ')}`);
          }
        }
      }

      // High-value hint: if it's an artist/framing/concierge-style request, surface Gallery/Studio media right away
      const blob = itemTextBlob(item);
      const highValue =
        /artist|framing|frame|bespoke|concierge|courier|gift/i.test(blob) ||
        /画师|装裱|画框|定制|礼物|跑腿|管家/i.test(blob);
      if (highValue) {
        if (!mediaIndex) {
          console.log(`  [MEDIA+] Gallery/Studio: (no index at ${MEDIA_INDEX_PATH})`);
        } else if (galleryStudioHits.length) {
          console.log('  [MEDIA+] Gallery/Studio hits:');
          for (const p of galleryStudioHits.slice(0, 10)) console.log(`    - ${p}`);
        } else {
          console.log('  [MEDIA+] Gallery/Studio: no hits in index');
        }
      }
      found++;
    }
    console.log(`\n[${new Date().toISOString()}] 完成 — FOUND ${found} 条`);
    return { found, filtered: 0 };
  }

  if (RADAR_RAW_FOUND_MODE) {
    for (const item of posts) {
      // Only gate is required terms (NYC/Manhattan) + built-in recency already enforced at fetch time for Reddit
      if (!passesRadarGates(item)) continue;
      const directUrl = normalizeDirectUrl(item.link, detectPlatform(item.link));
      console.log(`[FOUND] ${directUrl}`);
      found++;
    }
    console.log(`[${new Date().toISOString()}] 完成 — FOUND ${found} 条`);
    return { found, filtered: 0 };
  }

  for (const item of posts) {
    if (!passesRadarGates(item)) { filtered++; if (RADAR_LOG_FILTERED_TITLES) filteredTitles.push(item.title); continue; }
    if (hasPovertySignal(item)) { filtered++; if (RADAR_LOG_FILTERED_TITLES) filteredTitles.push(item.title); continue; }

    const platform = detectPlatform(item.link);
    // For Reddit (high noise), require at least one signal keyword before paying for AI
    if (platform === 'reddit' && !hasSignalKeyword(item)) { filtered++; if (RADAR_LOG_FILTERED_TITLES) filteredTitles.push(item.title); continue; }
    if (platform === 'reddit' && !isRedditDirectPost(item.link)) { filtered++; if (RADAR_LOG_FILTERED_TITLES) filteredTitles.push(item.title); continue; }

    const s = await screenWithAI(anthropic, item);
    if (!s.valid || !s.is_recent) { filtered++; if (RADAR_LOG_FILTERED_TITLES) filteredTitles.push(item.title); continue; }
    if (s.confidence < 90) {
      console.log(`  ✗ ${s.confidence}% — ${item.title.slice(0, 50)}`);
      filtered++;
      if (RADAR_LOG_FILTERED_TITLES) filteredTitles.push(item.title);
      continue;
    }

    const autoReply = RADAR_STOP_SELLING ? '' : await generateAutoReply(s);
    const vipTag    = s.is_vip          ? '💎 ' : '';
    const crossTag  = s.is_cross_border ? '[跨国] ' : '';
    console.log(`  ✓ ${vipTag}${crossTag}[${s.confidence}%] ${s.summary}`);

    const directUrl     = normalizeDirectUrl(item.link, platform);
    const postContent   = item.fullContent ?? `${item.title}\n\n${item.snippet}`;
    const rawText       = [`标题: ${item.title}`, `摘要: ${item.snippet}`, `链接: ${directUrl}`].join('\n');
    const cleanedAuthor = item.knownAuthor ?? (s.author ? cleanAuthor(s.author) : null);
    const authorUrl     = cleanedAuthor ? buildDmUrl(platform, cleanedAuthor) : null;

    if (!RADAR_STOP_SELLING) {
      const added = await saveLead(rawText, directUrl, s, autoReply, platform, cleanedAuthor, authorUrl, postContent);
      if (added) {
        found++;
        notifyNewLead({
          summary: s.summary, summary_zh: s.summary_zh,
          confidence: s.confidence, tier: s.tier,
          author: cleanedAuthor, platform,
          source_url: directUrl, author_url: authorUrl,
        }).catch(() => {});
      }
    }
  }

  console.log(`[${new Date().toISOString()}] 完成 — 新增 ${found} 条，过滤 ${filtered} 条`);
  if (RADAR_LOG_FILTERED_TITLES && filteredTitles.length) {
    console.log(`\n--- 观察窗口：被过滤标题 ${filteredTitles.length} 条 ---`);
    for (const t of filteredTitles) console.log(`- ${t}`);
    console.log('--- end ---\n');
  }
  return { found, filtered };
}
