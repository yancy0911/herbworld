'use client';

import { useEffect, useState } from 'react';

type RecordRow = Record<string, string | number | null>;
type Operations = { items: RecordRow[]; claims: RecordRow[]; services: RecordRow[]; reports: RecordRow[] };

export default function OperationsPage() {
  const [data, setData] = useState<Operations | null>(null);
  const [message, setMessage] = useState('读取中...');
  const [handoffCodes, setHandoffCodes] = useState<Record<number, string>>({});
  const [checks, setChecks] = useState<Record<number, Record<string, boolean>>>({});

  async function load() {
    setMessage('读取中...');
    const res = await fetch('/api/community/operations');
    const body = await res.json();
    if (!res.ok) return setMessage(body.error || '读取失败');
    setData(body); setMessage('');
  }

  async function update(kind: string, id: number, status: string) {
    const res = await fetch('/api/community/operations', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, id, status, review_checks: checks[id] }),
    });
    const body = await res.json();
    if (!res.ok) return setMessage(body.error || '更新失败');
    if (body.handoff_code) {
      setHandoffCodes(v => ({ ...v, [id]: body.handoff_code }));
      setMessage(`领取申请 #${id} 的一次性取货码已生成。请仅发送给领取者。`);
    }
    await load();
  }

  const button = 'rounded-lg bg-[#102019] px-3 py-2 text-xs font-semibold text-white';

  useEffect(() => {
    let active = true;
    void fetch('/api/community/operations')
      .then(async res => ({ ok: res.ok, body: await res.json() }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (!ok) return setMessage(body.error || '读取失败');
        setData(body);
        setMessage('');
      })
      .catch(() => {
        if (active) setMessage('读取失败');
      });
    return () => { active = false; };
  }, []);

  return <main className="min-h-screen bg-[#f3f0e7] px-5 py-12 text-[#102019]">
    <div className="mx-auto max-w-7xl">
      <p className="text-xs font-semibold tracking-[.2em] text-[#7f6c36]">HERB WORLD OPERATIONS</p>
      <h1 className="mt-3 text-4xl font-semibold">曼哈顿试点运营台</h1>
      <button className={`${button} mt-7`} onClick={load}>刷新运营数据</button>
      {message && <p className="mt-4 text-sm text-[#8a3f31]">{message}</p>}

      {data && <div className="mt-10 space-y-12">
        <Section title={`待审与已发布物品（${data.items.length}）`}>
          {data.items.map(x => <Card key={`i${x.id}`} row={x}>
            {x.status === 'pending_review' && <div className="w-full rounded-xl bg-[#f3f0e7] p-3 text-xs leading-6">
              <p className="font-semibold">批准前安全清单</p>
              {[
                ['ownership', '已确认发布者拥有物品且完全免费'],
                ['condition', '已核对照片、缺陷、尺寸和搬运风险'],
                ['recall', '已在 CPSC Recalls 核对品牌与型号，无召回或安全警告'],
                ['privacy', '公开文字没有联系方式、门牌号或敏感信息'],
              ].map(([key, label]) => <label key={key} className="block"><input className="mr-2" type="checkbox" checked={Boolean(checks[Number(x.id)]?.[key])} onChange={e => setChecks(v => ({ ...v, [Number(x.id)]: { ...v[Number(x.id)], [key]: e.target.checked } }))}/>{label}</label>)}
              <a className="mt-2 inline-block underline" href="https://www.cpsc.gov/Recalls" target="_blank" rel="noreferrer">打开 CPSC 召回数据库</a>
            </div>}
            <button className={button} disabled={x.status === 'pending_review' && !['ownership','condition','recall','privacy'].every(k => checks[Number(x.id)]?.[k])} onClick={() => update('item', Number(x.id), 'available')}>批准发布</button>
            <button className={button} onClick={() => update('item', Number(x.id), 'claimed')}>标记已领取</button>
            <button className={button} onClick={() => update('item', Number(x.id), 'rejected')}>拒绝</button>
          </Card>)}
        </Section>
        <Section title={`领取申请（${data.claims.length}）`}>
          {data.claims.map(x => <Card key={`c${x.id}`} row={x}>
            <button className={button} onClick={() => update('claim', Number(x.id), 'contacted')}>确认领取并生成取货码</button>
            {handoffCodes[Number(x.id)] && <p className="w-full rounded-xl bg-[#f3f0e7] p-3 text-sm"><b>一次性取货码：</b><span className="ml-2 text-xl tracking-[.25em]">{handoffCodes[Number(x.id)]}</span><br/><span className="text-xs">仅发送给领取者；发布者现场在 herbworld.app/handoff 核销。</span></p>}
          </Card>)}
        </Section>
        <Section title={`服务需求（${data.services.length}）`}>
          {data.services.map(x => <Card key={`s${x.id}`} row={x}>
            <button className={button} onClick={() => update('service', Number(x.id), 'quoted')}>已报价</button>
            <button className={button} onClick={() => update('service', Number(x.id), 'completed')}>已成交</button>
          </Card>)}
        </Section>
        <Section title={`内容举报（${data.reports.length}）`}>
          {data.reports.map(x => <Card key={`r${x.id}`} row={x}>
            <button className={button} onClick={() => update('report', Number(x.id), 'reviewing')}>正在处理</button>
            <button className={button} onClick={() => update('report', Number(x.id), 'resolved')}>处理完成</button>
          </Card>)}
        </Section>
      </div>}
    </div>
  </main>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section><h2 className="mb-5 text-2xl font-semibold">{title}</h2><div className="grid gap-4 lg:grid-cols-2">{children}</div></section>;
}

function Card({ row, children }: { row: RecordRow; children: React.ReactNode }) {
  const labels: Record<string, string> = {
    description: '物品说明', category: '类别', condition: '状态', approximate_area: '大概区域',
    dimensions: '尺寸', floor_elevator: '楼层与搬运条件', availability: '可交接时间',
    contact: '联系方式', needs_service: '需要的服务', created_at: '提交时间',
    pickup_time: '可领取时间', transport_plan: '搬运计划', note: '补充说明',
    service_type: '服务类型', details: '需求详情', policy_version: '同意的规则版本', reason: '举报原因',
    accepted_terms_at: '同意规则时间', reviewed_at: '审核时间',
    handoff_code_expires_at: '取货码有效期', completed_at: '完成交接时间',
  };
  const statuses: Record<string, string> = {
    pending_review: '等待审核', available: '已公开', claimed: '已领取', rejected: '已拒绝',
    pending: '等待处理', contacted: '已经联系', completed: '已完成', new: '新需求', quoted: '已报价',
    reviewing: '正在处理', resolved: '处理完成',
  };
  return <article className="rounded-2xl border border-[#d4d8d0] bg-white p-5">
    <div className="flex justify-between gap-3"><h3 className="font-semibold">#{row.id} {String(row.title || row.item_title || row.service_type || '申请')}</h3><span className="text-xs">{statuses[String(row.status)] || row.status}</span></div>
    <div className="mt-3 space-y-1 text-sm leading-6 text-[#5d6b62]">
      {Object.entries(row).filter(([k, v]) => v && !['id', 'title', 'item_title', 'status', 'handoff_code_hash'].includes(k)).slice(0, 14).map(([k, v]) => <p key={k}><b>{labels[k] || k}：</b>{String(v)}</p>)}
    </div>
    <div className="mt-4 flex flex-wrap gap-2">{children}</div>
  </article>;
}
