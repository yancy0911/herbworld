import Link from 'next/link';

export const metadata = { title: '美国报税服务安全提示' };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">美国报税服务安全提示</h1>
      <p className="mt-6 leading-8">税务处理和收费取决于个人情况、申报范围和专业人士安排。本平台不提供税务意见，也不协助隐瞒收入或规避税务义务。请核验报税人员资格，并在签字前审阅申报内容。</p>
      <Link href="/" className="mt-8 inline-block underline">返回首页</Link>
    </main>
  );
}
