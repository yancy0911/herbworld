import Link from 'next/link';

export const metadata = { title: '移民服务安全提示' };

export default function Page() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold">移民服务安全提示</h1>
      <p className="mt-6 leading-8">不要相信保证批准、伪造材料或规避监管的安排。请自行核验专业人士的执业资格、书面合同和官方收据。怀疑欺诈或需要法律判断时，请联系持牌律师或相关政府机构。</p>
      <Link href="/" className="mt-8 inline-block underline">返回首页</Link>
    </main>
  );
}
