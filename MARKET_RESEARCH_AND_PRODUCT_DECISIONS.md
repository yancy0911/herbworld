# 美国本地事务平台：市场调研与产品决策

更新日期：2026-06-06

## 调研结论

市场需求真实存在，但“任何事、任何地点、任何人都能接”的开放平台不是合理起点。成熟平台都通过缩小任务范围、标准化任务清单、验证服务者、平台内付款、证据交付和争议处理来建立信任。

Herbworld 第一阶段应定位为：

> 美国本地事务执行平台。客户不在现场时，平台负责澄清目标、形成执行清单、书面报价、安排合适人员，并交付可核验结果。纽约优先运营，其他美国城市确认资源后再承接。

## 竞品模式

### Taskrabbit：本地任务市场

- 服务者按类别、地点、时间和价格被客户选择。
- 客户与服务者在平台内沟通，完成后由服务者提交发票。
- 所有付款必须通过平台；绕开平台付款会失去平台保护。
- 美国 Tasker 需身份和犯罪背景审查。
- 平台设有争议处理和有限的保障机制。

适合学习：分类、人员档案、任务聊天、发票、平台内付款、背景审查、争议流程。

### Airtasker：发任务、报价与资金留存

- 客户发布任务，服务者报价，客户选择。
- 客户接受报价后，资金通过 Airtasker Pay 留存，完成后释放。
- 明确禁止现金、礼品卡、转账、违法任务、成人服务、代考和受限制商品。

适合学习：逐单报价、确认后付款、禁止任务清单、完成后放款。

### Thumbtack：专业服务匹配

- 客户按服务和邮编搜索。
- 查看专业人士档案、价格和评价，聊天后选择。
- 更适合已标准化、有专业档案的服务。

适合学习：地区匹配、服务者能力标签、验证评价。

### WeGoLook / Field Agent：结构化现场执行

- 把现场需求拆成精确任务：指定地址、照片、视频、问题和提交时限。
- 平台审核提交内容后才确认完成和付款。
- 普通人员只做事实采集；需要执照的检查由专业人员完成。

适合学习：执行清单、证据要求、现场任务模板、专业服务边界。

### 纽约私人助理公司

- 服务范围、小时费率、最低时长、加急费和额外费用非常清楚。
- 价值是“立即能理解、立即能预约”，但规模通常受城市和团队限制。

适合学习：清晰表达、开始路径、费用组成、客户预期管理。

### 配送与礼赠平台

- 配送平台对违禁品、药物、现金、礼品卡、武器、危险品、酒精和高价值物品有严格限制。
- 礼品业务的标准化程度高，适合作为早期可复制业务。

适合学习：违禁品规则、收件人确认、拒收、损坏、缺货和替代方案。

## 第一阶段业务范围

优先开放：

1. 礼品、鲜花、生活用品的购买与送达
2. 普通取件、寄送、代收和转寄
3. 预约、排队、领取、递交普通材料
4. 公开区域的现场核验、照片和视频记录
5. 合法授权下的陪同、翻译和现场协调

人工审核后开放：

1. 贵重商品采购
2. 住宅内部、商务接待和复杂现场事务
3. 涉及未成年人、老人、病人的陪同
4. 需要垫付较大金额的采购

不开放：

- 违法、欺诈、伪造、冒用身份、规避监管
- 现金、礼品卡、证券、加密货币和代转账
- 武器、危险品、毒品、药物、酒精和受管制商品
- 跟踪、骚扰、偷拍、窃听、擅闯和侵犯隐私
- 成人服务、赌博、代考、虚假评价
- 普通服务者提供法律、税务、医疗、移民或投资意见
- 涉及跨境寄送、海关或进出口要求的事务

## 正确的客户流程

1. 免费提交地点、目标和联系方式
2. 平台审核合法性、风险和可执行性
3. 平台联系客户，形成任务清单和交付要求
4. 书面确认服务费、预计第三方费用、时间和取消规则
5. 确认付款后安排人员；支付功能未上线前仅做人工小范围试运营
6. 服务者按清单执行并上传必要证据
7. 平台审核交付结果，处理异常和争议

## 价格策略

不公布统一价格，但必须公布费用组成：

- 服务者预计投入时间
- 距离、交通、停车和配送
- 加急、非工作时间和等待时间
- 商品采购或第三方费用
- 任务难度、风险和认证要求
- 平台协调与支持费用

网站对客户统一表达：

> 提交需求免费。平台确认范围后提供书面报价；客户确认前不开始执行、不产生服务费。

## 支付与税务决策

- 不允许支付宝、现金或其他方式绕开平台来“避税”。
- 零工收入必须依法申报。
- 正式市场支付应采用 Stripe Connect 或同类 marketplace payment 产品完成身份验证、收款、分账和税务报告。
- 支付上线前不得宣传资金托管、退款保障或平台保险。

## 安全与合规硬门槛

- 服务者身份验证和按风险分级的背景审查
- 书面任务协议和按单付款记录
- 纽约自由职业者书面合同与及时付款要求
- 任务举报、拒绝、暂停、换人和申诉流程
- 数据最小化、访问控制、保留期限和泄露响应
- 真实订单评价，不发布虚假或选择性评价
- 涉及专业服务时验证执照

## App 决策

App Store 允许使用信用卡或 Apple Pay 支付线下消费的实体商品和服务，不需要使用 Apple 内购。App 上架前必须：

- 功能完整，不是空壳或测试版
- 有账户删除、隐私政策、举报和客服入口
- 有真实任务状态、聊天、服务者档案和安全机制
- 准确描述功能，不能宣传尚未具备的全美即时匹配或保障

## 参考来源

- Taskrabbit Trust & Safety: https://support.taskrabbit.com/hc/en-us/articles/207813543-Overview-of-Trust-and-Safety
- Taskrabbit Payments: https://support.taskrabbit.com/hc/en-us/articles/204411560-How-Do-I-Pay-My-Tasker
- Airtasker Pay: https://support.airtasker.com/hc/en-au/articles/21321295524121-What-is-Airtasker-Pay
- Airtasker Posting Guidelines: https://support.airtasker.com/hc/en-au/articles/225001588-What-are-the-posting-guidelines
- Thumbtack How It Works: https://www.thumbtack.com/how-it-works
- WeGoLook: https://www.wegolook.com/
- Field Agent Jobs: https://support.fieldagent.net/hc/en-us/articles/227602588-About-Jobs-What-to-Expect
- Apple App Review Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Stripe Connect: https://docs.stripe.com/connect
- IRS Gig Economy Tax Center: https://www.irs.gov/businesses/gig-economy-tax-center
- NYC Freelance Isn't Free Act: https://www.nyc.gov/site/dca/about/freelance-isnt-free-act.page
- New York SHIELD Act: https://ag.ny.gov/resources/organizations/data-breach-reporting/shield-act
- FTC Online Marketplace Advice: https://consumer.ftc.gov/buying-online-marketplace
