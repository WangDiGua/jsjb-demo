/**
 * OpenAI 兼容 Chat Completions（通过 Vite 开发/预览代理 /glm-api 避免浏览器 CORS）。
 * 默认对接阿里云 DashScope compatible-mode；也可通过 .env 改回 Moonshot 等网关。
 * 生产静态部署需自行配置同源反向代理，勿把密钥提交到仓库。
 *
 * 模型名：VITE_GLM_MODEL（以各平台控制台为准，如 qwen3.5-flash、kimi-k2-turbo-preview）。
 */

export function isGlmConfigured(): boolean {
  return Boolean(import.meta.env.VITE_GLM_API_KEY?.trim());
}

export async function glmChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts?: { temperature?: number; maxTokens?: number },
  signal?: AbortSignal,
): Promise<string> {
  const model = import.meta.env.VITE_GLM_MODEL?.trim() || 'qwen3.5-flash';
  const apiKeyResolved = import.meta.env.VITE_GLM_API_KEY?.trim();
  if (!apiKeyResolved) {
    throw new Error('大模型服务未配置，请联系管理员完成接入。');
  }

  const res = await fetch('/glm-api/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKeyResolved}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.5,
      max_tokens: opts?.maxTokens ?? 2048,
    }),
    signal,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API 接口错误 ${res.status}：${t.slice(0, 400)}`);
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (typeof content !== 'string') {
    throw new Error('API 返回内容为空或格式异常');
  }
  return content;
}

type StreamChunk = {
  choices?: { delta?: { content?: string | null }; finish_reason?: string | null }[];
  error?: { message?: string };
};

/**
 * 流式补全（OpenAI/Moonshot 兼容 SSE）。onDelta 按每次收到的文本增量调用；返回完整拼接字符串。
 */
export async function glmChatStream(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  opts: { temperature?: number; maxTokens?: number } | undefined,
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
): Promise<string> {
  const model = import.meta.env.VITE_GLM_MODEL?.trim() || 'qwen3.5-flash';
  const apiKeyResolved = import.meta.env.VITE_GLM_API_KEY?.trim();
  if (!apiKeyResolved) {
    throw new Error('大模型服务未配置，请联系管理员完成接入。');
  }

  const res = await fetch('/glm-api/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKeyResolved}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: opts?.temperature ?? 0.5,
      max_tokens: opts?.maxTokens ?? 2048,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API 接口错误 ${res.status}：${t.slice(0, 400)}`);
  }

  const reader = res.body?.getReader();
  if (!reader) {
    throw new Error('无法读取流式响应');
  }

  const decoder = new TextDecoder();
  let pending = '';
  let full = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      pending += decoder.decode(value, { stream: true });
      const parts = pending.split(/\r?\n/);
      pending = parts.pop() ?? '';
      for (const rawLine of parts) {
        const line = rawLine.trim();
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        let json: StreamChunk;
        try {
          json = JSON.parse(data) as StreamChunk;
        } catch {
          continue;
        }
        if (json.error?.message) {
          throw new Error(json.error.message);
        }
        const piece = json.choices?.[0]?.delta?.content;
        if (typeof piece === 'string' && piece.length > 0) {
          full += piece;
          onDelta(piece);
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (pending.trim()) {
    for (const rawLine of pending.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const json = JSON.parse(data) as StreamChunk;
        if (json.error?.message) throw new Error(json.error.message);
        const piece = json.choices?.[0]?.delta?.content;
        if (typeof piece === 'string' && piece.length > 0) {
          full += piece;
          onDelta(piece);
        }
      } catch {
        /* ignore trailing garbage */
      }
    }
  }

  return full;
}
