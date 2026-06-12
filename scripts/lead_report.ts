import { config } from 'dotenv';
import { listLeads, type Lead } from '../lib/db';

config({ path: '.env.local' });

function valueBand(lead: Lead) {
  if (lead.urgency === 'urgent' || lead.confidence >= 85) return '优先联系';
  if (lead.confidence >= 60) return '正常跟进';
  return '待审核';
}

function nextStep(lead: Lead) {
  if (lead.status === 'pending') return '联系客户，确认地点、时间、交付结果和风险边界。';
  if (lead.status === 'clarifying') return '整理可执行方案，协商价格并等待客户确认。';
  if (lead.status === 'ready_to_dispatch') return '按地点、距离、能力和时间匹配当地服务者。';
  return '按当前状态继续推进并记录每次沟通。';
}

async function main() {
  const leads = (await listLeads()).slice(0, 20);
  const now = new Date().toLocaleString('zh-CN', { hour12: false });

  console.log('全球本地事务 · 需求日报');
  console.log(`生成时间：${now}\n`);

  if (leads.length === 0) {
    console.log('当前没有需求。');
    return;
  }

  leads.forEach((lead, idx) => {
    console.log(`=== ${idx + 1}. ${valueBand(lead)} · ${lead.status} · ${lead.platform} ===`);
    console.log(`时间：${lead.created_at}`);
    console.log(`需求：${lead.summary_zh || lead.summary || lead.raw_text.slice(0, 180)}`);
    if (lead.location) console.log(`地点：${lead.location}`);
    if (lead.requester_contact) console.log(`联系：${lead.requester_contact}`);
    console.log(`下一步：${nextStep(lead)}\n`);
  });
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
