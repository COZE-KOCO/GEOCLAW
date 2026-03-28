/**
 * Webhook 推送服务
 * 用于向官网推送内容
 */

import { MatrixAccount } from './account-store';

export interface WebhookPayload {
  title: string;
  content: string;
  summary?: string;
  keywords?: string[];
  category?: string;
  tags?: string[];
  author?: string;
  publishDate?: string;
  metadata?: Record<string, any>;
}

export interface WebhookResult {
  success: boolean;
  accountId: string;
  accountName: string;
  response?: any;
  error?: string;
  duration: number;
}

export interface BatchWebhookResult {
  total: number;
  success: number;
  failed: number;
  results: WebhookResult[];
  duration: number;
}

/**
 * 发送单个 Webhook 请求
 */
export async function sendWebhook(
  account: MatrixAccount,
  payload: WebhookPayload
): Promise<WebhookResult> {
  const startTime = Date.now();
  
  // 检查账号是否有Webhook配置
  if (!account.webhookConfig?.enabled) {
    return {
      success: false,
      accountId: account.id,
      accountName: account.displayName || account.accountName,
      error: 'Webhook未启用',
      duration: 0,
    };
  }

  const { url, method = 'POST', headers = {}, authToken } = account.webhookConfig;

  if (!url) {
    return {
      success: false,
      accountId: account.id,
      accountName: account.displayName || account.accountName,
      error: 'Webhook URL未配置',
      duration: 0,
    };
  }

  try {
    // 构建请求头
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    // 添加认证Token
    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    // 发送请求
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: JSON.stringify({
        ...payload,
        source: 'geo-optimization-tool',
        accountId: account.id,
        platform: account.platform,
        timestamp: new Date().toISOString(),
      }),
    });

    const duration = Date.now() - startTime;

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      return {
        success: false,
        accountId: account.id,
        accountName: account.displayName || account.accountName,
        error: `HTTP ${response.status}: ${errorText}`,
        duration,
      };
    }

    // 尝试解析响应
    let responseData;
    try {
      responseData = await response.json();
    } catch {
      responseData = await response.text();
    }

    return {
      success: true,
      accountId: account.id,
      accountName: account.displayName || account.accountName,
      response: responseData,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    return {
      success: false,
      accountId: account.id,
      accountName: account.displayName || account.accountName,
      error: error instanceof Error ? error.message : '请求失败',
      duration,
    };
  }
}

/**
 * 批量发送 Webhook
 */
export async function sendBatchWebhooks(
  accounts: MatrixAccount[],
  payload: WebhookPayload,
  options?: {
    concurrency?: number;
    timeout?: number;
  }
): Promise<BatchWebhookResult> {
  const startTime = Date.now();
  const { concurrency = 5, timeout = 30000 } = options || {};

  // 过滤出启用Webhook的账号
  const enabledAccounts = accounts.filter(a => 
    a.webhookConfig?.enabled && a.webhookConfig?.url
  );

  if (enabledAccounts.length === 0) {
    return {
      total: accounts.length,
      success: 0,
      failed: accounts.length,
      results: accounts.map(a => ({
        success: false,
        accountId: a.id,
        accountName: a.displayName || a.accountName,
        error: 'Webhook未配置或未启用',
        duration: 0,
      })),
      duration: Date.now() - startTime,
    };
  }

  // 分批处理
  const results: WebhookResult[] = [];
  for (let i = 0; i < enabledAccounts.length; i += concurrency) {
    const batch = enabledAccounts.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(account => 
        Promise.race([
          sendWebhook(account, payload),
          new Promise<WebhookResult>((_, reject) =>
            setTimeout(() => reject(new Error('请求超时')), timeout)
          ),
        ]).catch(error => ({
          success: false,
          accountId: account.id,
          accountName: account.displayName || account.accountName,
          error: error instanceof Error ? error.message : '请求超时',
          duration: timeout,
        }))
      )
    );
    results.push(...batchResults);
  }

  const success = results.filter(r => r.success).length;
  const failed = results.length - success;

  return {
    total: accounts.length,
    success,
    failed,
    results,
    duration: Date.now() - startTime,
  };
}

/**
 * 测试 Webhook 连接
 */
export async function testWebhookConnection(
  webhookConfig: MatrixAccount['webhookConfig']
): Promise<{ success: boolean; message: string; duration: number }> {
  if (!webhookConfig?.url) {
    return { success: false, message: 'Webhook URL未配置', duration: 0 };
  }

  const startTime = Date.now();
  const { url, method = 'POST', headers = {}, authToken } = webhookConfig;

  try {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (authToken) {
      requestHeaders['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: JSON.stringify({
        test: true,
        message: '连接测试',
        timestamp: new Date().toISOString(),
      }),
    });

    const duration = Date.now() - startTime;

    if (response.ok) {
      return { success: true, message: '连接成功', duration };
    } else {
      return { 
        success: false, 
        message: `连接失败: HTTP ${response.status}`, 
        duration 
      };
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    return { 
      success: false, 
      message: `连接失败: ${error instanceof Error ? error.message : '未知错误'}`, 
      duration 
    };
  }
}

/**
 * 构建标准化的 Webhook Payload
 */
export function buildWebhookPayload(options: {
  title: string;
  content: string;
  summary?: string;
  keywords?: string[];
  category?: string;
  tags?: string[];
  author?: string;
  metadata?: Record<string, any>;
}): WebhookPayload {
  return {
    title: options.title,
    content: options.content,
    summary: options.summary,
    keywords: options.keywords,
    category: options.category,
    tags: options.tags,
    author: options.author,
    publishDate: new Date().toISOString(),
    metadata: options.metadata,
  };
}

export default {
  sendWebhook,
  sendBatchWebhooks,
  testWebhookConnection,
  buildWebhookPayload,
};
