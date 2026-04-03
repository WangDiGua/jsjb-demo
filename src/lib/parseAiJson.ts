/** 从大模型输出中尽量截出 JSON 并解析（忽略字符串内括号、兼容常见模型杂质） */
export function parseAiJson<T>(raw: string): T {
  let s = raw.trim().replace(/^\uFEFF/, '');
  if (!s) {
    throw new SyntaxError('模型输出为空');
  }

  const fence = s.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    s = fence[1]!.trim();
    if (!s) {
      throw new SyntaxError('markdown 代码块内为空');
    }
  }

  const o = s.indexOf('{');
  const a = s.indexOf('[');
  if (o < 0 && a < 0) {
    throw new SyntaxError('输出中未找到 JSON 起始符号 { 或 [');
  }

  let cut: string;
  if (o >= 0 && (a < 0 || o < a)) {
    const end = findMatchingIgnoringStrings(s, o, '{', '}');
    cut = end > o ? s.slice(o, end + 1) : s.slice(o);
  } else {
    const start = a;
    const end = findMatchingIgnoringStrings(s, start, '[', ']');
    cut = end > start ? s.slice(start, end + 1) : s.slice(start);
  }

  if (!cut.trim()) {
    throw new SyntaxError('截取出的 JSON 片段为空');
  }

  try {
    return JSON.parse(cut) as T;
  } catch (first) {
    const repaired = stripTrailingCommas(cut);
    try {
      return JSON.parse(repaired) as T;
    } catch {
      const msg = first instanceof Error ? first.message : String(first);
      if (/unexpected end|unterminated|unclosed/i.test(msg)) {
        throw new SyntaxError(
          `${msg} — 多为输出被长度截断（文末括号未闭合）。可缩短入参描述或检查 API max_tokens / 模型输出上限。`,
        );
      }
      throw first instanceof Error ? first : new Error(String(first));
    }
  }
}

/** 删除对象/数组中非法的尾逗号，便于 JSON.parse */
function stripTrailingCommas(json: string): string {
  return json.replace(/,(\s*[}\]])/g, '$1');
}

function findMatchingIgnoringStrings(s: string, start: number, open: string, close: string): number {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < s.length; i++) {
    const c = s[i]!;

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === '\\') {
        escape = true;
        continue;
      }
      if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }

    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
