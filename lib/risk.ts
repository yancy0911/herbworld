const BLOCKED_PATTERNS: { pattern: RegExp; reason: string }[] = [
  { pattern: /(洗钱|套现|地下钱庄|逃税|偷税|骗税|规避海关|逃避海关|走私)/i, reason: '涉及金融、税务或海关违法风险' },
  { pattern: /(伪造|假证|假文件|假学历|冒名|冒用身份|代考|替考|代签政府文件)/i, reason: '涉及伪造、冒用身份或欺诈风险' },
  { pattern: /(毒品|违禁药|非法处方药|枪支|弹药|爆炸物|危险品)/i, reason: '涉及违禁品、武器或危险物品' },
  { pattern: /(跟踪|监视|骚扰|报复|偷拍|窃听|定位别人|查开房)/i, reason: '涉及侵犯隐私、骚扰或人身安全风险' },
  { pattern: /(色情|卖淫|嫖娼|赌博|博彩代充|人口贩卖)/i, reason: '涉及违法或受禁止服务' },
  { pattern: /(诈骗|骗保|骗贷|盗刷|盗窃|勒索|敲诈)/i, reason: '涉及欺诈或财产犯罪风险' },
  { pattern: /(非法移民|偷渡|非法打工|规避监管|绕过制裁)/i, reason: '涉及规避监管或移民违法风险' },
  { pattern: /(跨境寄送|跨境运输|国际转运|寄到国外|寄往国外|出口报关|进口报关|代办海关)/i, reason: '第一阶段暂不承接跨境运输、海关或进出口事务' },
];

export function screenRequestRisk(text: string): { blocked: boolean; reason?: string } {
  for (const item of BLOCKED_PATTERNS) {
    if (item.pattern.test(text)) return { blocked: true, reason: item.reason };
  }
  return { blocked: false };
}
