import Link from 'next/link';

export const metadata = { title: '纽约租房押金事项说明' };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">纽约租房押金事项说明</h1>
      <p className="mt-6 leading-8">租房权利、期限和处理方式取决于具体事实与现行法律。本平台不提供法律意见或诉讼结果保证。请保存合同、付款和沟通记录，并向持牌律师或政府住房机构核实。</p>
      <Link href="/" className="mt-8 inline-block underline">返回首页</Link>
    </main>
  );
}
