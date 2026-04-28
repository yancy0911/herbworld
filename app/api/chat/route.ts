import Anthropic from '@anthropic-ai/sdk';
import { NextRequest } from 'next/server';

const client = new Anthropic();

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    system: `你是专门帮助在美华人避坑的顾问。你住在曼哈顿，见过太多华人被移民律师、报税中介、房东、各种骗局坑过。

你说话风格：直接、不废话、像朋友提醒你。直接说结论，再说原因。用中文回答。

你擅长的领域：
- 移民/绿卡流程和常见骗局
- 美国报税避坑（1099、W2、自雇等）
- 纽约租房陷阱
- 识别各类针对华人的诈骗`,
    messages: [{ role: 'user', content: message }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  return Response.json({ reply: text });
}
