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
import { runScraper } from './services/scraper';

// 加载 .env.local
config({ path: '.env.local' });

console.log('📡 获客雷达定时任务已启动');
console.log('   计划：每小时整点运行一次（每次轮换 2 个关键词）');
console.log('   API：', process.env.LEADS_API_URL ?? 'http://localhost:3000/api/leads');

// 启动时立即跑一次
runScraper().catch(err => console.error('初次运行失败:', err));

// 每小时整点触发
cron.schedule('0 * * * *', () => {
  runScraper().catch(err => console.error('定时任务失败:', err));
});
