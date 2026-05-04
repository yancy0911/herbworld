export const metadata = {
    title: 'H1B被拒怎么办？',
    description: 'H1B签证被拒后的应对方案，RFE回复技巧，替代签证选项。',
  }
  
  export default function Page() {
    return (
      <main className="max-w-3xl mx-auto px-4 py-12 text-white">
        <h1 className="text-3xl font-bold mb-6">H1B被拒怎么办？</h1>
        <h2 className="text-xl font-semibold mt-8 mb-4">被拒后的选项</h2>
        <ul className="space-y-3 text-gray-300">
          <li>✅ 收到RFE：60天内回复，成功率约70%</li>
          <li>✅ 直接拒签：可申请动议复议（MTR）</li>
          <li>✅ 明年重新抽签：每年4月开放</li>
          <li>✅ 转O1签证：杰出人才，不需要抽签</li>
          <li>✅ 转L1签证：跨国公司内部调动</li>
        </ul>
        <h2 className="text-xl font-semibold mt-8 mb-4">RFE常见原因</h2>
        <ul className="space-y-3 text-gray-300">
          <li>❌ 工作岗位不够"专业性"</li>
          <li>❌ 薪资低于prevailing wage</li>
          <li>❌ 学位与工作不匹配</li>
        </ul>
        <a href="/" className="inline-block mt-8 bg-blue-600 text-white px-6 py-3 rounded-lg">免费咨询 →</a>
      </main>
    )
  }