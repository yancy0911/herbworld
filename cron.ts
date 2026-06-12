/**
 * 获客雷达定时任务
 * 运行方式：npx tsx cron.ts
 *
 * 需在 .env.local 中配置：
 *   GOOGLE_CUSTOM_SEARCH_KEY=...
 *   GOOGLE_CSE_ID=...
 */

import { config } from 'dotenv';
import cron from 'node-cron';

async function main() {
  // 加载 .env.local
  config({ path: '.env.local' });

  // ── Radar policy (must be set BEFORE importing ./services/scraper) ───────────
  // Strict recency: only posts newer than this window (ms since epoch cutoff = Date.now() - window)
  process.env.RADAR_MAX_AGE_MS = String(24 * 60 * 60 * 1000);
  // Write qualified leads into leads.db and generate reply drafts.
  process.env.RADAR_STOP_SELLING = '0';

  // Keyword radar (ANY match) — broaden to get candidates, then let LLM classify intent/value
  process.env.RADAR_REQUIRED_TERMS =
    'nyc,manhattan,new york,纽约,曼哈顿,买房,置业,公寓,公司注册,llc,律师,会计,银行开户,私校,school admission,private school,relocation,concierge,代办,本地对接';
  process.env.RADAR_REQUIRED_MODE = 'any';
  // Clear all excludes
  process.env.RADAR_NEGATIVE_TERMS = '';
  // Use the main screening pipeline so qualified leads are saved.
  process.env.RADAR_LLM_CLASSIFY_MODE = '0';
  process.env.RADAR_LLM_CLASSIFY_MAX = '30';
  process.env.RADAR_AI_SUMMARY_MODE = '0';
  // Skip sources that cannot prove recency to the same standard as Reddit timestamps
  process.env.RADAR_STRICT_RECENCY = '1';
  // Disable filtered-titles dump
  process.env.RADAR_LOG_FILTERED_TITLES = '0';

  const { runScraper } = await import('./services/scraper');

  console.log('📡 获客雷达定时任务已启动');
  console.log('   策略：仅过去 24 小时 + 纽约高价值事务关键词 + AI 筛选入库 + 回复草稿');
  console.log('   计划：每小时整点运行一次');
  console.log('   API：', process.env.LEADS_API_URL ?? 'http://localhost:3000/api/leads');

  // 启动时立即跑一次
  runScraper().catch(err => console.error('初次运行失败:', err));

  // 每小时整点触发
  cron.schedule('0 * * * *', () => {
    runScraper().catch(err => console.error('定时任务失败:', err));
  });
}

main().catch(err => {
  console.error('雷达进程启动失败:', err);
  process.exit(1);
});
