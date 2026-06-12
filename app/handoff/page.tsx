'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function HandoffPage() {
  const [claimId, setClaimId] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/community/handoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim_id: Number(claimId), handoff_code: code }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || '核销失败');
      setDone(true);
      setMessage('交接完成。这个物品已经被记录为成功再利用。');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '核销失败');
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-screen bg-[#f3f0e7] px-5 py-12 text-[#102019]">
    <article className="mx-auto max-w-xl rounded-3xl border border-[#d4d8d0] bg-white p-7 shadow-sm">
      <p className="text-xs font-semibold tracking-[.2em] text-[#7f6c36]">HERBWORLD VERIFIED HANDOFF</p>
      <h1 className="mt-3 text-3xl font-semibold">确认物品已经交接</h1>
      <p className="mt-4 text-sm leading-7 text-[#667168]">领取者向发布者出示平台发送的六位取货码。发布者当面检查无误后输入，系统才会把物品标记为完成再利用。</p>
      <form className="mt-7 space-y-4" onSubmit={submit}>
        <label className="block text-sm font-semibold">领取申请编号
          <input className="mt-2 w-full rounded-xl border border-[#c8d4cc] px-4 py-3" inputMode="numeric" value={claimId} onChange={e => setClaimId(e.target.value.replace(/\D/g, ''))} required />
        </label>
        <label className="block text-sm font-semibold">六位取货码
          <input className="mt-2 w-full rounded-xl border border-[#c8d4cc] px-4 py-3 text-2xl tracking-[.35em]" inputMode="numeric" maxLength={6} value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} required />
        </label>
        <button disabled={loading || done || code.length !== 6} className="w-full rounded-xl bg-[#102019] px-5 py-3.5 font-semibold text-white disabled:opacity-50">{done ? '已完成交接' : loading ? '正在确认' : '确认完成交接'}</button>
      </form>
      {message && <p className={`mt-5 rounded-xl p-4 text-sm ${done ? 'bg-[#e9efe9] text-[#315644]' : 'bg-[#f8e8e3] text-[#8a3f31]'}`}>{message}</p>}
      <p className="mt-6 text-xs leading-6 text-[#667168]">不要在见到物品前提供取货码。物品状态不符或现场不安全时，请停止交接并联系平台。</p>
      <Link href="/" className="mt-5 inline-block text-sm underline">返回 HerbWorld Share</Link>
    </article>
  </main>;
}
