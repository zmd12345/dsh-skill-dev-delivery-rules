# dsh-skill-dev-delivery-rules

把《开发交付规则》注册为 DeepSeek Harness 的**渐进披露**会话技能。

安装后，会话技能目录中出现 `dev-delivery-rules`；开发功能、修复 Bug、重构、迁移、优化、调试、测试验证或数据清理时，Agent 通过 `skill` 工具加载的只是**索引正文**（场景 → 条款映射 + 交付前自检，约 1.3K 字符），条款全文存放在 `sections/` 按任务场景用 `read` 工具逐节加载，显著降低常驻上下文开销。

## 文件结构与数据流

```
rules-source.md ──(node build.js)──▶ sections/section-01..10.md   条款全文，按需 read
                            └─────▶ skill-body.md                 技能正文（索引+自检）
                            └─────▶ meta.json                     注册元数据（name/description/whenToUse）
index.js ──读取以上产物──▶ ctx.skills.register(...)               运行时技能
```

## 修改规则的工作流

1. 只编辑 `rules-source.md`（保持结构约定：frontmatter 含 `name`/`description`；条款标题 `## N. 标题` 编号连续；文末保留 `## 交付前自检`）；
2. `node build.js` —— 校验结构并对等性（生成内容与原文逐行一致，仅差空行/分隔线），失败时不写出任何文件；新增/删除条款节时同步 `build.js` 里的 `SCENES` 场景映射表；
3. 在 Harness 里对该 bundle 执行 remove + install（或重启应用）生效。

## 组成

- [index.js](index.js)：Host 插件，`ctx.skills.register()` 注册运行时技能；需要 profile 组合中存在 `ctx.skills`（`@deepseek-ai/dsh-skill` 注册表），缺失时本行不活动。
- [build.js](build.js)：派生内容生成器与校验门。
- [cordis.patch.yml](cordis.patch.yml)：将插件行插入 profile 组合树。

## 安装

在 DeepSeek Harness 的插件市场中搜索 **开发交付规则**（Dev delivery rules）安装；或手动安装：

- 从 Releases 下载 `dsh-skill-dev-delivery-rules.tgz`，在插件管理中安装该包；
- 或克隆本仓库后，在插件管理中安装本地目录。

安装后新会话的技能目录即出现 `dev-delivery-rules`。需要 profile 组合中存在技能注册表（`@deepseek-ai/dsh-skill`，标准 preset 已包含），否则插件行自动跳过、不影响其他功能。

## License

MIT
