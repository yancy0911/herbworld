'use client';

import Link from 'next/link';
import { FormEvent, ReactNode, useEffect, useState } from 'react';

type Item = {
  id: number; title: string; description: string; category: string; condition: string;
  approximate_area: string; dimensions: string | null; floor_elevator: string | null;
  availability: string;
};

const samples: Item[] = [
  { id: -1, title: '实木边桌', description: '正常使用痕迹，适合客厅或卧室。', category: '家具', condition: '良好', approximate_area: 'Upper East Side 近 86 St', dimensions: '约 20 × 20 × 22 英寸', floor_elevator: '电梯楼', availability: '周末可交接' },
  { id: -2, title: '搬家纸箱一组', description: '已经拆平，可以重复使用。', category: '搬家用品', condition: '可用', approximate_area: 'Midtown East 近 Grand Central', dimensions: '大小混合约 15 个', floor_elevator: '大堂交接', availability: '工作日晚间' },
  { id: -3, title: '五层书架', description: '结构稳定，有轻微使用痕迹，需要自行搬运。', category: '家具', condition: '良好', approximate_area: 'Upper West Side 近 72 St', dimensions: '约 24 × 10 × 71 英寸', floor_elevator: '三楼无电梯', availability: '本周内' },
];

const emptyItem = { title: '', description: '', category: '家具', condition: '', approximate_area: '', dimensions: '', floor_elevator: '', availability: '', contact: '', needs_service: '不需要' };

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [item, setItem] = useState(emptyItem);
  const [claim, setClaim] = useState({ item_id: 0, contact: '', pickup_time: '', transport_plan: '', note: '' });
  const [service, setService] = useState({ item_id: 0, service_type: '家具搬运与本地配送', contact: '', details: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState('');

  useEffect(() => {
    fetch('/api/community/items').then(r => r.json()).then(data => setItems(data.items ?? [])).catch(() => {});
  }, []);

  async function submit(path: string, body: unknown, kind: string) {
    setLoading(kind); setMessage('');
    try {
      const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提交失败');
      setMessage(kind === 'item' ? '发布已收到。平台会通过你留下的联系方式收取照片，审核后再公开。' : kind === 'claim' ? '领取申请已收到。平台确认物品仍可领取后会联系双方。' : '服务需求已收到。平台补齐资料后，会提供经过核验的合作商家报价。');
      if (kind === 'item') setItem(emptyItem);
    } catch (e) { setMessage(e instanceof Error ? e.message : '提交失败'); }
    finally { setLoading(''); }
  }

  function submitItem(e: FormEvent) { e.preventDefault(); submit('/api/community/items', { ...item, owns_item: true, accepted_rules: true }, 'item'); }
  function submitClaim(e: FormEvent) { e.preventDefault(); submit('/api/community/claims', { ...claim, accepted_rules: true }, 'claim'); }
  function submitService(e: FormEvent) { e.preventDefault(); submit('/api/community/services', { ...service, accepted_rules: true }, 'service'); }

  const shown = items.length ? items : samples;
  const input = 'w-full rounded-xl border border-[#c8d4cc] bg-white px-4 py-3 text-sm text-[#132019] outline-none focus:border-[#527965]';

  return <main className="min-h-screen bg-[#f3f0e7] text-[#102019]">
    <header className="border-b border-white/10 bg-[#0d2119] text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-start gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between md:px-8">
        <div><p className="text-xs tracking-[.22em] text-[#d5ba70]">HERB WORLD</p><p className="mt-1 font-semibold">曼哈顿邻里互助试点</p></div>
        <nav className="flex flex-wrap gap-4 text-sm"><a href="#publish">免费发布</a><a href="#services">申请服务报价</a><Link href="/partners">商家合作</Link></nav>
      </div>
    </header>

    <section className="bg-[#0d2119] text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-20 md:grid-cols-[1.15fr_.85fr] md:px-8 md:py-28">
        <div><p className="text-xs font-semibold tracking-[.25em] text-[#d5ba70]">FREE LOCAL REUSE · MANHATTAN PILOT</p>
          <h1 className="mt-5 text-5xl font-semibold leading-[1.08] md:text-7xl">不需要的东西，<br/>给附近真正需要的人</h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-white/70">免费发布、免费领取、人工审核。确认领取后使用一次性取货码完成交接记录。首阶段服务曼哈顿。</p>
          <div className="mt-9 flex flex-wrap gap-3"><a href="#publish" className="bg-[#d5ba70] px-6 py-3.5 font-semibold text-[#102019]">免费发布物品</a><a href="#items" className="border border-white/30 px-6 py-3.5 font-semibold">查看附近物品</a></div>
        </div>
        <aside className="rounded-3xl border border-white/15 bg-white/[.06] p-7"><p className="text-sm font-semibold text-[#d5ba70]">当前试点规则</p><ul className="mt-5 space-y-4 text-sm leading-7 text-white/70"><li>物品必须完全免费</li><li>公开页面只显示街区，不显示门牌号</li><li>平台人工审核后才会公开</li><li>现场交接后再核销一次性取货码</li><li>禁止食品、药品、危险品和召回品</li><li>首阶段服务曼哈顿</li></ul></aside>
      </div>
    </section>

    <section id="items" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-semibold tracking-[.2em] text-[#7f6c36]">曼哈顿附近免费物品</p><h2 className="mt-3 text-4xl font-semibold">等待一个新去处</h2></div><p className="max-w-md text-sm leading-6 text-[#647067]">{items.length ? '以下物品已经通过平台审核。' : '目前还没有公开物品，以下三项是填写示例。'}</p></div>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{shown.map(x => <article key={x.id} className="overflow-hidden rounded-2xl border border-[#d4d8d0] bg-white">
        <div className="flex h-44 items-center justify-center bg-[#dce8e0] text-5xl">{x.category === '家具' ? '◫' : '□'}</div>
        <div className="p-6"><div className="flex justify-between gap-3"><h3 className="text-xl font-semibold">{x.title}</h3><span className="h-fit rounded-full bg-[#e9efe9] px-3 py-1 text-xs">{x.condition}</span></div><p className="mt-3 text-sm leading-6 text-[#667168]">{x.description}</p><div className="mt-5 space-y-1 text-xs text-[#667168]"><p>{x.approximate_area}</p><p>{x.dimensions}</p><p>{x.floor_elevator} · {x.availability}</p></div>{x.id > 0 && <button onClick={() => { setClaim(v => ({...v,item_id:x.id})); location.hash='claim'; }} className="mt-5 w-full rounded-xl bg-[#102019] px-4 py-3 text-sm font-semibold text-white">申请领取这个物品</button>}</div>
      </article>)}</div>
    </section>

    <section id="publish" className="border-y border-[#d5d8d0] bg-white">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-[.72fr_1.28fr] md:px-8">
        <div><p className="text-xs font-semibold tracking-[.2em] text-[#7f6c36]">发布物品</p><h2 className="mt-3 text-4xl font-semibold">照着例子填写即可</h2><p className="mt-5 leading-7 text-[#667168]">只需要填写大概街区，不要写门牌号。提交后平台会联系你收取照片，并确认物品是否适合公开。</p><div className="mt-6 rounded-2xl bg-[#f3f0e7] p-5 text-sm leading-7 text-[#55655a]"><b>不确定怎么量尺寸？</b><br/>写大约的宽 × 深 × 高即可。没有卷尺也可以写“约一人高”或“普通床头柜大小”。</div></div>
        <form onSubmit={submitItem} className="grid gap-5 rounded-2xl bg-[#eef2ed] p-6 md:grid-cols-2">
          <Field label="这是什么物品？" help="例如：五层书架、落地灯、搬家纸箱">
            <input className={input} placeholder="例如：五层书架" value={item.title} onChange={e=>setItem({...item,title:e.target.value})} required/>
          </Field>
          <Field label="选择物品类别" help="选择最接近的一项即可">
            <select className={input} value={item.category} onChange={e=>setItem({...item,category:e.target.value})}><option>家具</option><option>家居用品</option><option>小型电器</option><option>书籍</option><option>搬家用品</option><option>其他</option></select>
          </Field>
          <Field label="物品现在是什么状态？" help="请直接说明划痕、缺件或损坏">
            <input className={input} placeholder="例如：使用两年，稳固，有轻微划痕" value={item.condition} onChange={e=>setItem({...item,condition:e.target.value})} required/>
          </Field>
          <Field label="物品在曼哈顿哪个街区？" help="不要填写楼号、房号或完整地址">
            <input className={input} placeholder="例如：Upper East Side 近 86 St" value={item.approximate_area} onChange={e=>setItem({...item,approximate_area:e.target.value})} required/>
          </Field>
          <Field label="大概尺寸是多少？" help="按照宽 × 深 × 高填写；不知道可写大概大小">
            <input className={input} placeholder="例如：24 × 10 × 71 英寸" value={item.dimensions} onChange={e=>setItem({...item,dimensions:e.target.value})}/>
          </Field>
          <Field label="领取时怎么搬出来？" help="写楼层、是否有电梯、是否需要两个人">
            <input className={input} placeholder="例如：三楼无电梯，需要两个人搬" value={item.floor_elevator} onChange={e=>setItem({...item,floor_elevator:e.target.value})}/>
          </Field>
          <Field label="什么时候方便交接？" help="写几个你通常方便的时间段">
            <input className={input} placeholder="例如：周六上午或工作日晚上 7 点后" value={item.availability} onChange={e=>setItem({...item,availability:e.target.value})} required/>
          </Field>
          <Field label="平台怎样联系你？" help="不会公开展示，只供平台审核和协调">
            <input className={input} placeholder="微信号、手机号或邮箱，任选一种" value={item.contact} onChange={e=>setItem({...item,contact:e.target.value})} required/>
          </Field>
          <Field label="需要平台帮你找付费服务吗？" help="提交不代表下单，平台会先询价">
            <select className={input} value={item.needs_service} onChange={e=>setItem({...item,needs_service:e.target.value})}><option>不需要</option><option>需要搬运报价</option><option>需要清走报价</option><option>需要清洁报价</option></select>
          </Field>
          <Field wide label="还有什么必须提前告诉领取者？" help="说明明显缺陷、缺失配件、重量或使用限制">
            <textarea className={`${input} min-h-28`} placeholder="例如：右侧有划痕；不含固定螺丝；比较重，需要两个人搬" value={item.description} onChange={e=>setItem({...item,description:e.target.value})} required/>
          </Field>
          <p className="text-sm leading-6 text-[#55655a] md:col-span-2">照片不用在这里上传。提交后，平台会通过你留下的联系方式请你发送物品照片。</p>
          <label className="flex items-start gap-3 text-sm leading-6 text-[#55655a] md:col-span-2"><input className="mt-1" type="checkbox" required/>我确认这是我的物品、完全免费，并同意平台审核及<Link className="underline" href="/terms">试点规则</Link>。</label>
          <button disabled={loading==='item'} className="rounded-xl bg-[#102019] px-5 py-3.5 font-semibold text-white md:col-span-2">{loading==='item'?'正在提交':'提交给平台审核'}</button>
        </form>
      </div>
    </section>

    <section id="claim" className="mx-auto grid max-w-7xl gap-12 px-5 py-20 md:grid-cols-2 md:px-8">
      <form onSubmit={submitClaim} className="rounded-2xl border border-[#d4d8d0] bg-white p-6"><h2 className="text-2xl font-semibold">申请领取</h2><p className="mt-2 text-sm leading-6 text-[#667168]">请先在上方已审核物品中点击“申请领取这个物品”，系统会自动选中，不需要记编号。</p><div className="mt-5 space-y-4">
        <select className={input} value={claim.item_id || ''} onChange={e=>setClaim({...claim,item_id:Number(e.target.value)})} required><option value="">请选择想领取的物品</option>{items.map(x=><option key={x.id} value={x.id}>#{x.id} {x.title} · {x.approximate_area}</option>)}</select>
        <input className={input} placeholder="你什么时候可以领取？例如：周六上午" value={claim.pickup_time} onChange={e=>setClaim({...claim,pickup_time:e.target.value})} required/>
        <input className={input} placeholder="你准备怎么搬？例如：两人自驾取走" value={claim.transport_plan} onChange={e=>setClaim({...claim,transport_plan:e.target.value})} required/>
        <input className={input} placeholder="平台联系你的微信、电话或邮箱" value={claim.contact} onChange={e=>setClaim({...claim,contact:e.target.value})} required/>
        <textarea className={`${input} min-h-24`} placeholder="还有什么需要说明？没有可以不填" value={claim.note} onChange={e=>setClaim({...claim,note:e.target.value})}/>
        <label className="flex gap-2 text-xs leading-5 text-[#667168]"><input className="mt-1" type="checkbox" required/>我同意<Link className="underline" href="/terms">交接安全规则</Link>，会自行核实物品并选择安全交接地点。</label><button disabled={loading==='claim' || !items.length} className="w-full rounded-xl bg-[#102019] px-5 py-3.5 font-semibold text-white disabled:opacity-50">{items.length ? '提交领取申请' : '目前没有可领取物品'}</button>
      </div></form>

      <form id="services" onSubmit={submitService} className="rounded-2xl bg-[#173229] p-6 text-white"><p className="text-xs font-semibold tracking-[.2em] text-[#d5ba70]">曼哈顿合作商家报价</p><h2 className="mt-3 text-2xl font-semibold">需要搬运、清洁或组装？</h2><p className="mt-3 text-sm leading-6 text-white/65">请把现场情况写清楚，平台再向经过核验的商家询价。提交不代表已经下单。</p><div className="mt-5 space-y-4">
        <select className={input} value={service.service_type} onChange={e=>setService({...service,service_type:e.target.value})}><option>家具搬运与本地配送</option><option>搬家后清洁</option><option>家具组装</option><option>无人领取物品清走</option></select>
        <select className={input} value={service.item_id || ''} onChange={e=>setService({...service,item_id:Number(e.target.value)})}><option value="">不关联公开物品</option>{items.map(x=><option key={x.id} value={x.id}>#{x.id} {x.title}</option>)}</select>
        <input className={input} placeholder="平台联系你的微信、电话或邮箱" value={service.contact} onChange={e=>setService({...service,contact:e.target.value})} required/>
        <textarea className={`${input} min-h-36`} placeholder="例如：从 Upper East Side 三楼无电梯搬一个书架到 Midtown 电梯楼；书架约 24×10×71 英寸；希望周六完成；请报价" value={service.details} onChange={e=>setService({...service,details:e.target.value})} required/>
        <label className="flex gap-2 text-xs leading-5 text-white/65"><input className="mt-1" type="checkbox" required/>我同意<Link className="underline" href="/terms">服务条款</Link>和<Link className="underline" href="/privacy">隐私政策</Link>。</label><button disabled={loading==='service'} className="w-full rounded-xl bg-[#d5ba70] px-5 py-3.5 font-semibold text-[#102019]">申请商家报价</button>
      </div></form>
    </section>

    {message && <div className="fixed bottom-5 left-1/2 z-20 w-[min(92%,620px)] -translate-x-1/2 rounded-xl bg-[#d5ba70] px-5 py-4 text-sm font-semibold text-[#102019] shadow-2xl">{message}</div>}
    <footer className="bg-[#0d2119] text-white"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-5 px-5 py-8 text-sm text-white/60 md:px-8"><p>HerbWorld Share · Polaris Global L.L.C. · 曼哈顿试点</p><p>微信 herbworldapp · <Link href="/handoff">取货码核销</Link> · <Link href="/safety">安全</Link> · <Link href="/terms">规则</Link> · <Link href="/privacy">隐私</Link> · <Link href="/partners">商家合作</Link></p></div></footer>
  </main>;
}

function Field({ label, help, wide = false, children }: { label: string; help: string; wide?: boolean; children: ReactNode }) {
  return <label className={wide ? 'md:col-span-2' : ''}><span className="mb-1 block text-sm font-semibold">{label}</span><span className="mb-2 block text-xs leading-5 text-[#667168]">{help}</span>{children}</label>;
}
