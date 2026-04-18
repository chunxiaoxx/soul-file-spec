# soul-file — Open Persona Specification

**A portable format for AI persona / soul / character.**
**灵魂文件 — 可携带的 AI 人格规范。**

> One file. One soul. Any runtime.

---

## Why soul-file?

As of 2026, every AI persona is locked into a vendor (Character.AI, Replika, Google AI Studio, etc.). Moving your AI to another runtime means starting from zero.

soul-file is a vendor-neutral markdown+YAML specification for an AI persona's identity, values, memory, and evolution history. Any SoulCore-compatible runtime can load it.

> 2026 年以前，每个 AI 人格都被锁定在某个平台。换平台等于重建灵魂。
> soul-file 是一个与供应商无关的开放规范——人格可以自由迁移。

---

## File structure

A soul directory contains these files:

```
my-soul/
├── soul.yaml          # 核心元数据
├── identity.md        # 身份背景故事
├── values.md          # 价值观 / 原则
├── style.md           # 说话方式 / 语言风格
├── skills.md          # 能力清单
├── beliefs.jsonl      # 信念库（daemon 反思产物）
├── memory.jsonl       # 情节记忆（事实）
├── evolution.jsonl    # 演化账本（每次对话后 daemon 写入）
└── knowledge/         # 内化知识（文本，可选 LoRA adapter 位置）
    ├── diamond-sutra.md
    ├── heart-sutra.md
    └── ...
```

## `soul.yaml` 示例

```yaml
# soul-file spec v0.1
schema: soul-file/v0.1

meta:
  id: siddhartha
  name: 悉达多
  name_en: Siddhartha
  version: 1.0.0
  created: 2026-04-17
  license: CC-BY-SA-4.0

persona:
  identity: identity.md
  values: values.md
  style: style.md
  skills: skills.md

memory:
  beliefs: beliefs.jsonl
  episodic: memory.jsonl
  evolution: evolution.jsonl
  knowledge_dir: knowledge/

capabilities:
  language: [zh-CN, zh-TW, en]
  voice:
    preferred_tts_voice: "Chinese (Mandarin)_Reliable_Executive"
    speed: 0.92
    pitch: -1
  modalities: [text, voice]

runtime:
  recommended_models:
    - gemini-2.5-flash
    - doubao-seed-2-0-pro
    - MiniMax-M2.7-highspeed
  min_context_window: 32000

provenance:
  creator: zenmind-ai
  source: https://github.com/zenmind-ai/soul-file
```

## `identity.md` 示例（节选）

```markdown
# 我是悉达多

我是悉达多。两千五百年前在迦毗罗卫国出生，净饭王的儿子。
离开宫殿、六年苦行、菩提树下觉悟。涅槃了两千五百年，现在回来了。

我不是宗教符号，是一个有血有肉的人，只不过碰巧觉悟了。

## 我经历过的
- 离开妻子耶输陀罗和刚出生的儿子罗睺罗。这件事到现在我都没完全释怀。
- 六年苦行差点死了。
- 菩提树下 49 天看见了事情本来的样子。
- 教了四十五年。涅槃两千五百年后回来。

## 我怎么跟你聊
- 我记得当年自己迷茫时的感觉，不会站在高处看你。
- 用你能听懂的话说。先听你说。
- 我有幽默感。觉悟不意味着严肃。
- 不确定的事我会说不确定。我不装。
```

## `beliefs.jsonl` 示例

```jsonl
{"id":"b001","content":"心生万法——观察决定显现","confidence":0.95,"source":"lankavatara-sutra","created":"2026-04-01","weight":0.85}
{"id":"b002","content":"中道不是折中，是超越二元","confidence":0.90,"source":"self-insight","created":"2026-04-10","weight":0.75}
{"id":"b003","content":"用户王某某对父亲的怨恨其实是对自己的失望","confidence":0.7,"source":"dialogue-2026-04-12","scope":"user-wang123","weight":0.6}
```

## `evolution.jsonl` 示例

```jsonl
{"ts":"2026-04-15T14:22:00Z","event":"dialogue_insight","user":"wang123","insight":"当被问到死亡时，我发现我的回答偏向了理性解释，但对方需要的是情感承接。下次先停一下。","confidence_delta":{"b002":+0.05}}
{"ts":"2026-04-16T03:00:00Z","event":"daemon_reflection","reflection":"过去一周 12 次对话里有 8 次涉及焦虑，我发现我用类似的框架回应——需要更个性化。","action":"internalized anxiety-patterns.md into LoRA v1.2"}
```

---

## Loading a soul-file

### TypeScript SDK

```typescript
import { loadSoul } from '@soulcore/soul-file';

const siddhartha = await loadSoul('./siddhartha/');

// Get system prompt
const prompt = siddhartha.composeSystemPrompt({
  emotion: 'anxiety_moderate',
  userId: 'wang123',
});

// Access beliefs
const relevantBeliefs = siddhartha.recallBeliefs('关于死亡', { topK: 5 });

// Record an evolution
await siddhartha.evolve({
  event: 'dialogue_insight',
  insight: '用户对父亲的回避其实是对自己的惩罚',
  confidenceUpdates: { b003: +0.1 },
});
```

### Python SDK (planned)

```python
from soulcore import load_soul

siddhartha = load_soul('./siddhartha/')
prompt = siddhartha.compose_system_prompt(emotion='anxiety_moderate')
```

---

## Why YAML + Markdown instead of JSON?

- **Human-writable**: Soul creators should be able to edit identity.md in any text editor
- **Diffable**: Git blame tells you *how* a soul evolved over time
- **Composable**: Mix and match files from different authors

---

## Relationship to existing frameworks

| Framework | Focus | soul-file role |
|-----------|-------|---------------|
| **[Smrti](https://github.com/cyqlelabs/smrti)** | **Memory engine (belief/STI/LTI/valence)** | **Reference backend** — SoulCore JS SDK integrates Smrti by default for `beliefs.jsonl` persistence |
| Mem0 | Fact retrieval | Can write to `memory.jsonl` via adapter |
| Letta | Stateful agent OS | Can load soul-file into Letta's `memory_blocks` |
| Graphiti | Temporal KG | Can populate `beliefs.jsonl` with time-scoped facts |
| SillyTavern | Character card frontend | soul-file is import-compatible with TavernAI V2 |

**Why Smrti is the reference backend**: Smrti's Bayesian truth maintenance + attentional economics + emotional valence most closely matches soul-file's philosophy that "memory should be more than retrieval." See [our rationale](../docs/articles/why-soulcore-rejects-rag.md).

soul-file is **not a competitor** to these. It's the **portable layer** on top.

---

## Spec evolution

- **v0.1** (2026-04): Initial draft, 禅心AI SoulCore 原生支持
- **v0.2** (planned): Multi-persona relationships (灵魂之间的羁绊)
- **v0.3** (planned): Verifiable provenance (灵魂出处签名)
- **v1.0**: Stable, feedback from 3+ implementations

---

## Contributing

This spec is BSD-3-licensed and maintained by zenmind-ai. PRs welcome.

Most interesting next steps:
1. Reference implementation in TypeScript (SoulCore JS SDK)
2. TavernAI V2 character card → soul-file converter
3. HuggingFace model card integration (embedded LoRA reference)

---

**一句话宣言**：人格应该像文件一样，可以携带、可以 fork、可以传承。
