import Link from 'next/link';

export default function SafetyPage() {
  return <main className="min-h-screen bg-[#f7f7f4] px-5 py-10 text-[#151515]">
    <article className="mx-auto max-w-3xl space-y-6 text-sm leading-7 text-[#3f3b34]">
      <Link href="/" className="underline">返回首页</Link>
      <h1 className="text-3xl font-semibold">安全与审核规则</h1>
      <p>HerbWorld Share 当前只做曼哈顿的免费闲置物品试点。每一件公开物品都需要人工审核，但人工审核不等于专业检验或安全保证。</p>

      <h2 className="text-xl font-semibold">平台如何审核</h2>
      <p>运营人员会确认物品完全免费、发布者声明拥有物品、公开文字不含联系方式或完整地址，并检查照片、缺陷、尺寸、搬运条件以及 CPSC 召回信息。未完成全部检查的物品不能公开。</p>

      <h2 className="text-xl font-semibold">绝不接受</h2>
      <p>食品、药品、酒精、烟草、化妆品、医疗器械、武器、危险品、召回品、身份文件、票券，以及儿童安全座椅、婴儿床、头盔、救生衣等安全关键物品。</p>

      <h2 className="text-xl font-semibold">交接原则</h2>
      <p>建议白天在公共或有监控的地点交接。公开页面不会显示完整地址或联系方式。领取者应亲自检查物品并自行判断是否适合使用；任何一方都不应被要求进入陌生人的住宅。领取者不要提前提供一次性取货码，发布者仅在完成交付后核销。</p>
      <p><Link className="underline" href="/handoff">打开取货码核销页面</Link></p>

      <h2 className="text-xl font-semibold">付费服务</h2>
      <p>平台不在试点阶段代收服务费用。需要搬运、清洁或组装时，用户应在核验商家身份、适用许可和保险，并取得书面报价后，直接与实际提供服务的商家签约付款。</p>

      <h2 className="text-xl font-semibold">官方核验入口</h2>
      <p><a className="underline" href="https://www.cpsc.gov/Recalls" target="_blank" rel="noreferrer">CPSC 产品召回数据库</a></p>
      <p><a className="underline" href="https://www.dot.ny.gov/divisions/operating/osss/truck/moving" target="_blank" rel="noreferrer">NYSDOT 纽约州内搬家信息</a></p>

      <h2 className="text-xl font-semibold">报告问题</h2>
      <p>发现疑似召回、危险、欺诈、骚扰或隐私泄露，请停止交接并通过微信 herbworldapp 联系平台。</p>
    </article>
  </main>;
}
