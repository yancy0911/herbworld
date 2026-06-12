import { createHash, createHmac, randomInt } from 'node:crypto';
import { NextRequest } from 'next/server';
import { allowSubmission } from '@/lib/db';

export const ITEM_CATEGORIES = ['家具', '家居用品', '小型电器', '书籍', '搬家用品', '其他'] as const;
export const SERVICE_TYPES = ['家具搬运与本地配送', '搬家后清洁', '家具组装', '无人领取物品清走'] as const;
export const POLICY_VERSION = '2026-06-12';
export const HANDOFF_CODE_TTL_HOURS = 72;

const prohibitedItemPattern = /(食品|食物|饮料|酒|烟草|电子烟|药|保健品|化妆品|武器|枪|刀具|弹药|烟花|危险品|化学品|燃料|电池组|召回|安全座椅|婴儿床|摇篮|头盔|救生衣|医疗器械|身份证|护照|票券|food|drink|medicine|weapon|firearm|ammunition|chemical|recalled|car seat|crib|helmet)/i;
const publicContactPattern = /(?:[\w.+-]+@[\w.-]+\.[a-z]{2,}|\+?\d[\d\s().-]{7,}\d|微信|wechat|电话|手机|联系我|加我)/i;
const exactAddressPattern = /(?:^|\s)\d{1,6}\s+(?:[A-Za-z0-9.-]+\s+){1,5}(?:st(?:reet)?|ave(?:nue)?|rd|road|blvd|boulevard|dr(?:ive)?|ln|lane|ct|court|pl|place|way)\b/i;

export function clean(value: unknown, max: number) {
  return String(value ?? '').trim().slice(0, max);
}

export function itemSafetyError(text: string) {
  return prohibitedItemPattern.test(text)
    ? '试点暂不接受食品、药品、危险品、召回品或其他高风险物品'
    : null;
}

export function publicInfoError(text: string) {
  return publicContactPattern.test(text) || exactAddressPattern.test(text)
    ? '公开物品信息中请勿填写联系方式或完整门牌地址'
    : null;
}

export async function rateLimit(req: NextRequest, scope: string, limit: number) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const source = `${scope}:${forwardedFor || req.headers.get('x-real-ip') || 'unknown'}`;
  const sourceKey = createHash('sha256').update(source).digest('hex');
  return allowSubmission(sourceKey, limit);
}

export function noStoreJson(data: unknown, init?: ResponseInit) {
  return Response.json(data, {
    ...init,
    headers: { 'Cache-Control': 'no-store', ...(init?.headers ?? {}) },
  });
}

export function generateHandoffCode() {
  return String(randomInt(100000, 1000000));
}

function secret(name: 'HANDOFF_CODE_SECRET' | 'COMMUNITY_ID_SECRET') {
  const value = process.env[name] || process.env.OPS_KEY;
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function publisherKey(contact: string) {
  return createHmac('sha256', secret('COMMUNITY_ID_SECRET'))
    .update(contact.trim().toLowerCase())
    .digest('hex')
    .slice(0, 24);
}

export function hashHandoffCode(claimId: number, code: string) {
  return createHash('sha256').update(`${claimId}:${code}:${secret('HANDOFF_CODE_SECRET')}`).digest('hex');
}
