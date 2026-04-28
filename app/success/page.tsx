import Link from 'next/link';

export default function SuccessPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Payment Successful</h1>
        <p className="text-gray-400 text-sm mt-1">付款成功，你的 Pro 权限已开通。</p>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-gray-900/40 border border-gray-800 rounded-2xl p-6 text-center">
          <div className="text-sm text-gray-300 leading-relaxed">
            你现在可以继续使用全部功能。
          </div>

          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </main>
  );
}

