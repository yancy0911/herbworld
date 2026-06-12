import Link from 'next/link';

export const metadata = { title: 'H-1B事项说明' };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">H-1B事项说明</h1>
      <p className="mt-6 leading-8">移民规则、期限和处理方案会因个案与政策变化而不同。本平台不提供移民法律意见，也不承诺申请结果。请尽快咨询有资格处理该事项的持牌移民律师。</p>
      <Link href="/" className="mt-8 inline-block underline">返回首页</Link>
    </main>
  );
}
