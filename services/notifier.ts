const TG_API = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}`;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';

function escapeHtml(value: string): string {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

const GIFTING_SIGNALS = [
  'gift', 'anniversary', 'birthday', 'surprise', 'same day delivery', 'luxury florist',
  '礼物', '周年', '惊喜', '生日', '当日配送',
];

const NYC_SERVICE_SIGNALS = [
  'nyc', 'new york', 'manhattan', 'real estate', 'condo', 'llc', 'company',
  'lawyer', 'accountant', 'bank', 'school', 'relocation', 'verification',
  '纽约', '曼哈顿', '房产', '置业', '公寓', '公司', '注册', '律师', '会计',
  '银行', '开户', '私校', '学校', '核实', '核验', '现场', '视频', '代表', '对接',
];

function isGifting(summary: string, summaryZh: string): boolean {
  const hay = `${summary} ${summaryZh}`.toLowerCase();
  return GIFTING_SIGNALS.some(kw => hay.includes(kw));
}

function isNycService(summary: string, summaryZh: string): boolean {
  const hay = `${summary} ${summaryZh}`.toLowerCase();
  return NYC_SERVICE_SIGNALS.some(kw => hay.includes(kw));
}

function buildSubject(summary: string, summaryZh: string): string {
  const hay = `${summary} ${summaryZh}`.toLowerCase();
  if (hay.includes('房') || hay.includes('real estate') || hay.includes('condo')) return '纽约房产/地址现场核验';
  if (hay.includes('llc') || hay.includes('公司') || hay.includes('注册')) return '纽约公司注册与本地对接';
  if (hay.includes('律师') || hay.includes('会计') || hay.includes('银行') || hay.includes('lawyer') || hay.includes('bank')) return '纽约律师会计银行对接';
  if (hay.includes('私校') || hay.includes('学校') || hay.includes('school')) return '纽约私校/家庭落地事务';
  if (hay.includes('核实') || hay.includes('核验') || hay.includes('现场') || hay.includes('verification')) return '纽约现场核验与视频确认';
  if (hay.includes('anniversary') || hay.includes('周年'))            return 'NYC Luxury Concierge — Anniversary Gift from Manhattan';
  if (hay.includes('birthday gift') || hay.includes('生日礼'))        return 'NYC Luxury Gift Delivery — Birthday Surprise from Manhattan';
  if (hay.includes('surprise') || hay.includes('惊喜'))               return 'NYC Same-Day Luxury Gift Service — Manhattan Boutiques';
  if (hay.includes('gift') || hay.includes('礼物'))                   return 'NYC Luxury Gift Concierge — Manhattan Boutiques';
  if (hay.includes('birkin') || hay.includes('hermès') || hay.includes('hermes') || hay.includes('kelly')) return 'NYC Luxury Concierge for your Hermès Search';
  if (hay.includes('chanel'))                                         return 'NYC Luxury Concierge for your Chanel Search';
  if (hay.includes('dior'))                                           return 'NYC Luxury Concierge for your Dior Search';
  if (hay.includes('goyard'))                                         return 'NYC Luxury Concierge for your Goyard Search';
  if (hay.includes('celine'))                                         return 'NYC Luxury Concierge for your Celine Search';
  if (hay.includes('chrome hearts'))                                  return 'NYC Luxury Concierge for your Chrome Hearts Search';
  if (hay.includes('van cleef') || hay.includes('arpels') || hay.includes('梵克雅宝')) return 'NYC Luxury Concierge for your Van Cleef & Arpels Search';
  if (hay.includes('cartier') || hay.includes('卡地亚'))              return 'NYC Luxury Concierge for your Cartier Search';
  if (hay.includes('tiffany') || hay.includes('蒂芙尼'))              return 'NYC Luxury Concierge for your Tiffany Search';
  if (hay.includes('harry winston'))                                  return 'NYC Luxury Concierge for your Harry Winston Search';
  if (hay.includes('graff'))                                          return 'NYC Luxury Concierge for your Graff Search';
  if (hay.includes('rolex'))                                          return 'NYC Luxury Concierge for your Rolex Search';
  if (hay.includes('patek') || hay.includes('philippe'))             return 'NYC Luxury Concierge for your Patek Philippe Search';
  if (hay.includes('lululemon'))                                      return 'NYC Luxury Concierge for your Lululemon Search';
  if (hay.includes('louis vuitton') || hay.includes(' lv ') || hay.includes('pochette')) return 'NYC Luxury Concierge for your Louis Vuitton Search';
  if (hay.includes('moncler'))                                        return 'NYC Luxury Concierge for your Moncler Search';
  if (hay.includes('ysl') || hay.includes('saint laurent'))          return 'NYC Luxury Concierge for your Saint Laurent Search';
  if (hay.includes('mulberry'))                                       return 'NYC Luxury Concierge for your Mulberry Search';
  return 'NYC Luxury Concierge — Fifth Avenue Personal Shopping';
}

export interface NotifyPayload {
  summary: string;
  summary_zh: string;
  confidence: number;
  tier: string;
  author: string | null;
  platform: string;
  source_url: string | null;
  author_url: string | null;
}

async function send(text: string): Promise<void> {
  if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID) return;
  await fetch(`${TG_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: CHAT_ID, text, parse_mode: 'HTML' }),
  });
}

export async function notifyNewLead(p: NotifyPayload): Promise<void> {
  const isVip = p.tier === 'vip';
  const gifting = isGifting(p.summary, p.summary_zh);
  const nycService = isNycService(p.summary, p.summary_zh);

  if (!isVip && !gifting && !nycService) return;

  const tag    = isVip && nycService ? '💎 纽约高价值事务'
               : isVip && gifting    ? '💎🎁 VIP礼品大单'
               : isVip               ? '💎 VIP'
               : nycService          ? '📍 纽约事务'
               :                       '🎁 礼品代办';

  const subject = buildSubject(p.summary, p.summary_zh);

  const lines: string[] = [
    `🚨 <b>[NEW LEAD] ${tag}</b>`,
    ``,
    `📋 <b>需求：</b>${escapeHtml(p.summary_zh || p.summary)}`,
    `🎯 <b>意向度：</b>${p.confidence}%`,
    `📱 <b>来源：</b>${escapeHtml(p.platform)}${p.author ? ` · @${escapeHtml(p.author)}` : ''}`,
    `📧 <b>建议主题：</b><code>${escapeHtml(subject)}</code>`,
  ];

  if (p.source_url)  lines.push(`🔗 <b>原帖：</b>${escapeHtml(p.source_url)}`);
  if (p.author_url)  lines.push(`💬 <b>立即私信：</b>${escapeHtml(p.author_url)}`);

  await send(lines.join('\n'));
}

export async function notifySystemOnline(): Promise<void> {
  await send(
    `✅ <b>获客雷达 已上线</b>\n\n` +
    `🕐 ${new Date().toLocaleString('zh-CN', { timeZone: 'America/New_York' })} (NYC时间)\n` +
    `📡 监控中：纽约事务 · 实地核验 · 公司注册 · 房产对接 · 私校申请 · 礼品/奢侈品代办\n` +
    `⚡ 仅推送高价值线索`
  );
}

export async function notifyFormLead(p: {
  name: string;
  contact: string;
  need: string;
  score: number;
  tier: string;
  persisted: boolean;
}): Promise<void> {
  const lines = [
    `🚨 <b>[官网表单] 新客户提交</b>`,
    ``,
    `👤 <b>称呼：</b>${escapeHtml(p.name || '未填')}`,
    `💬 <b>联系方式：</b><code>${escapeHtml(p.contact || '未填')}</code>`,
    `🎯 <b>系统评分：</b>${p.score}% · ${p.tier === 'vip' ? '高价值' : '普通预判'}`,
    `💾 <b>数据库：</b>${p.persisted ? '已保存' : '未保存，但通知已发送'}`,
    ``,
    `📋 <b>需求：</b>`,
    escapeHtml(p.need.slice(0, 900)),
    ``,
    `下一步：尽快联系客户，确认地点、时间、交付结果与风险边界；确认可承接后再协商价格并安排执行。`,
  ];

  await send(lines.join('\n'));
}

export async function notifyCommunitySubmission(p: {
  kind: '物品发布' | '领取申请' | '服务需求' | '内容举报';
  contact: string;
  summary: string;
  recordId: number;
}): Promise<void> {
  await send([
    `<b>[HerbWorld Manhattan] ${escapeHtml(p.kind)}</b>`,
    ``,
    `<b>记录编号：</b>${p.recordId}`,
    `<b>联系方式：</b><code>${escapeHtml(p.contact)}</code>`,
    `<b>内容：</b>${escapeHtml(p.summary.slice(0, 900))}`,
    ``,
    `请进入运营台审核和跟进：https://herbworld.app/operations`,
  ].join('\n'));
}
