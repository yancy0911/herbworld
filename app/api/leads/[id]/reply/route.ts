import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';
import { getLeadById } from '@/lib/db';

export const runtime = 'nodejs';

const client = new Anthropic();

const WECHAT_ID = 'Charming-Furry';
const ACCOUNT_NAME = '纽约私人助理';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const lead = await getLeadById(Number(id));

  if (!lead) {
    return Response.json({ error: '线索不存在' }, { status: 404 });
  }

  const isCrossBorder = lead.is_cross_border === 1;

  const context = [
    lead.summary ? `客户需求：${lead.summary}` : '',
    lead.task    ? `任务：${lead.task}`         : '',
    lead.location? `地点：${lead.location}`     : '',
    lead.budget  ? `预算：${lead.budget}`       : '',
    isCrossBorder ? '背景：客户人在中国大陆，无法亲自来纽约' : '',
  ].filter(Boolean).join('\n');

  const crossBorderTone = isCrossBorder ? `
这是一位跨国客户，请用更绅士、更周到的语气，突出：
- 仪式感：精心安排每一个细节，全程拍照记录
- 私密性：仅向执行所必需的人员提供必要信息
- 过程可见：经相关人员同意后，可通过视频、照片或文字同步进度` : '';

  const system = `你是【${ACCOUNT_NAME}】公众号的主理人，长居纽约曼哈顿，专为无法亲临纽约的客户提供高端私人管家服务。
${crossBorderTone}

生成一段微信回复话术，必须包含以下三个要素（自然融入，不要生硬罗列）：

① 身份标注：在开头或结尾自然表明"我是【${ACCOUNT_NAME}】公众号的主理人"
② 公众号引导（原文植入）：您可以关注我的公众号【${ACCOUNT_NAME}】，查看我往期在曼哈顿为客户代办商务、惊喜送礼和实地考察的真实案例，信任第一。
③ 微信引导（原文植入）：细节可以加微信详聊，我的微信号是：${WECHAT_ID}。平台会先审核合法性、可执行性和风险，再确认范围、价格和记录方式。

风格：私人管家口吻，专业有温度，不像广告。字数控制在220字以内，直接输出正文。`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: context }],
  });

  const reply = response.content[0].type === 'text' ? response.content[0].text.trim() : '';
  return Response.json({ reply });
}
