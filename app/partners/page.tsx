'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';

export default function PartnersPage() {
  const [contact, setContact] = useState('');
  const [city, setCity] = useState('');
  const [offering, setOffering] = useState('');
  const [credentials, setCredentials] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const text = `商家合作申请\n联系方式：${contact}\n服务城市：${city}\n商品、服务与履约能力：${offering}\n许可、保险与公司信息：${credentials}`;
    const res = await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        summary: `商家合作申请：${city}`,
        task: '美国商家与供应商合作',
        location: city,
        platform: 'official-account',
        contact,
        submission_kind: 'merchant',
        service_country: 'US',
        confidence: 75,
        accepted_terms: acceptedTerms,
      }),
    });
    if (!res.ok) {
      setLoading(false);
      alert('提交暂时失败，请稍后重试或通过微信 herbworldapp 联系平台');
      return;
    }
    setSubmitted(true);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-[#171b17] px-5 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href="/" className="text-sm text-[#d7c99b]">返回首页</Link>
        <p className="mt-12 text-xs font-semibold uppercase tracking-[0.25em] text-[#d7c99b]">曼哈顿试点商家合作</p>
        <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-5xl">资料完整的真实需求，成交后再付平台费用</h1>
        <p className="mt-6 text-base leading-8 text-white/65">首批招募家具搬运与本地配送、搬家后清洁、家具组装商家。平台会提前收集照片、尺寸、楼层、电梯、邮编和时间。无加盟费；希望合作商家提供明确会员价，并只在真实成交后支付约定费用。</p>

        {submitted ? (
          <div className="mt-10 border border-white/20 bg-white/5 p-7">
            <h2 className="text-2xl font-semibold">合作信息已收到</h2>
            <p className="mt-3 leading-7 text-white/65">平台会在对应城市和品类出现合适需求时联系你。</p>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-10 space-y-5 border border-white/20 bg-white/5 p-7">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">微信、电话或邮箱</span>
              <input required value={contact} onChange={(e) => setContact(e.target.value)} className="w-full border border-white/25 bg-white/10 px-4 py-3 text-white" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">可服务区域</span>
              <input required value={city} onChange={(e) => setCity(e.target.value)} placeholder="例如：Upper East Side、Midtown、全曼哈顿" className="w-full border border-white/25 bg-white/10 px-4 py-3 text-white" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">服务、公开价、可提供的会员价、最低收费和可接单时间</span>
              <textarea required value={offering} onChange={(e) => setOffering(e.target.value)} className="h-40 w-full border border-white/25 bg-white/10 px-4 py-3 text-white" />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">公司法定名称、适用许可编号和责任保险信息</span>
              <textarea required value={credentials} onChange={(e) => setCredentials(e.target.value)} placeholder="搬家商家请填写 NYSDOT 编号；其他商家填写适用许可和保险信息" className="h-32 w-full border border-white/25 bg-white/10 px-4 py-3 text-white" />
            </label>
            <label className="flex gap-3 border border-white/25 p-3 text-sm leading-6 text-white/75">
              <input required className="mt-1" type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)} />
              <span>我同意<Link className="mx-1 underline" href="/terms">服务条款</Link>和<Link className="underline" href="/privacy">隐私政策</Link>，并确认持续遵守经营许可、商品、税务、运输及消费者保护要求。</span>
            </label>
            <button disabled={loading || !acceptedTerms} className="w-full bg-[#d7c99b] px-5 py-4 font-semibold text-[#171714] disabled:opacity-50">
              {loading ? '正在提交' : '提交合作信息'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
