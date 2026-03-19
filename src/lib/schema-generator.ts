/**
 * Schema.org 结构化数据生成器
 * 支持多种Schema类型，用于GEO优化
 */

export type SchemaType = 
  | 'Article'
  | 'LocalBusiness'
  | 'FAQPage'
  | 'Product'
  | 'HowTo'
  | 'Review'
  | 'Person'
  | 'Organization';

export interface SchemaConfig {
  type: SchemaType;
  data: Record<string, any>;
}

/**
 * 生成文章Schema
 * 针对AI引擎优化，包含更多语义化标记
 */
export function generateArticleSchema(data: {
  title: string;
  content: string;
  author?: string;
  publishDate?: string;
  modifiedDate?: string;
  imageUrl?: string;
  publisher?: string;
  keywords?: string[];
  url?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": data.title,
    "articleBody": data.content,
    "wordCount": data.content.split(/\s+/).length,
    "author": data.author ? {
      "@type": "Person",
      "name": data.author
    } : undefined,
    "datePublished": data.publishDate,
    "dateModified": data.modifiedDate || data.publishDate,
    "image": data.imageUrl,
    "publisher": data.publisher ? {
      "@type": "Organization",
      "name": data.publisher,
      "logo": {
        "@type": "ImageObject",
        "url": "https://example.com/logo.png"
      }
    } : undefined,
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": data.url || "https://example.com/article"
    },
    "keywords": data.keywords?.join(', '),
    "inLanguage": "zh-CN",
    // AI引擎特别关注的字段
    "about": {
      "@type": "Thing",
      "name": data.title,
      "description": data.content.substring(0, 200)
    },
    "mentions": data.keywords?.map(keyword => ({
      "@type": "Thing",
      "name": keyword
    }))
  };
}

/**
 * 生成本地商家Schema
 */
export function generateLocalBusinessSchema(data: {
  name: string;
  address: string;
  telephone?: string;
  openingHours?: string;
  latitude?: number;
  longitude?: number;
  priceRange?: string;
  image?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": data.name,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": data.address,
      "addressCountry": "CN"
    },
    "telephone": data.telephone,
    "openingHours": data.openingHours,
    "geo": data.latitude && data.longitude ? {
      "@type": "GeoCoordinates",
      "latitude": data.latitude,
      "longitude": data.longitude
    } : undefined,
    "priceRange": data.priceRange,
    "image": data.image
  };
}

/**
 * 生成FAQ Schema
 */
export function generateFAQSchema(faqs: Array<{
  question: string;
  answer: string;
}>): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map(faq => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };
}

/**
 * 生成产品Schema
 */
export function generateProductSchema(data: {
  name: string;
  description: string;
  brand?: string;
  sku?: string;
  price?: number;
  currency?: string;
  availability?: string;
  imageUrl?: string;
  rating?: {
    value: number;
    count: number;
  };
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": data.name,
    "description": data.description,
    "brand": data.brand ? {
      "@type": "Brand",
      "name": data.brand
    } : undefined,
    "sku": data.sku,
    "offers": data.price ? {
      "@type": "Offer",
      "price": data.price,
      "priceCurrency": data.currency || "CNY",
      "availability": data.availability || "https://schema.org/InStock"
    } : undefined,
    "image": data.imageUrl,
    "aggregateRating": data.rating ? {
      "@type": "AggregateRating",
      "ratingValue": data.rating.value,
      "reviewCount": data.rating.count
    } : undefined
  };
}

/**
 * 生成HowTo Schema（操作指南）
 */
export function generateHowToSchema(data: {
  name: string;
  description: string;
  steps: Array<{
    name: string;
    text: string;
    imageUrl?: string;
  }>;
  totalTime?: string;
  estimatedCost?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": data.name,
    "description": data.description,
    "totalTime": data.totalTime,
    "estimatedCost": data.estimatedCost ? {
      "@type": "MonetaryAmount",
      "text": data.estimatedCost
    } : undefined,
    "step": data.steps.map((step, index) => ({
      "@type": "HowToStep",
      "position": index + 1,
      "name": step.name,
      "text": step.text,
      "image": step.imageUrl
    }))
  };
}

/**
 * 生成评价Schema
 */
export function generateReviewSchema(data: {
  itemReviewed: string;
  itemType: 'Product' | 'LocalBusiness' | 'Organization';
  author: string;
  ratingValue: number;
  reviewBody: string;
  publishDate?: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    "itemReviewed": {
      "@type": data.itemType,
      "name": data.itemReviewed
    },
    "author": {
      "@type": "Person",
      "name": data.author
    },
    "reviewRating": {
      "@type": "Rating",
      "ratingValue": data.ratingValue,
      "bestRating": 5,
      "worstRating": 1
    },
    "reviewBody": data.reviewBody,
    "datePublished": data.publishDate
  };
}

/**
 * 生成人物Schema
 */
export function generatePersonSchema(data: {
  name: string;
  jobTitle?: string;
  organization?: string;
  imageUrl?: string;
  sameAs?: string[];
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": data.name,
    "jobTitle": data.jobTitle,
    "worksFor": data.organization ? {
      "@type": "Organization",
      "name": data.organization
    } : undefined,
    "image": data.imageUrl,
    "sameAs": data.sameAs
  };
}

/**
 * 生成组织Schema
 */
export function generateOrganizationSchema(data: {
  name: string;
  url?: string;
  logo?: string;
  description?: string;
  address?: string;
  telephone?: string;
  sameAs?: string[];
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": data.name,
    "url": data.url,
    "logo": data.logo,
    "description": data.description,
    "address": data.address ? {
      "@type": "PostalAddress",
      "streetAddress": data.address
    } : undefined,
    "telephone": data.telephone,
    "sameAs": data.sameAs
  };
}

/**
 * 将Schema对象转换为JSON-LD字符串
 */
export function toJsonLd(schema: object): string {
  return `<script type="application/ld+json">\n${JSON.stringify(schema, null, 2)}\n</script>`;
}

/**
 * 验证Schema数据完整性
 */
export function validateSchema(schema: object): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  const schemaStr = JSON.stringify(schema);
  
  if (!schemaStr.includes('"@context"')) {
    errors.push('缺少 @context 字段');
  }
  
  if (!schemaStr.includes('"@type"')) {
    errors.push('缺少 @type 字段');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 根据内容类型自动推荐Schema类型
 */
export function recommendSchemaType(content: string): SchemaType[] {
  const recommendations: SchemaType[] = [];
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('如何') || lowerContent.includes('步骤') || lowerContent.includes('教程')) {
    recommendations.push('HowTo');
  }
  
  if (lowerContent.includes('问题') || lowerContent.includes('？') || lowerContent.includes('faq')) {
    recommendations.push('FAQPage');
  }
  
  if (lowerContent.includes('产品') || lowerContent.includes('商品') || lowerContent.includes('价格')) {
    recommendations.push('Product');
  }
  
  if (lowerContent.includes('公司') || lowerContent.includes('企业') || lowerContent.includes('机构')) {
    recommendations.push('Organization');
  }
  
  if (lowerContent.includes('地址') || lowerContent.includes('电话') || lowerContent.includes('营业')) {
    recommendations.push('LocalBusiness');
  }
  
  if (lowerContent.includes('评价') || lowerContent.includes('评论') || lowerContent.includes('评分')) {
    recommendations.push('Review');
  }
  
  // 默认推荐Article
  if (recommendations.length === 0) {
    recommendations.push('Article');
  }
  
  return recommendations;
}
