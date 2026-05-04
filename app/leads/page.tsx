'use client';
import { useEffect, useState } from 'react';

interface Lead {
  id: number;
  raw_text: string;
  summary: string | null;
  task: string | null;
  location: string | null;
  budget: string | null;
  is_cross_border: number;
  status: string;
  source_url: string | null;
  created_at: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: '待处理',
  contacted: '已联系',
  done: '已完成',
};

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  contacted: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  done: 'bg-green-500/20 text-green-300 border-green-500/30',
};

const STATUS_FLOW: Record<string, { next: string; label: string; cls: string }[]> = {
  pending: [{ next: 'contacted', label: '标记已联系', cls: 'bg-blue-600 hover:bg-blue-500' }],
  contacted: [
    { next: 'done', label: '标记已完成', cls: 'bg-green-600 hover:bg-green-500' },
    { next: 'pending', label: '重置待处理', cls: 'bg-gray-700 hover:bg-gray-600' },
  ],
  done: [{ next: 'pending', label: '重新开启', cls: 'bg-gray-700 hover:bg-gray-600' }],
};

// 违规关键词检测
const RISK_KEYWORDS = [
  '签证造假', '假证', '假文件', '伪造', '偷渡', '走私',
  '洗钱', '非法打工', '假学历', '骗保', '违法代签',
];

function hasRisk(text: string): boolean {
  return RISK_KEYWORDS.some(kw => text.includes(kw));
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<Record<number, boolean>>({});
  const [generatingReply, setGeneratingReply] = useState<Record<number, boolean>>({});
  const [replies, setReplies] = useState<Record<number, string>>({});

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/leads');
      const data = await res.json() as { leads: Lead[] };
      setLeads(data.leads);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeads(); }, []);

  const submit = async () => {
    if (!input.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: input }),
      });
      setInput('');
      await fetchLeads();
    } finally {
      setSubmitting(false);
    }
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

  const pending = leads.filter(l => l.status === 'pending').length;

  return (
    <main className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <h1 className="text-2xl font-bold">📡 待办获客雷达</h1>
          {pending > 0 && (
            <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
              {pending} 条待处理
            </span>
          )}
        </div>

        {/* 输入区 */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 mb-6">
          <p className="text-xs text-gray-400 mb-2">粘贴原始线索文本（小红书帖子、微信消息等），AI 自动提取关键信息</p>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="例：朋友推荐，有人在小红书问纽约哥大成绩单代取，预算200刀以内，急..."
            className="w-full bg-gray-800 rounded-xl px-4 py-3 text-sm outline-none resize-none h-24"
          />
          <button
            onClick={submit}
            disabled={submitting || !input.trim()}
            className="mt-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed px-5 py-2 rounded-xl text-sm font-medium"
          >
            {submitting ? '提取中...' : '录入线索'}
          </button>
        </div>

        {/* 线索列表 */}
        {loading && <p className="text-gray-500 text-sm">加载中...</p>}
        {!loading && leads.length === 0 && (
          <p className="text-gray-600 text-sm text-center py-16">暂无线索，粘贴文本开始录入</p>
        )}

        <div className="space-y-3">
          {leads.map(lead => {
            const risky = hasRisk(lead.raw_text);
            const crossBorder = lead.is_cross_border === 1;
            const cardBorder = risky ? 'border-red-500/50' : crossBorder ? 'border-amber-500/60' : 'border-gray-800';
            const cardBg = risky ? 'bg-red-950/30' : crossBorder ? 'bg-amber-950/20' : 'bg-gray-900';
            const isUpdating = updatingStatus[lead.id] ?? false;
            const isGenerating = generatingReply[lead.id] ?? false;
            const reply = replies[lead.id];
            const nextSteps = STATUS_FLOW[lead.status] ?? [];

            return (
              <div key={lead.id} className={`${cardBg} border ${cardBorder} rounded-2xl p-4`}>
                {/* 跨国需求标签 */}
                {crossBorder && !risky && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      🌏 跨国需求
                    </span>
                    <span className="text-xs text-amber-400/70">人在国内，求助纽约</span>
                  </div>
                )}

                {/* 违规警告 */}
                {risky && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
                    <span>⚠️</span>
                    <span>潜在违规风险 — 请仔细核实，勿承接涉及伪造/违法的任务</span>
                  </div>
                )}

                {/* 标题行 */}
                <div className="flex items-start justify-between gap-4 mb-2">
                  <p className="text-sm font-semibold leading-snug">
                    {lead.summary ?? lead.task ?? '（AI 初筛中...）'}
                  </p>
                  <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${STATUS_COLOR[lead.status] ?? ''}`}>
                    {STATUS_LABEL[lead.status] ?? lead.status}
                  </span>
                </div>

                {/* 元数据 + 原帖链接 */}
                <div className="flex flex-wrap gap-3 text-xs text-gray-400 mb-4">
                  {lead.location && <span>📍 {lead.location}</span>}
                  {lead.budget && <span>💰 {lead.budget}</span>}
                  <span>🕒 {new Date(lead.created_at).toLocaleString('zh-CN')}</span>
                  {lead.source_url && (
                    <a
                      href={lead.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline underline-offset-2"
                    >
                      查看原帖 →
                    </a>
                  )}
                </div>

                {/* 操作按钮行 */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {nextSteps.map(step => (
                    <button
                      key={step.next}
                      onClick={() => updateStatus(lead.id, step.next)}
                      disabled={isUpdating}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${step.cls}`}
                    >
                      {isUpdating ? '更新中...' : step.label}
                    </button>
                  ))}
                  {!risky && (
                    <button
                      onClick={() => generateReply(lead.id)}
                      disabled={isGenerating}
                      className="text-xs px-3 py-1.5 rounded-lg font-medium bg-purple-700 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGenerating ? '生成中...' : '✨ 生成回复话术'}
                    </button>
                  )}
                </div>

                {/* AI 生成的回复话术 */}
                {reply && (
                  <div className="bg-purple-950/40 border border-purple-500/20 rounded-xl p-3 mb-3">
                    <p className="text-xs text-purple-300 font-medium mb-1">微信回复话术</p>
                    <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{reply}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(reply)}
                      className="mt-2 text-xs text-purple-400 hover:text-purple-300"
                    >
                      复制话术
                    </button>
                  </div>
                )}

                {/* 原始文本折叠 */}
                <details className="text-xs text-gray-600">
                  <summary className="cursor-pointer hover:text-gray-400">查看原始文本</summary>
                  <p className="mt-2 whitespace-pre-wrap leading-relaxed">{lead.raw_text}</p>
                </details>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
