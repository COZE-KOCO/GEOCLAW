/**
 * 服务端环境变量加载（仅服务端使用）
 * 
 * 此文件包含 Node.js 特有模块，只能在服务端 API 路由中使用
 */

/**
 * 从 Coze 环境获取环境变量
 */
export async function loadEnvFromCoze(): Promise<void> {
  // 如果已经有环境变量，跳过
  if (process.env.COZE_SUPABASE_URL && process.env.COZE_SUPABASE_ANON_KEY) {
    return;
  }

  try {
    // 动态导入 child_process，避免客户端打包
    const childProcess = await import('child_process');
    const execSync = childProcess.execSync;
    
    const pythonCode = `
import os
import sys
try:
    from coze_workload_identity import Client
    client = Client()
    env_vars = client.get_project_env_vars()
    client.close()
    for env_var in env_vars:
        print(f"{env_var.key}={env_var.value}")
except Exception as e:
    print(f"# Error: {e}", file=sys.stderr)
`;

    const output = execSync(`python3 -c '${pythonCode.replace(/'/g, "'\"'\"'")}'`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    const lines = output.trim().split('\n');
    for (const line of lines) {
      if (line.startsWith('#')) continue;
      const eqIndex = line.indexOf('=');
      if (eqIndex > 0) {
        const key = line.substring(0, eqIndex);
        let value = line.substring(eqIndex + 1);
        if ((value.startsWith("'") && value.endsWith("'")) ||
            (value.startsWith('"') && value.endsWith('"'))) {
          value = value.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    }
  } catch {
    // 静默失败，使用 .env 文件中的值
  }
}
