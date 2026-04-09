/**
 * 纯前端 Mock「接口等待」：默认零延迟，数据读写立即返回。
 * 需要演示「网络感」时可在 .env.local 设置 VITE_MOCK_LATENCY_MS（毫秒），所有 mock 请求统一使用该值。
 */
const parsed = Number(import.meta.env.VITE_MOCK_LATENCY_MS);
const MOCK_LATENCY_MS = Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 30_000) : 0;

export function mockLatency(): Promise<void> {
  if (MOCK_LATENCY_MS <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
}
