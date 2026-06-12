import { config } from 'dotenv';
config({ path: '.env.local' });

import { findLeadBySourceUrl, insertLead } from '../lib/db';

const UA = 'HerbWorldBot/3.0 (nyc-luxury-radar; personal use)';

interface RedditPost {
  author: string;
  subreddit: string;
  title: string;
  selftext: string;
  permalink: string;
  created_utc: number;
  removed_by_category?: string | null;
  is_self: boolean;
}

// Fetch /new from a specific subreddit — guaranteed on-topic
async function fetchSubNew(sub: string, limit = 25): Promise<RedditPost[]> {
  const r = await fetch(`https://www.reddit.com/r/${sub}/new.json?limit=${limit}`, {
    headers: { 'User-Agent': UA },
  });
  if (!r.ok) { console.log(`  r/${sub} HTTP ${r.status}`); return []; }
  const d = await r.json() as { data: { children: { data: RedditPost }[] } };
  return d.data.children
    .map(c => c.data)
    .filter(p => p.author !== '[deleted]' && p.author !== 'AutoModerator' && !p.removed_by_category);
}

// Prefer posts with actual body text — they contain real buyer intent
function score(p: RedditPost): number {
  let s = 0;
  const t = (p.title + ' ' + p.selftext).toLowerCase();
  if (p.is_self && p.selftext.length > 50) s += 30;   // text post with real content
  if (t.includes('buy') || t.includes('purchase') || t.includes('get')) s += 20;
  if (t.includes('help') || t.includes('advice') || t.includes('recommend')) s += 15;
  if (t.includes('nyc') || t.includes('new york') || t.includes('manhattan')) s += 25;
  if (t.includes('boutique') || t.includes('store') || t.includes('shop')) s += 10;
  if (t.includes('looking for') || t.includes('where') || t.includes('anyone know')) s += 15;
  return s;
}

function chineseSummary(p: RedditPost): string {
  const t = (p.title + ' ' + p.selftext).toLowerCase();
  const sub = p.subreddit.toLowerCase();
  if (sub.includes('hermes') || sub.includes('birkin') || t.includes('birkin') || t.includes('kelly')) return '需求：爱马仕Birkin/Kelly 购买咨询（纽约）';
  if (sub.includes('rolex') || t.includes('rolex'))   return '需求：劳力士手表 购买咨询（纽约）';
  if (sub.includes('chanel') || t.includes('chanel')) return '需求：香奈儿 购买咨询（纽约）';
  if (sub.includes('louisvuitton') || t.includes('louis vuitton') || t.includes(' lv ')) return '需求：Louis Vuitton 购买咨询（纽约）';
  if (sub.includes('watches') || sub.includes('watch')) return '需求：高端腕表 购买/配置咨询（纽约）';
  if (t.includes('shopper') || t.includes('shopping service')) return '需求：寻找纽约奢侈品私人买手';
  if (t.includes('handbag') || t.includes('bag') || t.includes('purse')) return '需求：高端包袋 购买咨询（纽约）';
  return `需求：${p.title.slice(0, 60)}`;
}

async function main() {
  // Pull from luxury-specific subreddits — every post here is on-topic
  const subs = ['HermesBirkins', 'chanel', 'Louisvuitton', 'rolex', 'Watches', 'handbags', 'luxuryfinds'];
  const seen = new Set<string>();
  const allPosts: RedditPost[] = [];

  for (const sub of subs) {
    const posts = await fetchSubNew(sub, 25);
    console.log(`r/${sub}: ${posts.length} posts`);
    for (const p of posts) {
      if (!seen.has(p.permalink)) { seen.add(p.permalink); allPosts.push(p); }
    }
  }

  // Sort by buyer-signal score, take top candidates
  const ranked = allPosts
    .map(p => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s)
    .filter(x => x.s > 0)
    .map(x => x.p);

  console.log(`\n${allPosts.length} posts total, ${ranked.length} with buyer signals. Saving top 5...\n`);

  let saved = 0;

  for (const p of ranked) {
    if (saved >= 5) break;
    const sourceUrl = `https://www.reddit.com${p.permalink}`;
    const existing = await findLeadBySourceUrl(sourceUrl);
    if (existing) continue;

    const body      = (p.selftext || '').trim();
    const snippet   = body ? body.slice(0, 300) : p.title;
    const authorUrl = `https://www.reddit.com/message/compose/?to=${encodeURIComponent(p.author)}`;
    const rawText   = `Title: ${p.title}\nAuthor: u/${p.author}\nr/${p.subreddit}\n\n${snippet}`;
    const summaryZh = chineseSummary(p);

    await insertLead({
      raw_text: rawText,
      summary: p.title,
      summary_zh: summaryZh,
      task: 'NYC luxury purchase',
      location: 'New York',
      source_url: sourceUrl,
      tier: 'normal',
      author: p.author,
      platform: 'reddit',
      author_url: authorUrl,
      post_content: `${p.title}\n\n${snippet}`,
      confidence: 82,
    });

    console.log(`✅ SAVED: u/${p.author} in r/${p.subreddit}`);
    console.log(`   Title:  ${p.title.slice(0, 70)}`);
    console.log(`   Source: ${sourceUrl}`);
    console.log(`   DM:     ${authorUrl}`);
    console.log();
    saved++;
  }

  console.log(`\n✅ Done — ${saved} real leads saved. Refresh localhost:3000/leads`);
}

main().catch(console.error);
