export const metadata = {
    title: '如何识别美国移民骗局？',
    description: '在美华人常见移民骗局汇总，红旗信号识别，如何保护自己不被坑。',
  }
  
  export default function Page() {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 text-white">
        <h1 className="text-3xl font-bold mb-6">如何识别美国移民骗局？</h1>
        <h2 className="text-xl font-semibold mt-8 mb-4">常见骗局红旗</h2>
        <ul className="space-y-3 text-gray-300">
          <li>❌ 承诺"包过"——移民没有包过</li>
          <li>❌ 自称"移民顾问"却做律师的事——非法执业</li>
          <li>❌ 要求全款预付才开始工作</li>
          <li>❌ 不给书面合同</li>
          <li>❌ 今天签才有优惠——制造紧迫感</li>
          <li>❌ 不给你USCIS receipt number</li>
        </ul>
        <h2 className="text-xl font-semibold mt-8 mb-4">如何保护自己</h2>
        <ul className="space-y-3 text-gray-300">
          <li>✅ 只找有Bar号的持牌律师</li>
          <li>✅ 要求书面合同列明所有费用</li>
          <li>✅ 自己在USCIS网站查进度</li>
          <li>✅ 咨询2-3家比价</li>
        </ul>
        <a href="/" className="inline-block mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg">免费咨询 →</a>
      </main>
    )
  }