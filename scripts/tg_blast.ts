import { config } from 'dotenv';
config({ path: '.env.local' });

import { listLeads } from '../lib/db';

const TOKEN   = process.env.TELEGRAM_BOT_TOKEN!;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID!;

async function tg(text: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
  });
  const json = await res.json() as { ok: boolean; result?: { message_id: number } };
  if (json.ok) {
    console.log(`  ✅ Sent (message_id: ${json.result?.message_id})`);
  } else {
    console.error('  ❌ Failed:', JSON.stringify(json));
  }
}

async function main() {
  const leads = (await listLeads()).filter(lead => lead.source_url).slice(0, 10);

  console.log(`\nBlasting ${leads.length} leads to Telegram bot @NYC_Herbs_Hunter_Bot...\n`);

  // Header message
  await tg(
    `📡 <b>雷达战报 — ${leads.length} 条活跃线索</b>\n` +
    `🕐 ${new Date().toLocaleString('zh-CN', { timeZone: 'America/New_York' })} (NYC时间)`
  );

  for (const lead of leads) {
    const summary = lead.summary_zh || lead.summary || lead.raw_text.slice(0, 60);
    const lines = [
      `🚨 <b>[LEAD #${lead.id}]</b>`,
      ``,
      `📋 <b>需求：</b>${summary}`,
      `👤 <b>用户：</b>u/${lead.author ?? '未知'}`,
      `🎯 <b>意向度：</b>${lead.confidence}%`,
      `📱 <b>来源：</b>${lead.platform}`,
    ];
    if (lead.source_url)  lines.push(`🔗 <b>原帖：</b>${lead.source_url}`);
    if (lead.author_url)  lines.push(`💬 <b>私信：</b>${lead.author_url}`);

    const text = lines.join('\n');
    process.stdout.write(`Lead #${lead.id} u/${lead.author} → `);
    await tg(text);
    // Respect Telegram rate limit (30 msg/sec max)
    await new Promise(r => setTimeout(r, 400));
  }

  console.log(`\n✅ All ${leads.length} leads sent to Telegram.`);
}

main().catch(console.error);
