/**
 * 选择器捕获器 - Electron 预加载脚本
 * 
 * 注入到目标页面，实现：
 * 1. 高亮显示鼠标悬停的元素
 * 2. 捕获用户点击的元素
 * 3. 生成最优选择器
 * 4. 通过 IPC 返回给主进程
 * 
 * 快捷键：
 * - Shift + 点击：正常导航（不捕获选择器），用于跨页面选择场景
 * - Esc：取消选择
 */

import { contextBridge, ipcRenderer } from 'electron';

// 高亮覆盖层
let highlightOverlay: HTMLElement | null = null;
let highlightLabel: HTMLElement | null = null;
let hintBar: HTMLElement | null = null;
let isActive = false;
let isShiftPressed = false;

/**
 * 创建高亮覆盖层
 */
function createHighlightOverlay() {
  if (highlightOverlay) return;

  // 主高亮层
  highlightOverlay = document.createElement('div');
  highlightOverlay.id = 'selector-picker-highlight';
  highlightOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    border: 2px solid #3b82f6;
    background: rgba(59, 130, 246, 0.1);
    border-radius: 4px;
    transition: all 0.05s ease-out;
    display: none;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.5);
  `;
  document.body.appendChild(highlightOverlay);

  // 标签显示层
  highlightLabel = document.createElement('div');
  highlightLabel.id = 'selector-picker-label';
  highlightLabel.style.cssText = `
    position: fixed;
    pointer-events: none;
    z-index: 2147483647;
    background: #3b82f6;
    color: white;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    white-space: nowrap;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    display: none;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  `;
  document.body.appendChild(highlightLabel);

  // 提示条
  hintBar = document.createElement('div');
  hintBar.id = 'selector-picker-hint';
  hintBar.style.cssText = `
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 2147483647;
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 10px 20px;
    border-radius: 8px;
    font-size: 13px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: flex;
    align-items: center;
    gap: 16px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    pointer-events: none;
  `;
  hintBar.innerHTML = `
    <span style="display: flex; align-items: center; gap: 6px;">
      <kbd style="background: #3b82f6; padding: 2px 8px; border-radius: 4px; font-weight: 500;">点击</kbd>
      选择元素
    </span>
    <span style="color: #888;">|</span>
    <span style="display: flex; align-items: center; gap: 6px;">
      <kbd style="background: #f59e0b; padding: 2px 8px; border-radius: 4px; font-weight: 500;">Shift + 点击</kbd>
      正常导航
    </span>
    <span style="color: #888;">|</span>
    <span style="display: flex; align-items: center; gap: 6px;">
      <kbd style="background: #ef4444; padding: 2px 8px; border-radius: 4px; font-weight: 500;">Esc</kbd>
      取消
    </span>
  `;
  document.body.appendChild(hintBar);
}

/**
 * 移除高亮覆盖层
 */
function removeHighlightOverlay() {
  if (highlightOverlay) {
    highlightOverlay.remove();
    highlightOverlay = null;
  }
  if (highlightLabel) {
    highlightLabel.remove();
    highlightLabel = null;
  }
  if (hintBar) {
    hintBar.remove();
    hintBar = null;
  }
}

/**
 * 更新高亮位置
 * 使用 position: fixed，所以不需要加 scrollY/scrollX
 */
function updateHighlight(element: Element) {
  if (!highlightOverlay || !highlightLabel) return;

  const rect = element.getBoundingClientRect();
  
  // 检查元素是否在视口内
  if (rect.width === 0 || rect.height === 0) {
    hideHighlight();
    return;
  }
  
  // 根据是否按住 Shift 设置不同颜色
  const borderColor = isShiftPressed ? '#f59e0b' : '#3b82f6';
  const bgColor = isShiftPressed ? 'rgba(245, 158, 11, 0.1)' : 'rgba(59, 130, 246, 0.1)';
  const labelBgColor = isShiftPressed ? '#f59e0b' : '#3b82f6';
  
  // 更新高亮框位置（fixed 定位，直接使用 rect 值）
  highlightOverlay.style.display = 'block';
  highlightOverlay.style.top = `${rect.top}px`;
  highlightOverlay.style.left = `${rect.left}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  highlightOverlay.style.borderColor = borderColor;
  highlightOverlay.style.background = bgColor;

  // 更新标签位置和内容
  const tagName = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : '';
  const classes = element.className && typeof element.className === 'string' 
    ? `.${element.className.split(/\s+/).filter(c => c).slice(0, 2).join('.')}` 
    : '';
  
  // 标签显示：Shift 模式显示"导航模式"
  highlightLabel.textContent = isShiftPressed 
    ? `🔗 导航模式: ${tagName}${id}${classes}` 
    : `${tagName}${id}${classes}`;
  highlightLabel.style.display = 'block';
  highlightLabel.style.background = labelBgColor;
  
  // 智能定位标签，避免超出视口
  let labelTop = rect.top - 28;
  let labelLeft = rect.left;
  
  // 如果标签会超出顶部，放到元素下方
  if (labelTop < 0) {
    labelTop = rect.bottom + 4;
  }
  
  // 如果标签会超出右边，右对齐
  const labelWidth = highlightLabel.offsetWidth || 100;
  if (labelLeft + labelWidth > window.innerWidth) {
    labelLeft = window.innerWidth - labelWidth - 8;
  }
  
  // 确保不会超出左边
  if (labelLeft < 0) {
    labelLeft = 4;
  }
  
  highlightLabel.style.top = `${labelTop}px`;
  highlightLabel.style.left = `${labelLeft}px`;
}

/**
 * 隐藏高亮
 */
function hideHighlight() {
  if (highlightOverlay) {
    highlightOverlay.style.display = 'none';
  }
  if (highlightLabel) {
    highlightLabel.style.display = 'none';
  }
}

/**
 * 获取鼠标位置下真实的元素
 * 处理被遮挡的情况
 */
function getElementAtPoint(x: number, y: number): Element | null {
  // 临时隐藏高亮层
  if (highlightOverlay) highlightOverlay.style.display = 'none';
  if (highlightLabel) highlightLabel.style.display = 'none';
  
  // 获取鼠标位置下的元素
  let element = document.elementFromPoint(x, y);
  
  // 如果是 body 或 html，返回 null
  if (element && (element.tagName === 'BODY' || element.tagName === 'HTML')) {
    element = null;
  }
  
  // 恢复高亮层
  if (element && highlightOverlay) {
    highlightOverlay.style.display = 'block';
  }
  if (element && highlightLabel) {
    highlightLabel.style.display = 'block';
  }
  
  return element;
}

/**
 * 深度获取元素（支持 shadow DOM）
 */
function getDeepElementAtPoint(x: number, y: number): Element | null {
  // 临时隐藏高亮层
  if (highlightOverlay) highlightOverlay.style.display = 'none';
  if (highlightLabel) highlightLabel.style.display = 'none';
  
  let element: Element | null = null;
  
  try {
    element = document.elementFromPoint(x, y);
    
    // 遍历 shadow DOM
    let current = element;
    while (current && (current as any).shadowRoot) {
      const shadowRoot = (current as any).shadowRoot;
      const shadowElement = shadowRoot.elementFromPoint(x, y);
      if (shadowElement && shadowElement !== current) {
        element = shadowElement;
        current = shadowElement;
      } else {
        break;
      }
    }
  } catch (e) {
    console.warn('[SelectorPicker] Error getting element:', e);
  }
  
  // 恢复高亮层
  if (highlightOverlay) highlightOverlay.style.display = 'block';
  if (highlightLabel) highlightLabel.style.display = 'block';
  
  return element;
}

/**
 * 从DOM元素提取信息
 */
function extractElementInfo(element: Element) {
  // 提取 data 属性
  const dataAttributes: Record<string, string> = {};
  const attrs = element.attributes;
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (attr.name.startsWith('data-')) {
      dataAttributes[attr.name] = attr.value;
    }
  }

  // 提取 ARIA 属性
  const ariaAttributes: Record<string, string> = {};
  for (let i = 0; i < attrs.length; i++) {
    const attr = attrs[i];
    if (attr.name.startsWith('aria-') || attr.name === 'role') {
      ariaAttributes[attr.name] = attr.value;
    }
  }

  return {
    tagName: element.tagName,
    id: element.id || undefined,
    name: element.getAttribute('name') || undefined,
    className: element.className && typeof element.className === 'string' ? element.className : undefined,
    type: element.getAttribute('type') || undefined,
    placeholder: element.getAttribute('placeholder') || undefined,
    value: (element as HTMLInputElement).value || undefined,
    text: element.textContent?.trim().substring(0, 100) || undefined,
    href: element.getAttribute('href') || undefined,
    src: element.getAttribute('src') || undefined,
    dataAttributes,
    ariaAttributes,
    path: calculateCSSPath(element),
  };
}

/**
 * 计算 CSS 路径
 */
function calculateCSSPath(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current && current !== document.body && current !== document.documentElement) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector = `#${CSS.escape(current.id)}`;
      parts.unshift(selector);
      break;
    }

    // 添加 nth-child
    const parent: HTMLElement | null = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter((c) => (c as Element).tagName === current!.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    parts.unshift(selector);
    current = parent;
  }

  return parts.join(' > ');
}

/**
 * 生成选择器列表
 */
function generateSelectors(elementInfo: ReturnType<typeof extractElementInfo>) {
  const selectors: Array<{
    selector: string;
    type: string;
    priority: number;
    description: string;
    uniqueness: number;
  }> = [];

  const tag = elementInfo.tagName.toLowerCase();

  // 1. ID选择器
  if (elementInfo.id) {
    selectors.push({
      selector: `#${CSS.escape(elementInfo.id)}`,
      type: 'id',
      priority: 1,
      description: `ID: ${elementInfo.id}`,
      uniqueness: 1.0,
    });
  }

  // 2. data 属性选择器（测试相关）
  const testAttrs = ['data-testid', 'data-test-id', 'data-e2e', 'data-cy'];
  for (const attr of testAttrs) {
    const value = elementInfo.dataAttributes[attr];
    if (value) {
      selectors.push({
        selector: `[${attr}="${CSS.escape(value)}"]`,
        type: 'data-attr',
        priority: 2,
        description: `${attr}: ${value}`,
        uniqueness: 0.98,
      });
    }
  }

  // 3. 其他 data 属性
  for (const [attr, value] of Object.entries(elementInfo.dataAttributes)) {
    if (!testAttrs.includes(attr) && value) {
      selectors.push({
        selector: `[${attr}="${CSS.escape(value)}"]`,
        type: 'data-attr',
        priority: 3,
        description: `${attr}: ${value.substring(0, 30)}`,
        uniqueness: 0.85,
      });
    }
  }

  // 4. name 属性
  if (elementInfo.name) {
    selectors.push({
      selector: `${tag}[name="${CSS.escape(elementInfo.name)}"]`,
      type: 'name',
      priority: 4,
      description: `name: ${elementInfo.name}`,
      uniqueness: 0.9,
    });
  }

  // 5. placeholder 属性
  if (elementInfo.placeholder) {
    selectors.push({
      selector: `${tag}[placeholder="${CSS.escape(elementInfo.placeholder)}"]`,
      type: 'attribute',
      priority: 5,
      description: `placeholder: ${elementInfo.placeholder.substring(0, 30)}`,
      uniqueness: 0.85,
    });

    // 包含匹配
    if (elementInfo.placeholder.length > 4) {
      const keywords = elementInfo.placeholder.split(/\s+/).filter(w => w.length >= 2);
      for (const keyword of keywords.slice(0, 2)) {
        selectors.push({
          selector: `${tag}[placeholder*="${CSS.escape(keyword)}"]`,
          type: 'attribute',
          priority: 5,
          description: `placeholder包含: ${keyword}`,
          uniqueness: 0.75,
        });
      }
    }
  }

  // 6. type 属性（对于 input）
  if (elementInfo.type && tag === 'input') {
    selectors.push({
      selector: `${tag}[type="${CSS.escape(elementInfo.type)}"]`,
      type: 'attribute',
      priority: 5,
      description: `type: ${elementInfo.type}`,
      uniqueness: 0.6,
    });
  }

  // 7. class 选择器
  if (elementInfo.className) {
    const classes = elementInfo.className.split(/\s+/).filter(c => c.length > 2);
    const meaningfulClasses = classes.filter(c => {
      if (/^[a-z]{1,2}$/.test(c)) return false;
      if (/^css-|^_|^sc-|^jss|^css-/.test(c)) return false;
      if (/^\d/.test(c)) return false; // 以数字开头的
      return true;
    });

    for (const cls of meaningfulClasses.slice(0, 3)) {
      selectors.push({
        selector: `${tag}.${CSS.escape(cls)}`,
        type: 'tag-class',
        priority: 6,
        description: `class: ${cls}`,
        uniqueness: 0.7,
      });
    }
    
    // 组合多个 class
    if (meaningfulClasses.length >= 2) {
      const combined = meaningfulClasses.slice(0, 2).map(c => CSS.escape(c)).join('.');
      selectors.push({
        selector: `${tag}.${combined}`,
        type: 'tag-class',
        priority: 6,
        description: `组合class`,
        uniqueness: 0.8,
      });
    }
  }

  // 8. 路径选择器
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
 * 验证选择器
 */
function validateSelector(selector: string) {
  try {
    const elements = document.querySelectorAll(selector);
    return {
      isValid: elements.length > 0,
      count: elements.length,
      uniqueness: elements.length === 1 ? 1.0 : elements.length === 0 ? 0 : 1 / elements.length,
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
 * 鼠标移动处理
 */
function handleMouseMove(event: MouseEvent) {
  if (!isActive) return;

  // 使用 elementFromPoint 获取真实元素
  const element = getDeepElementAtPoint(event.clientX, event.clientY);
  
  if (!element) {
    hideHighlight();
    return;
  }
  
  // 忽略高亮层本身
  if (element.id === 'selector-picker-highlight' || element.id === 'selector-picker-label') {
    return;
  }

  updateHighlight(element);
}

/**
 * 点击处理
 */
function handleClick(event: MouseEvent) {
  if (!isActive) return;

  // Shift 模式下不应该到达这里（因为监听器已被移除）
  // 但作为安全检查
  if (event.shiftKey) {
    console.log('[SelectorPicker] click with Shift - should not reach here');
    return;
  }

  console.log('[SelectorPicker] click - capturing element');
  event.preventDefault();
  event.stopPropagation();

  // 使用 elementFromPoint 获取真实元素
  const element = getDeepElementAtPoint(event.clientX, event.clientY);
  
  if (!element) {
    console.log('[SelectorPicker] No element found at click position');
    return;
  }
  
  // 忽略高亮层本身
  if (element.id === 'selector-picker-highlight' || element.id === 'selector-picker-label' || element.id === 'selector-picker-hint') {
    return;
  }

  // 提取元素信息
  const elementInfo = extractElementInfo(element);
  
  // 生成选择器
  const selectors = generateSelectors(elementInfo);
  
  // 验证每个选择器
  const validatedSelectors = selectors.map(s => ({
    ...s,
    validation: validateSelector(s.selector),
  }));

  // 发送给主进程
  ipcRenderer.send('selector-picker:element-selected', {
    elementInfo,
    selectors: validatedSelectors,
    timestamp: Date.now(),
  });

  // 显示选中效果
  if (highlightOverlay) {
    highlightOverlay.style.borderColor = '#22c55e';
    highlightOverlay.style.background = 'rgba(34, 197, 94, 0.2)';
  }

  // 短暂延迟后关闭
  setTimeout(() => {
    stopPicker();
  }, 300);
}

/**
 * 键盘处理
 */
function handleKeyDown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    event.preventDefault();
    ipcRenderer.send('selector-picker:cancelled');
    stopPicker();
  }
  
  // 跟踪 Shift 键状态 - 按下时临时禁用选择器
  if (event.key === 'Shift' && !isShiftPressed) {
    isShiftPressed = true;
    console.log('[SelectorPicker] Shift pressed - temporarily disabling picker');
    
    // 更新高亮颜色
    if (highlightOverlay && highlightOverlay.style.display !== 'none') {
      highlightOverlay.style.borderColor = '#f59e0b';
      highlightOverlay.style.background = 'rgba(245, 158, 11, 0.1)';
    }
    if (highlightLabel && highlightLabel.style.display !== 'none') {
      highlightLabel.style.background = '#f59e0b';
      const currentText = highlightLabel.textContent || '';
      if (!currentText.startsWith('🔗')) {
        highlightLabel.textContent = `🔗 导航模式: ${currentText}`;
      }
    }
    
    // 关键：临时移除所有事件监听器，让页面完全正常工作
    // 这样 Shift+点击可以正常导航
    document.removeEventListener('mousemove', handleMouseMove, true);
    document.removeEventListener('click', handleClick, true);
    document.removeEventListener('mousedown', handleMouseDown, true);
    
    // 隐藏高亮层和提示栏（避免遮挡点击）
    hideHighlight();
    if (hintBar) {
      hintBar.style.display = 'none';
    }
    
    // 恢复鼠标样式
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
}

/**
 * 键盘释放处理
 */
function handleKeyUp(event: KeyboardEvent) {
  // Shift 释放时恢复选择器
  if (event.key === 'Shift' && isShiftPressed) {
    isShiftPressed = false;
    console.log('[SelectorPicker] Shift released - re-enabling picker');
    
    // 恢复高亮颜色
    if (highlightOverlay && highlightOverlay.style.display !== 'none') {
      highlightOverlay.style.borderColor = '#3b82f6';
      highlightOverlay.style.background = 'rgba(59, 130, 246, 0.1)';
    }
    if (highlightLabel && highlightLabel.style.display !== 'none') {
      highlightLabel.style.background = '#3b82f6';
      const currentText = highlightLabel.textContent || '';
      if (currentText.startsWith('🔗 导航模式: ')) {
        highlightLabel.textContent = currentText.replace('🔗 导航模式: ', '');
      }
    }
    
    // 恢复提示栏
    if (hintBar) {
      hintBar.style.display = 'flex';
    }
    
    // 重新添加事件监听器
    document.addEventListener('mousemove', handleMouseMove, true);
    document.addEventListener('click', handleClick, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    
    // 恢复鼠标样式
    document.body.style.cursor = 'crosshair';
    document.body.style.userSelect = 'none';
  }
}

/**
 * 鼠标按下处理
 */
function handleMouseDown(event: MouseEvent) {
  // Shift 模式下不应该到达这里（因为监听器已被移除）
  // 但作为安全检查
  if (event.shiftKey) {
    console.log('[SelectorPicker] mousedown with Shift (should not happen)');
    return;
  }
  
  if (isActive) {
    event.preventDefault();
  }
}

/**
 * 启动选择器
 */
function startPicker() {
  if (isActive) return;
  
  isActive = true;
  isShiftPressed = false;
  createHighlightOverlay();
  
  // 使用 capture 阶段监听，确保先于其他处理程序
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);
  document.addEventListener('mousedown', handleMouseDown, true);
  document.addEventListener('keydown', handleKeyDown, true);
  document.addEventListener('keyup', handleKeyUp, true);
  
  // 改变鼠标样式
  document.body.style.cursor = 'crosshair';
  
  // 禁用页面选择
  document.body.style.userSelect = 'none';
  
  // 标记激活状态
  sessionStorage.setItem('selectorPickerActive', 'true');
  
  console.log('[SelectorPicker] Started');
}

/**
 * 停止选择器
 */
function stopPicker() {
  if (!isActive) return;
  
  isActive = false;
  isShiftPressed = false;
  removeHighlightOverlay();
  
  document.removeEventListener('mousemove', handleMouseMove, true);
  document.removeEventListener('click', handleClick, true);
  document.removeEventListener('mousedown', handleMouseDown, true);
  document.removeEventListener('keydown', handleKeyDown, true);
  document.removeEventListener('keyup', handleKeyUp, true);
  
  document.body.style.cursor = '';
  document.body.style.userSelect = '';
  
  // 清除持久化状态
  sessionStorage.removeItem('selectorPickerActive');
  
  console.log('[SelectorPicker] Stopped');
}

/**
 * 处理页面导航完成事件
 * 如果之前处于激活状态（存储在 sessionStorage），自动重新启动
 */
function handlePageLoad() {
  // 检查是否需要自动重启选择器
  const shouldReactivate = sessionStorage.getItem('selectorPickerActive');
  if (shouldReactivate === 'true' && !isActive) {
    console.log('[SelectorPicker] Auto-reactivating after page navigation');
    // 延迟一点确保页面完全加载
    setTimeout(() => {
      startPicker();
    }, 500);
  }
}

// 通过 contextBridge 暴露 API
contextBridge.exposeInMainWorld('selectorPicker', {
  start: startPicker,
  stop: stopPicker,
  isActive: () => isActive,
});

// 监听来自主进程的命令
ipcRenderer.on('selector-picker:start', () => {
  sessionStorage.setItem('selectorPickerActive', 'true');
  startPicker();
});

ipcRenderer.on('selector-picker:stop', () => {
  sessionStorage.removeItem('selectorPickerActive');
  stopPicker();
});

// 页面加载完成后检查是否需要自动激活
if (document.readyState === 'complete') {
  handlePageLoad();
} else {
  window.addEventListener('load', handlePageLoad);
}

// 监听页面显示事件（处理前进/后退导航）
window.addEventListener('pageshow', (event) => {
  if (event.persisted) {
    handlePageLoad();
  }
});

console.log('[SelectorPicker] Preload script loaded');
