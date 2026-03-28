/**
 * 选择器生成器
 * 
 * 根据DOM元素自动生成最优选择器
 * 支持多种选择器策略，按优先级排序
 */

export interface GeneratedSelector {
  selector: string;
  type: SelectorType;
  priority: number;
  description: string;
  uniqueness: number; // 0-1，唯一性得分
}

export type SelectorType = 
  | 'id'
  | 'name'
  | 'data-attr'
  | 'aria'
  | 'class'
  | 'attribute'
  | 'tag-class'
  | 'path';

export interface ElementInfo {
  tagName: string;
  id?: string;
  name?: string;
  className?: string;
  type?: string;
  placeholder?: string;
  value?: string;
  text?: string;
  href?: string;
  src?: string;
  dataAttributes: Record<string, string>;
  ariaAttributes: Record<string, string>;
  path: string;
  parent?: ElementInfo;
}

/**
 * 选择器策略配置
 */
const SELECTOR_STRATEGIES = [
  { type: 'id' as SelectorType, priority: 1, description: 'ID选择器' },
  { type: 'data-attr' as SelectorType, priority: 2, description: 'data属性选择器' },
  { type: 'aria' as SelectorType, priority: 3, description: 'ARIA属性选择器' },
  { type: 'name' as SelectorType, priority: 4, description: 'name属性选择器' },
  { type: 'attribute' as SelectorType, priority: 5, description: '属性选择器' },
  { type: 'tag-class' as SelectorType, priority: 6, description: '标签+class选择器' },
  { type: 'class' as SelectorType, priority: 7, description: 'class选择器' },
  { type: 'path' as SelectorType, priority: 8, description: '路径选择器' },
];

/**
 * 从元素信息生成所有可能的选择器
 */
export function generateSelectors(elementInfo: ElementInfo): GeneratedSelector[] {
  const selectors: GeneratedSelector[] = [];

  // 1. ID选择器（最优）
  if (elementInfo.id) {
    selectors.push({
      selector: `#${escapeSelector(elementInfo.id)}`,
      type: 'id',
      priority: 1,
      description: `ID: ${elementInfo.id}`,
      uniqueness: 1.0,
    });
  }

  // 2. data属性选择器（常用于E2E测试）
  const dataSelectors = generateDataAttributeSelectors(elementInfo);
  selectors.push(...dataSelectors);

  // 3. ARIA属性选择器
  const ariaSelectors = generateAriaSelectors(elementInfo);
  selectors.push(...ariaSelectors);

  // 4. name属性选择器
  if (elementInfo.name) {
    selectors.push({
      selector: `${elementInfo.tagName.toLowerCase()}[name="${escapeSelector(elementInfo.name)}"]`,
      type: 'name',
      priority: 4,
      description: `name: ${elementInfo.name}`,
      uniqueness: 0.9,
    });
  }

  // 5. 属性选择器（placeholder, type, href, src等）
  const attrSelectors = generateAttributeSelectors(elementInfo);
  selectors.push(...attrSelectors);

  // 6. 标签+class组合选择器
  const tagClassSelectors = generateTagClassSelectors(elementInfo);
  selectors.push(...tagClassSelectors);

  // 7. 纯class选择器（唯一class）
  const classSelectors = generateClassSelectors(elementInfo);
  selectors.push(...classSelectors);

  // 8. 路径选择器（兜底方案）
  if (elementInfo.path) {
    selectors.push({
      selector: elementInfo.path,
      type: 'path',
      priority: 8,
      description: 'DOM路径',
      uniqueness: 0.5,
    });
  }

  // 按优先级排序
  return selectors.sort((a, b) => a.priority - b.priority);
}

/**
 * 生成 data 属性选择器
 */
function generateDataAttributeSelectors(elementInfo: ElementInfo): GeneratedSelector[] {
  const selectors: GeneratedSelector[] = [];
  
  // 优先使用 test-id, e2e, cy 等测试相关属性
  const testAttrs = ['data-testid', 'data-test-id', 'data-e2e', 'data-cy', 'data-automation-id'];
  
  for (const attr of testAttrs) {
    const value = elementInfo.dataAttributes[attr];
    if (value) {
      selectors.push({
        selector: `[${attr}="${escapeSelector(value)}"]`,
        type: 'data-attr',
        priority: 2,
        description: `${attr}: ${value}`,
        uniqueness: 0.98,
      });
    }
  }

  // 其他 data 属性
  for (const [attr, value] of Object.entries(elementInfo.dataAttributes)) {
    if (!testAttrs.includes(attr) && value) {
      selectors.push({
        selector: `[${attr}="${escapeSelector(value)}"]`,
        type: 'data-attr',
        priority: 2,
        description: `${attr}: ${value}`,
        uniqueness: 0.85,
      });
    }
  }

  return selectors;
}

/**
 * 生成 ARIA 属性选择器
 */
function generateAriaSelectors(elementInfo: ElementInfo): GeneratedSelector[] {
  const selectors: GeneratedSelector[] = [];
  
  // 常用的 ARIA 属性
  const ariaAttrs = ['aria-label', 'aria-labelledby', 'aria-describedby', 'role'];
  
  for (const attr of ariaAttrs) {
    const value = elementInfo.ariaAttributes[attr];
    if (value) {
      selectors.push({
        selector: `[${attr}="${escapeSelector(value)}"]`,
        type: 'aria',
        priority: 3,
        description: `${attr}: ${value.substring(0, 30)}${value.length > 30 ? '...' : ''}`,
        uniqueness: 0.9,
      });
    }
  }

  return selectors;
}

/**
 * 生成属性选择器
 */
function generateAttributeSelectors(elementInfo: ElementInfo): GeneratedSelector[] {
  const selectors: GeneratedSelector[] = [];
  const tag = elementInfo.tagName.toLowerCase();

  // placeholder 属性
  if (elementInfo.placeholder) {
    const placeholder = elementInfo.placeholder;
    
    // 完全匹配
    selectors.push({
      selector: `${tag}[placeholder="${escapeSelector(placeholder)}"]`,
      type: 'attribute',
      priority: 5,
      description: `placeholder: ${placeholder.substring(0, 20)}...`,
      uniqueness: 0.85,
    });

    // 包含匹配（针对动态文本）
    if (placeholder.length > 4) {
      const keywords = extractKeywords(placeholder);
      for (const keyword of keywords) {
        selectors.push({
          selector: `${tag}[placeholder*="${escapeSelector(keyword)}"]`,
          type: 'attribute',
          priority: 5,
          description: `placeholder包含: ${keyword}`,
          uniqueness: 0.75,
        });
      }
    }
  }

  // type 属性
  if (elementInfo.type) {
    selectors.push({
      selector: `${tag}[type="${escapeSelector(elementInfo.type)}"]`,
      type: 'attribute',
      priority: 5,
      description: `type: ${elementInfo.type}`,
      uniqueness: 0.6,
    });
  }

  // href 属性（链接）
  if (elementInfo.href && tag === 'a') {
    // 提取路径关键词
    try {
      const url = new URL(elementInfo.href, window.location.origin);
      if (url.pathname && url.pathname !== '/') {
        selectors.push({
          selector: `a[href*="${escapeSelector(url.pathname)}"]`,
          type: 'attribute',
          priority: 5,
          description: `链接包含: ${url.pathname}`,
          uniqueness: 0.8,
        });
      }
    } catch {
      // 忽略无效URL
    }
  }

  // src 属性（图片、脚本等）
  if (elementInfo.src && ['img', 'script', 'iframe'].includes(tag)) {
    const filename = elementInfo.src.split('/').pop()?.split('?')[0];
    if (filename && filename.length > 2) {
      selectors.push({
        selector: `${tag}[src*="${escapeSelector(filename)}"]`,
        type: 'attribute',
        priority: 5,
        description: `src包含: ${filename}`,
        uniqueness: 0.75,
      });
    }
  }

  return selectors;
}

/**
 * 生成标签+class组合选择器
 */
function generateTagClassSelectors(elementInfo: ElementInfo): GeneratedSelector[] {
  const selectors: GeneratedSelector[] = [];
  const tag = elementInfo.tagName.toLowerCase();

  if (!elementInfo.className) return selectors;

  const classes = elementInfo.className.split(/\s+/).filter(c => c.length > 0);
  
  // 过滤掉通用的、动态的class
  const meaningfulClasses = classes.filter(c => {
    // 排除动态生成的class（如随机字符串）
    if (/^[a-z]{1,2}$/.test(c)) return false;
    if (/^[a-z]+-\d+$/.test(c)) return false;
    if (/^css-[a-z0-9]+$/.test(c)) return false;
    if (/^_[a-z0-9]+$/.test(c)) return false;
    if (/^sc-[a-z]+$/.test(c)) return false; // styled-components
    if (/^jss\d+$/.test(c)) return false; // JSS
    return true;
  });

  // 单个有意义的class
  for (const cls of meaningfulClasses.slice(0, 3)) {
    selectors.push({
      selector: `${tag}.${escapeSelector(cls)}`,
      type: 'tag-class',
      priority: 6,
      description: `标签+class: ${cls}`,
      uniqueness: 0.7,
    });
  }

  // 组合class（取前两个有意义的）
  if (meaningfulClasses.length >= 2) {
    const combined = meaningfulClasses.slice(0, 2).map(c => `.${escapeSelector(c)}`).join('');
    selectors.push({
      selector: `${tag}${combined}`,
      type: 'tag-class',
      priority: 6,
      description: `组合class`,
      uniqueness: 0.8,
    });
  }

  return selectors;
}

/**
 * 生成纯class选择器
 */
function generateClassSelectors(elementInfo: ElementInfo): GeneratedSelector[] {
  const selectors: GeneratedSelector[] = [];

  if (!elementInfo.className) return selectors;

  const classes = elementInfo.className.split(/\s+/).filter(c => c.length > 2);
  
  for (const cls of classes.slice(0, 2)) {
    // 只使用看起来有意义的class
    if (cls.length > 3 && !/^css-|^_/.test(cls)) {
      selectors.push({
        selector: `.${escapeSelector(cls)}`,
        type: 'class',
        priority: 7,
        description: `class: ${cls}`,
        uniqueness: 0.6,
      });
    }
  }

  return selectors;
}

/**
 * 从文本中提取关键词
 */
function extractKeywords(text: string): string[] {
  // 移除标点符号
  const cleaned = text.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
  
  // 分词
  const words = cleaned.split(/\s+/).filter(w => w.length >= 2);
  
  // 返回最长的几个词
  return words.sort((a, b) => b.length - a.length).slice(0, 3);
}

/**
 * 转义CSS选择器中的特殊字符
 */
function escapeSelector(selector: string): string {
  // CSS选择器特殊字符: !"#$%&'()*+,-./:;<=>?@[\]^`{|}~
  return selector.replace(/([!"#$%&'()*+,-./:;<=>?@\\\[\]^`{|}~])/g, '\\$1');
}

/**
 * 从DOM元素提取信息
 * 用于在浏览器环境中运行
 */
export function extractElementInfo(element: Element): ElementInfo {
  const htmlElement = element as HTMLElement;
  
  // 提取 data 属性
  const dataAttributes: Record<string, string> = {};
  for (const attr of element.attributes) {
    if (attr.name.startsWith('data-')) {
      dataAttributes[attr.name] = attr.value;
    }
  }

  // 提取 ARIA 属性
  const ariaAttributes: Record<string, string> = {};
  for (const attr of element.attributes) {
    if (attr.name.startsWith('aria-') || attr.name === 'role') {
      ariaAttributes[attr.name] = attr.value;
    }
  }

  // 计算 CSS 路径
  const path = calculateCSSPath(element);

  // 获取父元素信息
  let parent: ElementInfo | undefined;
  if (element.parentElement && element.parentElement !== document.body) {
    parent = extractElementInfo(element.parentElement);
  }

  return {
    tagName: element.tagName,
    id: element.id || undefined,
    name: element.getAttribute('name') || undefined,
    className: element.className && typeof element.className === 'string' ? element.className : undefined,
    type: element.getAttribute('type') || undefined,
    placeholder: element.getAttribute('placeholder') || undefined,
    value: (htmlElement as HTMLInputElement).value || undefined,
    text: element.textContent?.trim().substring(0, 100) || undefined,
    href: element.getAttribute('href') || undefined,
    src: element.getAttribute('src') || undefined,
    dataAttributes,
    ariaAttributes,
    path,
    parent,
  };
}

/**
 * 计算 CSS 路径
 */
function calculateCSSPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== (document as any).body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${current.id}`;
      parts.unshift(selector);
      break;
    }

    // 添加 nth-child
    const parentEl: Element | null = current.parentElement;
    if (parentEl) {
      const siblings: Element[] = Array.from(parentEl.children).filter(
        (c: Element) => c.tagName === current!.tagName
      );
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    parts.unshift(selector);
    current = parentEl;
  }

  return parts.join(' > ');
}

/**
 * 验证选择器唯一性
 */
export function validateSelector(selector: string): {
  isValid: boolean;
  count: number;
  uniqueness: number;
} {
  try {
    const elements = document.querySelectorAll(selector);
    const count = elements.length;
    const uniqueness = count === 1 ? 1.0 : count === 0 ? 0 : 1 / count;
    
    return {
      isValid: count > 0,
      count,
      uniqueness,
    };
  } catch {
    return {
      isValid: false,
      count: 0,
      uniqueness: 0,
    };
  }
}

/**
 * 获取最优选择器
 */
export function getBestSelector(elementInfo: ElementInfo): GeneratedSelector | null {
  const selectors = generateSelectors(elementInfo);
  
  // 返回优先级最高的选择器
  return selectors[0] || null;
}
