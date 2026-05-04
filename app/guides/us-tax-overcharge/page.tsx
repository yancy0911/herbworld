export const metadata = {
    title: '美国报税被多收费怎么判断？',
    description: '华人报税常见陷阱，合理价格参考，如何判断报税师是否在坑你。',
  }
  
  export default function Page() {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 text-white">
        <h1 className="text-3xl font-bold mb-6">美国报税被多收费怎么判断？</h1>
        <h2 className="text-xl font-semibold mt-8 mb-4">合理报税费用参考</h2>
        <ul className="space-y-3 text-gray-300">
          <li>✅ 简单W2报税：$100 – $300</li>
          <li>✅ 有投资/股票：$300 – $600</li>
          <li>✅ 自雇/小生意：$500 – $1,500</li>
          <li>✅ 有海外账户FBAR：额外$200 – $500</li>
        </ul>
        <h2 className="text-xl font-semibold mt-8 mb-4">常见报税陷阱</h2>
        <ul className="space-y-3 text-gray-300">
          <li>❌ 按退税金额收取百分比——违法行为</li>
          <li>❌ 不给你看报税表就要你签字</li>
          <li>❌ 声称有特殊关系可以多退税</li>
        </ul>
        <a href="/" className="inline-block mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg">免费咨询 →</a>
      </main>
    )
  }