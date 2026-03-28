/**
 * 选择器测试 API
 * 
 * POST: 测试选择器是否能匹配到元素
 */

import { NextRequest, NextResponse } from 'next/server';

// 测试选择器（返回测试脚本，由前端执行）
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, targetType, selector, testUrl } = body;

    if (!selector) {
      return NextResponse.json({
        success: false,
        error: '缺少选择器',
      }, { status: 400 });
    }

    // 生成测试脚本（前端在目标页面执行）
    const testScript = `
      (function() {
        const selector = ${JSON.stringify(selector)};
        const targetType = ${JSON.stringify(targetType)};
        
        try {
          const el = document.querySelector(selector);
          
          if (!el) {
            return {
              selector: selector,
              found: false,
              error: '未找到匹配的元素',
            };
          }
          
          // 收集元素信息
          const elementInfo = {
            tagName: el.tagName.toLowerCase(),
            type: el.type || undefined,
            placeholder: el.placeholder || undefined,
            isVisible: el.offsetParent !== null && el.offsetWidth > 0 && el.offsetHeight > 0,
            isEditable: el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.contentEditable === 'true',
            className: el.className || undefined,
            id: el.id || undefined,
          };
          
          // 验证元素类型是否匹配
          let typeMatch = true;
          if (targetType === 'titleInput') {
            typeMatch = el.tagName === 'INPUT' && (el.type === 'text' || !el.type);
          } else if (targetType === 'contentEditor') {
            typeMatch = el.tagName === 'TEXTAREA' || el.contentEditable === 'true';
          } else if (targetType === 'publishButton') {
            typeMatch = el.tagName === 'BUTTON' || el.tagName === 'A' || el.type === 'submit';
          }
          
          return {
            selector: selector,
            found: true,
            typeMatch: typeMatch,
            elementInfo: elementInfo,
          };
          
        } catch (e) {
          return {
            selector: selector,
            found: false,
            error: e.message,
          };
        }
      })();
    `;

    return NextResponse.json({
      success: true,
      data: {
        testScript,
        platform,
        targetType,
        selector,
        testUrl: testUrl || null,
      },
    });
  } catch (error: any) {
    console.error('[Selector Test API] 测试失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '测试失败',
    }, { status: 500 });
  }
}
