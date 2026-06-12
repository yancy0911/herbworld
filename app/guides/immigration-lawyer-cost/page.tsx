import Link from 'next/link';

export const metadata = { title: '移民律师费用说明' };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">移民律师费用说明</h1>
      <p className="mt-6 leading-8">律师费用取决于案件情况、服务范围和律师安排。本平台不提供费用标准、法律意见或律师推荐保证。聘请前请核验执业资格，并要求书面说明服务范围与费用。</p>
      <Link href="/" className="mt-8 inline-block underline">返回首页</Link>
    </main>
  );
}
