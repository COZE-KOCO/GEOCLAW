/**
 * 平台选择器配置测试 API
 * 
 * POST: 测试指定平台的所有选择器配置
 */

import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_PLATFORM_CONFIGS } from '@/lib/selector-defaults';
import { getSupabaseClient } from '@/storage/database';

// 数据库字段到前端字段的映射
function mapToFrontend(dbRecord: any) {
  return {
    id: dbRecord.id,
    platform: dbRecord.platform,
    platformName: dbRecord.platform_name,
    version: dbRecord.version,
    publishUrl: dbRecord.publish_url,
    selectorTypes: dbRecord.selector_types || [],
    selectors: dbRecord.selectors,
    settings: dbRecord.settings,
    prepareScript: dbRecord.prepare_script,
    totalAttempts: dbRecord.total_attempts || 0,
    successfulAttempts: dbRecord.successful_attempts || 0,
    successRate: dbRecord.success_rate || '0%',
    isActive: dbRecord.is_active ?? true,
    isDefault: dbRecord.is_default ?? true,
    notes: dbRecord.notes,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ platform: string }> }
) {
  try {
    const { platform } = await params;
    
    // 先获取默认配置
    const defaultConfig = DEFAULT_PLATFORM_CONFIGS.find(c => c.platform === platform);
    if (!defaultConfig) {
      return NextResponse.json({
        success: false,
        error: `未找到平台 ${platform} 的配置`,
      }, { status: 404 });
    }

    let config = { ...defaultConfig, isDefault: true };

    // 尝试获取用户自定义配置
    try {
      const supabase = getSupabaseClient();
      const { data: userConfig, error } = await supabase
        .from('platform_selectors')
        .select('*')
        .eq('platform', platform)
        .single();

      if (!error && userConfig) {
        config = mapToFrontend(userConfig);
      }
    } catch (e) {
      // 数据库不可用，使用默认配置
    }

    // 生成测试脚本（由 Electron 端在目标页面执行）
    const testScript = `
      (function() {
        const config = ${JSON.stringify(config)};
        const results = {
          platform: config.platform,
          publishUrl: config.publishUrl,
          timestamp: new Date().toISOString(),
          selectors: {},
          stats: {
            total: 0,
            found: 0,
            notFound: 0,
            successRate: '0%'
          }
        };

        // 遍历所有选择器类型
        for (const [typeKey, selectors] of Object.entries(config.selectors)) {
          if (!Array.isArray(selectors) || selectors.length === 0) continue;
          
          results.selectors[typeKey] = {
            tested: 0,
            found: 0,
            details: []
          };

          // 测试每个选择器（按优先级）
          for (const item of selectors) {
            if (!item.isEnabled || !item.selector) continue;
            
            results.stats.total++;
            results.selectors[typeKey].tested++;

            try {
              const elements = document.querySelectorAll(item.selector);
              const found = elements.length > 0;
              
              const detail = {
                selector: item.selector,
                priority: item.priority,
                found: found,
                matchCount: elements.length,
                firstElement: null
              };

              if (found) {
                results.stats.found++;
                results.selectors[typeKey].found++;
                
                // 收集第一个匹配元素的信息
                const el = elements[0];
                detail.firstElement = {
                  tagName: el.tagName.toLowerCase(),
                  type: el.getAttribute('type') || undefined,
                  id: el.id || undefined,
                  className: el.className && typeof el.className === 'string' 
                    ? el.className.split(' ').slice(0, 3).join(' ') 
                    : undefined,
                  placeholder: el.getAttribute('placeholder') || undefined,
                  isVisible: el.offsetParent !== null && el.offsetWidth > 0 && el.offsetHeight > 0,
                  isEditable: ['INPUT', 'TEXTAREA'].includes(el.tagName) || el.contentEditable === 'true',
                };
              } else {
                results.stats.notFound++;
              }

              results.selectors[typeKey].details.push(detail);
              
              // 如果找到了，不再测试该类型的后续选择器
              if (found) break;
              
            } catch (e) {
              results.selectors[typeKey].details.push({
                selector: item.selector,
                priority: item.priority,
                found: false,
                error: e.message
              });
              results.stats.notFound++;
            }
          }
        }

        // 计算成功率
        results.stats.successRate = results.stats.total > 0 
          ? Math.round((results.stats.found / results.stats.total) * 100) + '%'
          : '0%';

        return results;
      })();
    `;

    return NextResponse.json({
      success: true,
      data: {
        platform: config.platform,
        platformName: config.platformName,
        publishUrl: config.publishUrl,
        testScript,
      },
    });
  } catch (error: any) {
    console.error('[Platform Test API] 测试失败:', error);
    return NextResponse.json({
      success: false,
      error: error.message || '测试失败',
    }, { status: 500 });
  }
}
