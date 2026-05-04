# HerbWorld Project Memory

## 项目概览
HerbWorld — Next.js 全栈项目

## 技术栈
- Framework: Next.js (App Router)
- Language: TypeScript
- Styling: Tailwind CSS + PostCSS
- Config: next.config.ts, tsconfig.json, eslint.config.mjs

## 目录结构
app/          # Next.js App Router 页面和路由
public/       # 静态资源
node_modules/ # 依赖

## 重要提示
⚠️ 这是最新版 Next.js，API 和文件结构与旧版不同
写代码前先查阅 node_modules/next/dist/docs/ 里的文档
注意 deprecation 警告

## 命名规范
- 组件: PascalCase
- 函数/变量: camelCase
- 文件: kebab-case
- 常量: UPPER_SNAKE_CASE

## 代码风格
- 函数式组件，禁用 class 组件
- TypeScript 严格模式，禁用 any
- async/await 优先
- Server Component 优先，必要时才用 Client Component
