import Link from 'next/link';

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-[#f7f7f4] text-[#151515] flex flex-col">
      <header className="p-6 border-b border-[#d8d6cf]">
        <h1 className="text-2xl font-semibold">事务信息已收到</h1>
        <p className="text-[#5f5d56] text-sm mt-1">下一步将根据具体要求沟通执行方式和价格。</p>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md border border-[#cfccc2] bg-white p-6 text-center">
          <div className="text-sm text-[#3f3b34] leading-7">
            请添加微信 Charming-Furry，并发送事务内容、地点和时间要求。价格会根据实际时间、难易程度和交付要求商议。
          </div>

          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center px-4 py-3 text-sm font-semibold text-white bg-[#151515] hover:bg-[#38352f] transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}
