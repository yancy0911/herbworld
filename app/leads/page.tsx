'use client';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Lead {
  id: number;
  raw_text: string;
  summary: string | null;
  summary_zh: string | null;
  task: string | null;
  location: string | null;
  budget: string | null;
  is_cross_border: number;
  tier: string;
  auto_reply: string | null;
  author: string | null;
  platform: string;
  author_url: string | null;
  post_content: string | null;
  confidence: number;
  requester_contact: string | null;
  privacy_level: string;
  urgency: string;
  assigned_operator: string | null;
  last_contacted_at: string | null;
  status: string;
  source_url: string | null;
  created_at: string;
}

interface QuickResult {
  lead: Lead;
  extracted: {
    summary: string;
    task: string | null;
    location: string | null;
    budget: string | null;
    is_urgent: boolean;
    tier: string;
    is_cross_border: boolean;
  };
  reply: string;
}

type SubmitPhase = 'idle' | 'extracting' | 'replying' | 'done';
type PlatformInfo = { label: string; badgeClass: string; instruction: string };

// ── Constants ─────────────────────────────────────────────────────────────────

const PLATFORM_CONFIG: { [k: string]: PlatformInfo } = {
  reddit:         { label: 'Reddit',      badgeClass: 'text-orange-300 bg-orange-500/10 border-orange-500/30', instruction: '通过Reddit私信回复' },
  '1point3acres': { label: '一亩三分地',   badgeClass: 'text-green-300 bg-green-500/10 border-green-500/30',  instruction: '在一亩三分地站内信回复' },
  xiaohongshu:    { label: '小红书',       badgeClass: 'text-rose-300 bg-rose-500/10 border-rose-500/30',     instruction: '在小红书私信回复' },
  weibo:          { label: '微博',         badgeClass: 'text-red-300 bg-red-500/10 border-red-500/30',        instruction: '在微博私信回复' },
  zhihu:          { label: '知乎',         badgeClass: 'text-blue-300 bg-blue-500/10 border-blue-500/30',     instruction: '在知乎私信回复' },
  twitter:        { label: 'Twitter/X',   badgeClass: 'text-sky-300 bg-sky-500/10 border-sky-500/30',        instruction: '通过Twitter私信回复' },
};

const STATUS_LABEL: Record<string, string> = {
  pending: '新需求',
  reviewing: '待平台联系',
  clarifying: '需求确认中',
  awaiting_customer: '等待客户确认',
  ready_to_dispatch: '待挂单',
  matching: '匹配服务者中',
  assigned: '已安排服务者',
  executing: '执行中',
  waiting_third_party: '等待第三方',
  completed: '已完成',
  not_converted: '未成交',
  cancelled: '已取消',
  long_term_followup: '长期跟进',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  reviewing: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  clarifying: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  awaiting_customer: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  ready_to_dispatch: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  matching: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
  assigned: 'bg-teal-500/20 text-teal-300 border-teal-500/30',
  executing: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  waiting_third_party: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  completed: 'bg-green-500/20 text-green-300 border-green-500/30',
  not_converted: 'bg-zinc-500/20 text-zinc-300 border-zinc-500/30',
  cancelled: 'bg-red-500/20 text-red-300 border-red-500/30',
  long_term_followup: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
};
const STATUS_FLOW: Record<string, { next: string; label: string; cls: string }[]> = {
  pending: [{ next: 'reviewing', label: '开始联系', cls: 'bg-blue-600 hover:bg-blue-500' }],
  reviewing: [{ next: 'clarifying', label: '确认需求', cls: 'bg-sky-600 hover:bg-sky-500' }],
  clarifying: [{ next: 'awaiting_customer', label: '等待客户确认', cls: 'bg-purple-600 hover:bg-purple-500' }],
  awaiting_customer: [{ next: 'ready_to_dispatch', label: '确认并待挂单', cls: 'bg-indigo-600 hover:bg-indigo-500' }],
  ready_to_dispatch: [{ next: 'matching', label: '开始匹配', cls: 'bg-cyan-600 hover:bg-cyan-500' }],
  matching: [{ next: 'assigned', label: '已安排人员', cls: 'bg-teal-600 hover:bg-teal-500' }],
  assigned: [{ next: 'executing', label: '开始执行', cls: 'bg-orange-600 hover:bg-orange-500' }],
  executing: [{ next: 'completed', label: '标记完成', cls: 'bg-green-600 hover:bg-green-500' }],
  waiting_third_party: [{ next: 'executing', label: '继续执行', cls: 'bg-orange-600 hover:bg-orange-500' }],
  completed: [{ next: 'long_term_followup', label: '进入长期跟进', cls: 'bg-amber-700 hover:bg-amber-600' }],
  not_converted: [{ next: 'long_term_followup', label: '长期跟进', cls: 'bg-amber-700 hover:bg-amber-600' }],
  cancelled: [{ next: 'pending', label: '重新开启', cls: 'bg-gray-700 hover:bg-gray-600' }],
  long_term_followup: [{ next: 'pending', label: '重新激活', cls: 'bg-blue-700 hover:bg-blue-600' }],
};
const RISK_KEYWORDS = [
  '签证造假', '假证', '假文件', '伪造', '偷渡', '走私', '洗钱', '非法打工',
  '假学历', '骗保', '违法代签', '冒用身份', '跟踪', '骚扰', '偷拍', '窃听',
  '毒品', '枪支', '危险品', '赌博', '色情', '逃税', '规避海关',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasRisk(text: string): boolean {
  return RISK_KEYWORDS.some(kw => text.includes(kw));
}

function timeAgo(isoStr: string): string {
  const d = new Date(isoStr.includes('T') ? isoStr : isoStr.replace(' ', 'T') + 'Z');
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// Hardcoded keyword → Chinese summary mapping; falls back to DB summary_zh or summary
function getChineseSummary(lead: Lead): string {
  if (lead.summary_zh) return lead.summary_zh;
  const hay = `${lead.summary ?? ''} ${lead.task ?? ''} ${lead.post_content ?? ''}`.toLowerCase();
  if (hay.includes('moncler'))                              return '🔥 需求：Moncler正品（担心假货）';
  if (hay.includes('ysl') || hay.includes('saint laurent')) return '⚖️ 需求：YSL vs LV 选包纠结';
  if (hay.includes('mulberry'))                             return '👜 需求：Mulberry正品包包';
  if (hay.includes('birkin') || hay.includes('hermès') || hay.includes('hermes')) return '💎 需求：爱马仕铂金包代购';
  if (hay.includes('chanel'))                               return '🖤 需求：香奈儿正品代购';
  if (hay.includes('dior'))                                 return '👗 需求：Dior正品代购';
  if (hay.includes('goyard'))                               return '🎯 需求：Goyard正品代购';
  if (hay.includes('celine'))                               return '👜 需求：Celine正品代购';
  if (hay.includes('rolex'))                                return '⌚ 需求：劳力士手表代购';
  if (hay.includes('chrome hearts'))                        return '🖤 需求：Chrome Hearts正品代购';
  if (hay.includes('van cleef') || hay.includes('arpels') || hay.includes('梵克雅宝')) return '💎 需求：梵克雅宝珠宝代购';
  if (hay.includes('cartier') || hay.includes('卡地亚'))   return '💍 需求：卡地亚珠宝代购';
  if (hay.includes('tiffany') || hay.includes('蒂芙尼'))   return '💍 需求：Tiffany珠宝代购/礼品';
  if (hay.includes('harry winston'))                        return '👑 需求：Harry Winston顶级珠宝';
  if (hay.includes('graff'))                                return '💎 需求：Graff珠宝代购';
  if (hay.includes('lululemon'))                            return '🏃 需求：Lululemon限量代购';
  if (hay.includes('louis vuitton') || hay.includes('pochette') || / lv /.test(hay)) return '🛍️ 需求：LV包包选购';
  if (hay.includes('anniversary') || hay.includes('周年'))  return '🎁 需求：周年纪念奢侈品礼物（纽约）';
  if (hay.includes('birthday gift') || hay.includes('生日礼')) return '🎂 需求：生日奢侈品礼物代购';
  if (hay.includes('surprise') || hay.includes('惊喜'))    return '🎀 需求：纽约惊喜礼品代采+配送';
  if (hay.includes('same day') || hay.includes('today'))   return '⚡ 需求：当日奢侈品礼品采购配送';
  if (hay.includes('luxury florist'))                       return '🌹 需求：纽约高端花礼+礼品搭配';
  if (hay.includes('hard to find') || hay.includes('exclusive boutique')) return '🔑 需求：稀缺款/独家渠道采购';
  if (hay.includes('personal shopper') || hay.includes('代购') || hay.includes('买手')) return '🛒 需求：寻找纽约代购/私人买手';
  if (hay.includes('authentic') || hay.includes('legit'))  return '🔍 需求：正品鉴定/购买帮助';
  return lead.summary ?? lead.task ?? lead.raw_text.slice(0, 80);
}

function generateSubject(lead: Lead): string {
  const hay = `${lead.summary ?? ''} ${lead.task ?? ''} ${lead.post_content ?? ''} ${lead.summary_zh ?? ''}`.toLowerCase();
  if (hay.includes('anniversary') || hay.includes('周年'))            return 'NYC Luxury Concierge — Anniversary Gift from Manhattan';
  if (hay.includes('birthday gift') || hay.includes('生日礼'))        return 'NYC Luxury Gift Delivery — Birthday Surprise from Manhattan';
  if (hay.includes('surprise') || hay.includes('惊喜'))               return 'NYC Same-Day Luxury Gift Service — Manhattan Boutiques';
  if (hay.includes('same day') || hay.includes('today'))              return 'Same-Day NYC Luxury Gift Sourcing & Delivery';
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
  if (hay.includes('louis vuitton') || / lv /.test(hay) || hay.includes('pochette')) return 'NYC Luxury Concierge for your Louis Vuitton Search';
  if (hay.includes('moncler'))                                        return 'NYC Luxury Concierge for your Moncler Search';
  if (hay.includes('ysl') || hay.includes('saint laurent'))          return 'NYC Luxury Concierge for your Saint Laurent Search';
  if (hay.includes('mulberry'))                                       return 'NYC Luxury Concierge for your Mulberry Search';
  return 'NYC Luxury Concierge — Fifth Avenue Personal Shopping';
}

function isGiftingLead(lead: Lead): boolean {
  const hay = `${lead.summary ?? ''} ${lead.task ?? ''} ${lead.post_content ?? ''} ${lead.summary_zh ?? ''}`.toLowerCase();
  return ['gift', 'anniversary', 'birthday', 'surprise', 'same day delivery', 'luxury florist',
          '礼物', '周年', '惊喜', '生日', '当日配送'].some(kw => hay.includes(kw));
}

function generateGiftingPitch(lead: Lead): string {
  const topic = getChineseSummary(lead);
  return [
    `Hi! I may be able to coordinate this in New York after reviewing the details.`,
    ``,
    `I'm based in Manhattan and coordinate gifting requests including boutique selection, purchase, wrapping, and delivery, subject to availability, store rules, delivery area, and an agreed service plan.`,
    ``,
    `• Boutique sourcing: Tiffany, Cartier, Van Cleef, Harry Winston, Hermès, Chanel & more`,
    `• Luxury gift wrapping with boutique packaging`,
    `• Personal hand-delivery in Manhattan / NYC`,
    `• Same-day service may be available after confirmation`,
    `• Photos or video where permitted and agreed`,
    ``,
    `WeChat: Charming-Furry`,
    ``,
    `———`,
    ``,
    `您好！关于"${topic}"，确认具体要求后，我可以评估是否适合在纽约协调办理。`,
    ``,
    `我常驻曼哈顿，可协调精品店选购、礼品包装和纽约当地配送。具体商品、库存、送达时间和记录方式需要提前确认。`,
    ``,
    `• 当日采购或配送需根据库存、距离和时间确认`,
    `• 精品店原装礼品盒包装`,
    `• 在允许并约定的情况下提供照片、视频或签收记录`,
    ``,
    `微信：Charming-Furry`,
  ].join('\n');
}

function generatePitch(lead: Lead): string {
  if (isGiftingLead(lead)) return generateGiftingPitch(lead);
  const topic = getChineseSummary(lead);
  return [
    `Hi! I saw your post and may be able to coordinate this after reviewing the details.`,
    `I'm based in Manhattan and coordinate local sourcing requests. Product availability, authenticity checks, documentation, shipping, insurance, timing, and fees must be confirmed for each request before proceeding.`,
    `WeChat: Charming-Furry`,
    '',
    `———`,
    '',
    `您好！看到您关于"${topic}"的帖子，我常驻纽约，可以先了解详情并评估是否适合协调办理。`,
    `商品库存、购买凭证、真伪核验方式、运输保险、费用和时间都需要逐单确认，确认后再执行。`,
    `关注公众号【纽约私人助理】查看真实案例。微信：Charming-Furry`,
  ].join('\n');
}

function generateShoppingModePitch(lead: Lead): string {
  const topic = getChineseSummary(lead);
  return [
    `Hi! I am your personal concierge in New York City.`,
    ``,
    `I coordinate remote shopping requests at New York boutiques, subject to store rules, availability, permission to video, an agreed purchase limit, and confirmed shipping arrangements.`,
    ``,
    `• Private 1-on-1 video session — your personal boutique tour`,
    `• Availability checked with the relevant store`,
    `• Full purchase documentation & official receipt`,
    `• Shipping and insurance options confirmed before purchase`,
    `• Scope, costs, and service fees confirmed before execution`,
    ``,
    `WeChat: Charming-Furry`,
    ``,
    `———`,
    ``,
    `您好！我是您在纽约的「眼睛和双手」。`,
    ``,
    `我可以评估纽约精品店远程采购需求。门店是否允许视频、商品是否有货、购买凭证、真伪核验方式、运输保险、费用和时间都需要逐单确认。`,
    ``,
    `• 1对1私人视频陪逛，专属管家体验`,
    `• 向相关门店确认实际库存和购买规则`,
    `• 完整购买凭证及正品发票`,
    `• 购买前确认物流和保险安排`,
    `• 执行前书面确认商品成本、服务费和其他费用`,
    ``,
    `您关于"${topic}"的需求，可以先发具体要求供我审核。`,
    `微信：Charming-Furry`,
  ].join('\n');
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [leads, setLeads]               = useState<Lead[]>([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(true);
  const [submitPhase, setSubmitPhase]   = useState<SubmitPhase>('idle');
  const [quickResult, setQuickResult]   = useState<QuickResult | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<Record<number, boolean>>({});
  const [generatingReply, setGeneratingReply] = useState<Record<number, boolean>>({});
  const [replies, setReplies]           = useState<Record<number, string>>({});
  const [copied, setCopied]             = useState(false);
  const [copiedPitch, setCopiedPitch]     = useState<Record<number, boolean>>({});
  const [copiedSubject, setCopiedSubject] = useState<Record<number, boolean>>({});
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [showHistory, setShowHistory]   = useState(false);
  const [shoppingMode, setShoppingMode] = useState(false);
  const lastCheckRef = useRef<string>(new Date().toISOString());

  const fetchLeads = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json() as { leads: Lead[] };
      setLeads(data.leads);
      setLastUpdated(new Date());
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // Notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Incremental polling every 60 s
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await fetch(`/api/leads?since=${encodeURIComponent(lastCheckRef.current)}`);
        const data = await res.json() as { leads: Lead[] };
        lastCheckRef.current = new Date().toISOString();
        if (data.leads.length > 0) {
          setLeads(prev => {
            const ids = new Set(prev.map(l => l.id));
            return [...data.leads.filter(l => !ids.has(l.id)), ...prev];
          });
          setLastUpdated(new Date());
          if ('Notification' in window && Notification.permission === 'granted') {
            const vip = data.leads.filter(l => l.tier === 'vip');
            new Notification('HerbWorld Radar', {
              body: vip.length > 0
                ? `💎 ${vip.length} VIP lead! ${vip[0].summary ?? ''}`
                : `📡 ${data.leads.length} new lead${data.leads.length > 1 ? 's' : ''}`,
              icon: '/favicon.ico',
            });
          }
        }
      } catch { /* silent */ }
    };
    const id = setInterval(poll, 60_000);
    return () => clearInterval(id);
  }, []);

  // Refresh when tab regains focus
  useEffect(() => {
    const onFocus = () => fetchLeads(true);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [fetchLeads]);

  useEffect(() => {
    const id = window.setTimeout(() => void fetchLeads(), 0);
    return () => window.clearTimeout(id);
  }, [fetchLeads]);

  const copyPitch = (lead: Lead) => {
    const text = shoppingMode ? generateShoppingModePitch(lead) : generatePitch(lead);
    navigator.clipboard.writeText(text);
    setCopiedPitch(prev => ({ ...prev, [lead.id]: true }));
    setTimeout(() => setCopiedPitch(prev => ({ ...prev, [lead.id]: false })), 2500);
  };

  const copySubject = (lead: Lead) => {
    navigator.clipboard.writeText(generateSubject(lead));
    setCopiedSubject(prev => ({ ...prev, [lead.id]: true }));
    setTimeout(() => setCopiedSubject(prev => ({ ...prev, [lead.id]: false })), 2500);
  };

  const submit = async () => {
    if (!input.trim()) return;
    setQuickResult(null);
    setCopied(false);
    setSubmitPhase('extracting');
    try {
      setSubmitPhase('replying');
      const res = await fetch('/api/leads/quick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json() as QuickResult;
      setQuickResult(data);
      setInput('');
      setSubmitPhase('done');
      await fetchLeads(true);
    } catch {
      setSubmitPhase('idle');
    }
  };

  const copyReply = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const updateStatus = async (id: number, status: string) => {
    setUpdatingStatus(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/leads/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await res.json() as { lead: Lead };
      setLeads(prev => prev.map(l => l.id === id ? data.lead : l));
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [id]: false }));
    }
  };

  const generateReply = async (id: number) => {
    setGeneratingReply(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`/api/leads/${id}/reply`, { method: 'POST' });
      const data = await res.json() as { reply: string };
      setReplies(prev => ({ ...prev, [id]: data.reply }));
    } finally {
      setGeneratingReply(prev => ({ ...prev, [id]: false }));
    }
  };

  // Radar: newest 10 leads
  const radarLeads = [...leads]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 10);

  const pending  = leads.filter(l => l.status === 'pending').length;
  const vipCount = leads.filter(l => l.tier === 'vip').length;
  const sortedLeads = [...leads].sort((a, b) => {
    if (a.tier === 'vip' && b.tier !== 'vip') return -1;
    if (a.tier !== 'vip' && b.tier === 'vip') return 1;
    return 0;
  });

  return (
    <main className="min-h-screen bg-gray-950 text-white p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* ── Page header ── */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold tracking-tight">美国需求调度中心</h1>
          {vipCount > 0 && (
            <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-black text-xs font-black px-3 py-1 rounded-full">
              💎 {vipCount} 位VIP客户
            </span>
          )}
          {pending > 0 && (
            <span className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 text-xs font-bold px-3 py-1 rounded-full">
              {pending} 条待处理
            </span>
          )}
        </div>

        {/* ══════════════════════════════════════════
            SECTION 1 — LIVE HUNTING RADAR
        ══════════════════════════════════════════ */}
        <div className="mb-8">
          {/* Section header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-black tracking-wide flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                🔴 实时狩猎雷达
              </h2>
              <span className="text-xs text-gray-600">
                {lastUpdated
                  ? `更新于 ${timeAgo(lastUpdated.toISOString())}`
                  : '加载中...'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShoppingMode(m => !m)}
                className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all border ${
                  shoppingMode
                    ? 'bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/30'
                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200 hover:border-gray-600'
                }`}
              >
                📹 {shoppingMode ? '远程实时采购 ON' : '远程实时采购'}
              </button>
              <button
                onClick={() => fetchLeads()}
                disabled={loading}
                className="text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                ↻ 刷新
              </button>
            </div>
          </div>

          {/* Radar table */}
          {loading && radarLeads.length === 0 ? (
            <div className="text-gray-600 text-sm text-center py-16 border border-dashed border-gray-800 rounded-2xl animate-pulse">
              扫描中…
            </div>
          ) : radarLeads.length === 0 ? (
            <div className="text-gray-600 text-sm text-center py-16 border border-dashed border-gray-800 rounded-2xl">
              暂无线索 — 在下方粘贴内容，或等待雷达自动扫描（每5分钟一次）
            </div>
          ) : (
            <div className="space-y-2">
              {radarLeads.map(lead => {
                const pc        = PLATFORM_CONFIG[lead.platform] as PlatformInfo | undefined;
                const dmUrl     = lead.author_url ?? null;
                const postUrl   = lead.source_url ?? null;
                const isVip     = lead.tier === 'vip';
                const pitched   = copiedPitch[lead.id] ?? false;

                return (
                  <div
                    key={lead.id}
                    className={`flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border transition-colors ${
                      isVip
                        ? 'bg-yellow-950/20 border-yellow-500/40'
                        : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                    }`}
                  >
                    {/* Left: meta */}
                    <div className="w-full sm:w-36 shrink-0 flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${
                        pc?.badgeClass ?? 'text-gray-400 bg-gray-700/30 border-gray-600/30'
                      }`}>
                        {pc?.label ?? '手动'}
                      </span>
                      {lead.author && (
                        <span className="text-xs text-gray-300 font-medium truncate max-w-[120px]">
                          @{lead.author}
                        </span>
                      )}
                      <span className="text-xs text-gray-600">{timeAgo(lead.created_at)}</span>
                      {lead.confidence > 0 && (
                        <span className={`text-xs font-bold ${lead.confidence >= 95 ? 'text-green-400' : 'text-yellow-400'}`}>
                          🎯 意向{lead.confidence}%
                        </span>
                      )}
                    </div>

                    {/* Middle: content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        {isVip && <span className="text-xs font-black text-yellow-300">💎 VIP大单</span>}
                        {lead.is_cross_border === 1 && (
                          <span className="text-xs font-semibold text-amber-300">🌏 跨国需求</span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white leading-snug line-clamp-2">
                        {getChineseSummary(lead)}
                      </p>
                      {lead.post_content && (
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed line-clamp-2">
                          {lead.post_content.slice(0, 160)}
                        </p>
                      )}
                      {pc && (
                        <p className="text-xs text-yellow-400 mt-1 font-semibold">👉 {pc.instruction}</p>
                      )}
                    </div>

                    {/* Right: ACTION BUTTONS */}
                    <div className="flex sm:flex-col gap-2 shrink-0 w-full sm:w-auto">

                      {/* ⓪ Subject line — copy before DM */}
                      <div className="flex gap-1 w-full">
                        <span className="flex-1 text-xs text-gray-400 bg-gray-800/80 border border-gray-700 rounded-lg px-2.5 py-2 truncate leading-tight">
                          {generateSubject(lead)}
                        </span>
                        <button
                          onClick={() => copySubject(lead)}
                          title="Copy Subject"
                          className={`shrink-0 text-xs px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${
                            copiedSubject[lead.id]
                              ? 'bg-green-600 text-white'
                              : 'bg-gray-700 hover:bg-gray-600 text-gray-200 border border-gray-600'
                          }`}
                        >
                          {copiedSubject[lead.id] ? '✅' : '📧 Copy Subject'}
                        </button>
                      </div>

                      {/* ① Direct Message (DM) — always primary when author known */}
                      {dmUrl ? (
                        <button
                          onClick={() => window.open(dmUrl, '_blank', 'noopener,noreferrer')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-black text-sm rounded-xl transition-all shadow-lg shadow-blue-600/40 whitespace-nowrap cursor-pointer"
                        >
                          💬 Direct Message (DM)
                        </button>
                      ) : (
                        <span className="flex-1 sm:flex-none flex items-center justify-center px-6 py-3.5 bg-gray-800 text-gray-600 font-bold text-xs rounded-xl cursor-not-allowed whitespace-nowrap">
                          暂无用户名
                        </span>
                      )}

                      {/* ② View Source — always shown when post URL exists */}
                      {postUrl ? (
                        <button
                          onClick={() => window.open(postUrl, '_blank', 'noopener,noreferrer')}
                          className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-3 bg-blue-950 hover:bg-blue-900 active:scale-95 text-blue-300 font-bold text-xs rounded-xl border border-blue-700 hover:border-blue-500 transition-all cursor-pointer whitespace-nowrap"
                        >
                          🔗 View Source
                        </button>
                      ) : (
                        <span className="flex-1 sm:flex-none flex items-center justify-center px-6 py-3 bg-gray-800 text-gray-600 font-bold text-xs rounded-xl cursor-not-allowed whitespace-nowrap">
                          暂无链接
                        </span>
                      )}

                      {/* ③ 复制话术 */}
                      <button
                        onClick={() => copyPitch(lead)}
                        className={`flex-1 sm:flex-none px-4 py-3 font-bold text-xs rounded-xl transition-all whitespace-nowrap ${
                          pitched
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700'
                        }`}
                      >
                        {pitched ? '✅ 已复制！' : '📋 复制话术'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════════
            SECTION 2 — 印钞机入口 (Manual entry)
        ══════════════════════════════════════════ */}
        <div className="relative mb-8">
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-r from-blue-500/30 via-purple-500/30 to-amber-500/30 blur-sm" />
          <div className="relative bg-gray-900 border border-gray-700 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold">💰 印钞机入口</span>
              <span className="text-xs text-gray-500">粘贴任意聊天记录 → AI 秒出提取 + 管家回复</span>
            </div>

            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
              placeholder={'把微信聊天、小红书帖子、任何线索贴进来↓\n\n例：朋友在上海，想让我帮她买限量版爱马仕，重金酬谢，急，明天就要！'}
              disabled={submitPhase !== 'idle' && submitPhase !== 'done'}
              className="w-full bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none resize-none h-36 placeholder-gray-600 leading-relaxed"
            />

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={submit}
                disabled={(submitPhase !== 'idle' && submitPhase !== 'done') || !input.trim()}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed px-6 py-2.5 rounded-xl text-sm font-semibold transition-all"
              >
                {submitPhase === 'extracting' ? '🧠 AI 提取中...'
                  : submitPhase === 'replying' ? '✍️ 生成话术中...'
                  : '⚡ 立即录入 + 生成话术'}
              </button>
              <span className="text-xs text-gray-600">⌘↵ 快速提交</span>
            </div>

            {quickResult && (
              <div className="mt-4 border border-gray-700 rounded-xl overflow-hidden">
                <div className="bg-gray-800 px-4 py-3 flex flex-wrap gap-3 text-xs">
                  {quickResult.extracted.tier === 'vip' && <span className="font-bold text-yellow-300">💎 VIP 大单</span>}
                  {quickResult.extracted.is_urgent && <span className="text-red-400">⚡ 紧急</span>}
                  {quickResult.extracted.is_cross_border && <span className="text-amber-300">🌏 跨国</span>}
                  <span className="text-gray-300 font-medium">{quickResult.extracted.summary}</span>
                  {quickResult.extracted.location && <span className="text-gray-400">📍 {quickResult.extracted.location}</span>}
                  {quickResult.extracted.budget && <span className="text-gray-400">💰 {quickResult.extracted.budget}</span>}
                </div>
                <div className="bg-gray-900 px-4 py-4">
                  <p className="text-xs font-semibold text-purple-300 mb-2">管家回复话术 — 直接复制发客户</p>
                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap mb-4">{quickResult.reply}</p>
                  <button
                    onClick={() => copyReply(quickResult.reply)}
                    className={`w-full py-4 rounded-xl text-sm font-black tracking-wide transition-all ${
                      copied
                        ? 'bg-green-600 text-white'
                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg shadow-purple-900/30'
                    }`}
                  >
                    {copied ? '✅ 已复制 — 去原App粘贴回复！' : '⬆️ 一键复制话术 · 去原App粘贴'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══════════════════════════════════════════
            SECTION 3 — Full History (collapsible)
        ══════════════════════════════════════════ */}
        <div>
          <button
            onClick={() => setShowHistory(h => !h)}
            className="w-full flex items-center justify-between px-2 py-3 text-sm text-gray-500 hover:text-gray-300 border-t border-gray-800 transition-colors"
          >
            <span className="font-semibold">📋 全部线索 ({leads.length} 条)</span>
            <span>{showHistory ? '▲ 收起' : '▼ 展开'}</span>
          </button>

          {showHistory && (
            <div className="space-y-3 mt-3">
              {sortedLeads.map(lead => {
                const risky      = hasRisk(lead.raw_text);
                const isVip      = lead.tier === 'vip';
                const crossBorder = lead.is_cross_border === 1;
                const pc         = PLATFORM_CONFIG[lead.platform] as PlatformInfo | undefined;
                const showPlatformRow = pc != null || lead.author != null;
                const cardBorder = risky ? 'border-red-500/50'
                  : isVip ? 'border-yellow-400/70'
                  : crossBorder ? 'border-amber-500/60'
                  : 'border-gray-800';
                const cardBg    = risky ? 'bg-red-950/30'
                  : isVip ? 'bg-yellow-950/30'
                  : crossBorder ? 'bg-amber-950/20'
                  : 'bg-gray-900';
                const isUpdating  = updatingStatus[lead.id] ?? false;
                const isGenerating = generatingReply[lead.id] ?? false;
                const reply       = replies[lead.id];
                const nextSteps   = STATUS_FLOW[lead.status] ?? [];

                return (
                  <div key={lead.id} className={`${cardBg} border ${cardBorder} rounded-2xl p-4`}>
                    {isVip && !risky && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-gradient-to-r from-yellow-500/30 to-amber-500/20 text-yellow-300 border border-yellow-400/40">
                          💎 顶级 VIP
                        </span>
                      </div>
                    )}
                    {crossBorder && !risky && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          🌏 跨国需求
                        </span>
                      </div>
                    )}
                    {risky && (
                      <div className="flex items-center gap-2 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                        <span>⚠️ 潜在违规风险 — 请仔细核实</span>
                      </div>
                    )}

                    {/* Title row */}
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <p className="text-sm font-semibold leading-snug">
                        {getChineseSummary(lead)}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {lead.confidence > 0 && (
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                            lead.confidence >= 95
                              ? 'text-green-300 bg-green-500/10 border-green-500/30'
                              : 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30'
                          }`}>
                            🎯 意向{lead.confidence}%
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[lead.status] ?? ''}`}>
                          {STATUS_LABEL[lead.status] ?? lead.status}
                        </span>
                      </div>
                    </div>

                    {/* Platform + Author row */}
                    {showPlatformRow && (
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {pc && (
                          <>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${pc.badgeClass}`}>
                              {pc.label}
                            </span>
                            <span className="text-xs font-semibold text-yellow-300">👉 {pc.instruction}</span>
                          </>
                        )}
                        {lead.author && (
                          <>
                            {pc && <span className="text-gray-600">·</span>}
                            <span className="text-xs text-gray-300">👤 @{lead.author}</span>
                            {lead.author_url && (
                              <a href={lead.author_url} target="_blank" rel="noopener noreferrer"
                                className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full transition-colors font-medium">
                                私信 →
                              </a>
                            )}
                          </>
                        )}
                      </div>
                    )}

                    {/* Metadata */}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-2">
                      {lead.location && <span>📍 {lead.location}</span>}
                      {lead.budget && <span>💰 {lead.budget}</span>}
                      <span>🕒 {new Date(lead.created_at).toLocaleString('zh-CN')}</span>
                      {lead.source_url && (
                        <a href={lead.source_url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2">
                          🔗 直达原帖 →
                        </a>
                      )}
                    </div>

                    {/* Post content preview */}
                    {lead.post_content && (
                      <div className="bg-gray-800/60 border border-gray-700/50 rounded-lg px-3 py-2 mb-3 text-xs text-gray-300 leading-relaxed">
                        <span className="text-gray-500 font-medium mr-1">原文：</span>
                        {lead.post_content.length > 220
                          ? lead.post_content.slice(0, 220) + '…'
                          : lead.post_content}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {nextSteps.map(step => (
                        <button key={step.next}
                          onClick={() => updateStatus(lead.id, step.next)}
                          disabled={isUpdating}
                          className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 ${step.cls}`}>
                          {isUpdating ? '更新中...' : step.label}
                        </button>
                      ))}
                      {!risky && (
                        <button onClick={() => generateReply(lead.id)} disabled={isGenerating}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium bg-purple-700 hover:bg-purple-600 disabled:opacity-50">
                          {isGenerating ? '生成中...' : '✨ 生成回复话术'}
                        </button>
                      )}
                    </div>

                    {/* Auto-reply */}
                    {lead.auto_reply && !reply && (
                      <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-purple-300 font-medium">⚡ 预生成话术</p>
                          <button onClick={() => navigator.clipboard.writeText(lead.auto_reply!)}
                            className="text-xs text-purple-400 hover:text-purple-300">复制</button>
                        </div>
                        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{lead.auto_reply}</p>
                      </div>
                    )}

                    {/* Manual reply */}
                    {reply && (
                      <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-3 mb-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs text-purple-300 font-medium">微信回复话术</p>
                          <button onClick={() => navigator.clipboard.writeText(reply)}
                            className="text-xs text-purple-400 hover:text-purple-300">复制</button>
                        </div>
                        <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{reply}</p>
                      </div>
                    )}

                    <details className="text-xs text-gray-600">
                      <summary className="cursor-pointer hover:text-gray-400">查看原始文本</summary>
                      <p className="mt-2 whitespace-pre-wrap leading-relaxed">{lead.raw_text}</p>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
