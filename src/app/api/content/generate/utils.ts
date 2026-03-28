/**
 * 内容生成工具函数
 */

import { type GenerationConfig } from '@/lib/types/generation-config';
import { type ArticleType } from '@/lib/content-generation';

// 文章类型映射
// what: 什么是 -> faq (常见问题，解释"什么是XX")
// how: 如何 -> guide (实操指南，解释"如何XX")
// top: TOP排行 -> product-review (产品评测)
// normal: 常规 -> auto (AI自动判断最合适的类型)
export const articleTypeMap: Record<string, ArticleType> = {
  'what': 'faq',
  'how': 'guide',
  'top': 'product-review',
  'normal': 'auto',
};

// 篇幅映射
export const articleSizeMap: Record<string, 'short' | 'medium' | 'long'> = {
  'short': 'short',
  'medium': 'medium',
  'long': 'long',
};

// 根据分布随机选择文章类型
export function selectArticleType(
  distribution: GenerationConfig['articleTypeDistribution']
): keyof typeof articleTypeMap {
  const types: Array<keyof typeof articleTypeMap> = ['what', 'how', 'top', 'normal'];
  const weights = [distribution.what, distribution.how, distribution.top, distribution.normal];
  
  // 过滤掉权重为0的类型
  const validTypes: Array<keyof typeof articleTypeMap> = [];
  const validWeights: number[] = [];
  
  types.forEach((type, index) => {
    if (weights[index] > 0) {
      validTypes.push(type);
      validWeights.push(weights[index]);
    }
  });
  
  if (validTypes.length === 0) {
    return 'normal';
  }
  
  if (validTypes.length === 1) {
    return validTypes[0];
  }
  
  const totalWeight = validWeights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (let i = 0; i < validTypes.length; i++) {
    random -= validWeights[i];
    if (random <= 0) {
      return validTypes[i];
    }
  }
  
  return validTypes[validTypes.length - 1];
}
