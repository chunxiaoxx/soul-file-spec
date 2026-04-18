/**
 * soul-file loader — 参考实现（TypeScript）
 *
 * 最小可用：从 soul-file 目录加载为内存对象 + 合成 system prompt。
 * 使用：
 *   import { loadSoul } from '@soulcore/soul-file';
 *   const soul = await loadSoul('./siddhartha/');
 *   const prompt = soul.composeSystemPrompt();
 */

import { readFile } from "fs/promises";
import { join } from "path";
import { parse as parseYaml } from "yaml";

export interface SoulMeta {
  schema: string;
  meta: {
    id: string;
    name: string;
    name_en?: string;
    version: string;
    created: string;
    license?: string;
  };
  persona: {
    identity: string;
    values: string;
    style: string;
    skills?: string;
  };
  memory: {
    beliefs: string;
    episodic: string;
    evolution: string;
    knowledge_dir?: string;
  };
  capabilities?: {
    language?: string[];
    voice?: {
      preferred_tts_voice?: string;
      speed?: number;
      pitch?: number;
    };
    modalities?: string[];
  };
  runtime?: {
    recommended_models?: string[];
    min_context_window?: number;
  };
  provenance?: { creator?: string; source?: string };
}

export interface Belief {
  id: string;
  content: string;
  confidence: number;
  source?: string;
  created?: string;
  weight?: number;
  scope?: string;
}

export interface ComposeOptions {
  emotion?: string;
  userId?: string;
  maxBeliefs?: number;
  includeSkills?: boolean;
}

export class Soul {
  constructor(
    public readonly meta: SoulMeta,
    private readonly content: {
      identity: string;
      values: string;
      style: string;
      skills?: string;
    },
    private readonly beliefs: Belief[],
    private readonly rootPath: string
  ) {}

  composeSystemPrompt(opts: ComposeOptions = {}): string {
    const parts: string[] = [this.content.identity];
    parts.push(`\n## 我的价值观\n${this.content.values}`);
    parts.push(`\n## 我说话的方式\n${this.content.style}`);

    if (opts.includeSkills && this.content.skills) {
      parts.push(`\n## 我能做什么\n${this.content.skills}`);
    }

    if (opts.maxBeliefs && opts.maxBeliefs > 0) {
      const globalBeliefs = this.beliefs
        .filter((b) => !b.scope || b.scope === "global")
        .sort((a, b) => (b.weight || 0.5) - (a.weight || 0.5))
        .slice(0, opts.maxBeliefs);

      if (globalBeliefs.length > 0) {
        parts.push("\n## 我所相信的");
        for (const b of globalBeliefs) parts.push(`- ${b.content}`);
      }

      if (opts.userId) {
        const userScope = `user-${opts.userId}`;
        const userBeliefs = this.beliefs
          .filter((b) => b.scope === userScope)
          .sort((a, b) => (b.weight || 0.5) - (a.weight || 0.5))
          .slice(0, 5);
        if (userBeliefs.length > 0) {
          parts.push(`\n## 关于这位朋友我知道的`);
          for (const b of userBeliefs) parts.push(`- ${b.content}`);
        }
      }
    }

    if (opts.emotion) parts.push(`\n## 当前感受到对方的情绪\n${opts.emotion}`);
    return parts.join("\n");
  }

  recallBeliefs(
    query: string,
    opts: { topK?: number; userId?: string } = {}
  ): Belief[] {
    const topK = opts.topK || 5;
    const userScope = opts.userId ? `user-${opts.userId}` : null;
    const scored = this.beliefs
      .filter((b) => !b.scope || b.scope === "global" || b.scope === userScope)
      .map((b) => ({
        belief: b,
        score: scoreMatch(b.content, query) * (b.weight || 0.5),
      }))
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    return scored.map((s) => s.belief);
  }

  get id(): string { return this.meta.meta.id; }
  get name(): string { return this.meta.meta.name; }
  get voiceConfig() { return this.meta.capabilities?.voice; }
}

function scoreMatch(content: string, query: string): number {
  const ql = query.toLowerCase();
  const cl = content.toLowerCase();
  if (cl.includes(ql)) return 1.0;
  const words = ql.split(/\s+/).filter((w) => w.length > 1);
  const hits = words.filter((w) => cl.includes(w)).length;
  return hits / Math.max(words.length, 1);
}

export async function loadSoul(soulPath: string): Promise<Soul> {
  const metaYaml = await readFile(join(soulPath, "soul.yaml"), "utf-8");
  const meta = parseYaml(metaYaml) as SoulMeta;
  if (!meta.schema?.startsWith("soul-file/")) {
    throw new Error(`Not a soul-file: missing schema field`);
  }
  const [identity, values, style, skills, beliefsRaw] = await Promise.all([
    readFile(join(soulPath, meta.persona.identity), "utf-8"),
    readFile(join(soulPath, meta.persona.values), "utf-8"),
    readFile(join(soulPath, meta.persona.style), "utf-8"),
    meta.persona.skills
      ? readFile(join(soulPath, meta.persona.skills), "utf-8")
      : Promise.resolve(undefined),
    readFile(join(soulPath, meta.memory.beliefs), "utf-8").catch(() => ""),
  ]);
  const beliefs: Belief[] = beliefsRaw
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => { try { return JSON.parse(l) as Belief; } catch { return null; } })
    .filter((b): b is Belief => b !== null);
  return new Soul(meta, { identity, values, style, skills }, beliefs, soulPath);
}
