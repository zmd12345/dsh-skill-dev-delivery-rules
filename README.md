# dsh-skill-dev-delivery-rules

把《开发交付规则》注册为 DeepSeek Harness 的**技能家族**：1 个核心技能 + 9 个专项技能，按任务场景自动加载对应规则。

## 工作原理

DSH 的技能目录只常驻每个技能的一行摘要（约 40 token/行）。模型在任务与某技能的场景描述匹配时，才通过 `skill` 工具加载其完整正文——因此每个会话只为**真正用到的规则**付 token：

| 会话类型 | 加载内容 | 进入上下文的规则文本 |
|---|---|---|
| 闲聊 / 非开发 | 无 | 0 |
| 小修小改 | 核心 + cli-safety | ~2.7K 字符 |
| 典型开发 | 核心 + 2~3 个专项 | ~3K 字符（细则完整） |

对比：规则全文常驻（如写进 AGENTS.md）是 5.2K 字符 × 每一步。

## 技能清单

- `dev-delivery-rules` 核心：总则、需求澄清、规则导航、交付前自检
- `dev-architecture-layers` 分层架构
- `dev-evidence-debug` 证据驱动调试
- `dev-minimal-changes` 最小变更
- `dev-verify-grading` 验证范围 L1~L4 分级
- `dev-migration-parity` 迁移功能对等
- `dev-ui-feedback` GUI 异步交互四项要求
- `dev-style-sizing` 样式尺寸规范
- `dev-cli-safety` 命令行与仓库操作安全
- `dev-project-notes` 项目节点记录

## 文件结构与数据流

```
rules-source.md ──(node build.js)──▶ skills.json ──▶ index.js 循环 ctx.skills.register()
```

## 修改规则的工作流

1. 只编辑 `rules-source.md`（结构约定：frontmatter 含 `name`/`description`；条款标题 `## N. 标题` 编号连续且共 10 节；文末保留 `## 交付前自检`）；
2. `node build.js` —— 校验结构并做内容对等（生成物拼回必须与原文逐行一致），失败时不写任何文件；增删条款节时同步 `build.js` 的 `SKILL_DEFS` 映射表；
3. 在 Harness 里对该 bundle 执行 remove + install（或重启应用）生效。

## 安装


在 DeepSeek Harness 的插件市场中搜索 **开发交付规则**（Dev delivery rules）安装；或手动安装：

- 从 Releases 下载 `dsh-skill-dev-delivery-rules.tgz`，在插件管理中安装该包；
- 或克隆本仓库后，在插件管理中安装本地目录。

安装后新会话的技能目录即出现 `dev-delivery-rules`。需要 profile 组合中存在技能注册表（`@deepseek-ai/dsh-skill`，标准 preset 已包含），否则插件行自动跳过、不影响其他功能。

## License

MIT
