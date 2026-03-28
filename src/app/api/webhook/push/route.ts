import { NextRequest, NextResponse } from 'next/server';
import { 
  getWebhookEnabledAccounts, 
  getAccountById 
} from '@/lib/account-store';
import { 
  sendWebhook, 
  sendBatchWebhooks, 
  testWebhookConnection,
  buildWebhookPayload 
} from '@/lib/webhook-service';

/**
 * POST /api/webhook/push
 * 推送内容到官网
 * Body: {
 *   businessId: string;
 *   accountIds?: string[];  // 可选，不传则推送到所有启用Webhook的账号
 *   payload: {
 *     title: string;
 *     content: string;
 *     summary?: string;
 *     keywords?: string[];
 *     category?: string;
 *     tags?: string[];
 *     author?: string;
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessId, accountIds, payload } = body;

    if (!businessId) {
      return NextResponse.json({ error: '缺少企业ID' }, { status: 400 });
    }

    if (!payload || !payload.title || !payload.content) {
      return NextResponse.json({ error: '缺少必要的内容信息' }, { status: 400 });
    }

    // 构建Webhook Payload
    const webhookPayload = buildWebhookPayload(payload);

    // 获取要推送的账号
    let accounts;
    if (accountIds && accountIds.length > 0) {
      // 推送到指定账号
      const accountPromises = accountIds.map((id: string) => getAccountById(id));
      const accountResults = await Promise.all(accountPromises);
      accounts = accountResults.filter(Boolean);
    } else {
      // 推送到所有启用Webhook的账号
      accounts = await getWebhookEnabledAccounts(businessId);
    }

    if (accounts.length === 0) {
      return NextResponse.json({ 
        error: '没有可用的Webhook账号',
        total: 0,
        success: 0,
        failed: 0,
        results: []
      });
    }

    // 批量推送
    const result = await sendBatchWebhooks(accounts, webhookPayload);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Webhook推送失败:', error);
    return NextResponse.json({ error: 'Webhook推送失败' }, { status: 500 });
  }
}
