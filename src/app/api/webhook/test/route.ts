import { NextRequest, NextResponse } from 'next/server';
import { getAccountById } from '@/lib/account-store';
import { testWebhookConnection } from '@/lib/webhook-service';

/**
 * POST /api/webhook/test
 * 测试 Webhook 连接
 * Body: {
 *   accountId?: string;        // 测试已保存的账号
 *   webhookConfig?: {          // 或直接测试配置
 *     url: string;
 *     method?: 'GET' | 'POST' | 'PUT';
 *     headers?: Record<string, string>;
 *     authToken?: string;
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accountId, webhookConfig } = body;

    // 测试已保存的账号
    if (accountId) {
      const account = await getAccountById(accountId);
      if (!account) {
        return NextResponse.json({ error: '账号不存在' }, { status: 404 });
      }

      if (!account.webhookConfig) {
        return NextResponse.json({ 
          success: false, 
          message: '该账号未配置Webhook' 
        });
      }

      const result = await testWebhookConnection(account.webhookConfig);
      return NextResponse.json(result);
    }

    // 测试直接传入的配置
    if (webhookConfig) {
      const result = await testWebhookConnection(webhookConfig);
      return NextResponse.json(result);
    }

    return NextResponse.json({ 
      error: '请提供accountId或webhookConfig' 
    }, { status: 400 });
  } catch (error) {
    console.error('Webhook测试失败:', error);
    return NextResponse.json({ error: 'Webhook测试失败' }, { status: 500 });
  }
}
