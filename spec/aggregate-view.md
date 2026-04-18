# Aggregate View (单文件视图)

soul-file 支持**两种加载视图**，内容等价。

## View A — Directory view (推荐：开发 / fork / review)

```
siddhartha/
├── soul.yaml
├── identity.md
├── values.md
├── style.md
├── skills.md
├── beliefs.jsonl
├── memory.jsonl
├── evolution.jsonl
└── knowledge/
```

优势：
- git diff 友好（不同文件独立修改历史）
- 多人协作容易（不同字段分给不同维护者）
- TS/Python SDK 直接支持

## View B — Aggregate view (推荐：runtime / 分发)

单文件 `SOUL.md`，以 YAML frontmatter 开头，body 依次拼接 identity/values/style/skills。

```markdown
---
schema: soul-file/v0.1-aggregate
id: siddhartha
baseHash: <sha256 of body>
---

# 我是 xxx
...

## 我相信
...

## 我说话的方式
...
```

优势：
- 单文件分发（邮件、Gist、微信公众号文章附件都能直接传）
- runtime 零依赖解析（一个 `parseFrontmatter` 就够）
- baseHash 可防篡改：每次加载校验 body hash 是否等于 frontmatter 里的 baseHash
- V5 / SoulCore runtime 原生加载格式

## 双向转换

两种视图互相等价：
- `aggregate-to-directory.ts`: 从 SOUL.md 拆成多文件
- `directory-to-aggregate.ts`: 从目录渲染成 SOUL.md + 计算 baseHash

runtime 可选任意一种作为主视图。推荐：开发用 View A，部署用 View B。

## 与 V5/SoulCore 的关系

V5 原生用 View B（tenant 目录下单个 SOUL.md）。
禅心 SoulCore runtime 支持两种——公开 IP 用 View A（GitHub 可读性好），服务器运行时用 View B（hash 防篡改）。
