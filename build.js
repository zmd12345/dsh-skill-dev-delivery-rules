/**
 * 从 rules-source.md 生成技能家族的全部产物 skills.json：
 *   1 个核心技能（总则 + 需求澄清 + 导航 + 交付自检）
 *   9 个专项技能（第 2~10 节各一个，正文为条款原文）
 *
 * 用法：node build.js   （改规则只改 rules-source.md，然后跑本脚本并重装 bundle）
 * 校验失败时不写任何文件；增删条款节时需同步下方 SKILL_DEFS 映射表。
 */
import { readFile, writeFile, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_DIR = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(PKG_DIR, 'rules-source.md')
const OUTPUT = join(PKG_DIR, 'skills.json')

const CORE_NAME = 'dev-delivery-rules'

/** 专项技能定义：source = rules-source.md 中的 "## N." 节号。 */
const SKILL_DEFS = [
	{
		name: 'dev-architecture-layers',
		source: 2,
		description: '分层架构规范：沿用项目现有分层、新项目按职责分层、各层职责单一、依赖只能自上而下。新建项目、决定代码放哪、设计目录结构时加载。'
	},
	{
		name: 'dev-evidence-debug',
		source: 3,
		description: '证据驱动调试：复现→读代码日志定位根因→最小修改→验证，禁止猜测式改代码。修 Bug、排查问题、调试时加载。'
	},
	{
		name: 'dev-minimal-changes',
		source: 4,
		description: '最小变更原则：先评估影响面、diff 只含必需改动、不夹带无关重构、公共代码逐一排查调用方。修改已有代码前加载。'
	},
	{
		name: 'dev-verify-grading',
		source: 5,
		description: '验证范围 L1~L4 分级判定：局部小改动只验改动点，公共代码才回归调用方，禁止小题大做式全量测试。决定测试与验证范围时加载。'
	},
	{
		name: 'dev-migration-parity',
		source: 6,
		description: '迁移与重构功能对等：迁移前盘点基线、不遗漏不擅增、偏差须批准、迁移后按类型全面验证。代码迁移、框架升级、大规模重构时加载。'
	},
	{
		name: 'dev-ui-feedback',
		source: 7,
		description: 'GUI 异步交互四项要求：加载态、可理解的错误提示、危险操作二次确认、提交结果反馈。实现 Web/移动端/桌面界面的异步交互时加载。'
	},
	{
		name: 'dev-style-sizing',
		source: 8,
		description: '前端样式尺寸规范：宽高必须来自设计稿标注、容器计算或实测值，禁止臆测魔法数值，优先自适应布局。修改样式、布局、给定尺寸时加载。'
	},
	{
		name: 'dev-cli-safety',
		source: 9,
		description: '命令行与仓库操作安全：删除前列清单确认、重要数据先备份、编码报错记录规避、远程仓库走授权通道、测试垃圾数据清理。执行删除/备份/清理类命令前加载。'
	},
	{
		name: 'dev-project-notes',
		source: 10,
		description: '项目节点与重要信息记录：需求定稿、方案决策、架构调整、关键修复后沉淀可检索的项目记忆，不记敏感凭据。完成重要节点时加载。'
	}
]

/** 核心技能的导航表（供正文生成）。 */
const NAV_INTRO = '本技能族按场景拆分：动手前对照下表，用 skill 工具加载命中的专项技能（可多个），只读任务真正需要的规则。'

function fail(message) {
	throw new Error(`build: ${message}`)
}

/** 剥离 frontmatter 并解析 name/description。 */
function parseSource(raw) {
	const m = raw.match(/^---\n([\s\S]*?)\n---\n?/)
	if (m === null) fail('rules-source.md 缺少 YAML frontmatter')
	const meta = {}
	for (const line of m[1].split('\n')) {
		const kv = line.match(/^(name|description):\s*(.+)$/)
		if (kv !== null) meta[kv[1]] = kv[2].trim()
	}
	if (meta.name !== CORE_NAME) fail(`frontmatter name 应为 "${CORE_NAME}"，实际 "${meta.name}"`)
	if (typeof meta.description !== 'string' || meta.description.length === 0) fail('frontmatter 缺少 description')
	return { description: meta.description, body: raw.slice(m[0].length).trim() }
}

/** 按 "## N. 标题" 切节，以 "## 交付前自检" 收尾；校验编号连续。 */
function splitSections(body) {
	const heads = []
	const lines = body.split('\n')
	lines.forEach((line, i) => {
		const m = line.match(/^## (\d+)\./)
		if (m !== null) heads.push([i, Number(m[1])])
	})
	const selfIdx = lines.findIndex((l) => /^## 交付前自检/.test(l))
	if (selfIdx === -1) fail('缺少 "## 交付前自检" 一节')
	const expect = SKILL_DEFS.length + 1 // 第 1 节归核心
	if (heads.length !== expect) fail(`条款节数量 ${heads.length} 与映射表 ${expect} 不一致，请同步修改 build.js`)
	heads.forEach(([, num], k) => {
		if (num !== k + 1) fail(`第 ${k + 1} 个条款标题编号为 ${num}，编号必须连续且从 1 开始`)
	})
	const sections = heads.map(([start, num], k) => {
		const end = k + 1 < heads.length ? heads[k + 1][0] : selfIdx
		return [num, lines.slice(start, end).join('\n').trim()]
	})
	const selfCheck = lines.slice(selfIdx).join('\n').trim()
	const header = lines.slice(0, heads[0][0]).join('\n').trim()
	return { header, sections, selfCheck }
}

/** 内容对等校验：去掉空行与分隔线后，header+各节+自检拼接必须与原文一致。 */
function assertParity(body, { header, sections, selfCheck }) {
	const norm = (s) => s.split('\n').filter((l) => l.trim() !== '' && l.trim() !== '---').join('\n')
	const rebuilt = [header, ...sections.map(([, t]) => t), selfCheck].join('\n')
	if (norm(rebuilt) !== norm(body)) fail('生成内容与 rules-source.md 不等价（丢失或改写了原文行）')
}

function buildCore(header, section1, selfCheck) {
	const nav = SKILL_DEFS.map((d) => `| ${d.description.split('。')[0]} | \`${d.name}\` |`).join('\n')
	return `${header}

${section1}

## 规则导航（按需加载专项技能）

${NAV_INTRO}

| 命中场景 | 加载技能 |
|---|---|
${nav}

${selfCheck}`
}

const raw = await readFile(SOURCE, 'utf8')
const { description, body } = parseSource(raw)
const parsed = splitSections(body)
assertParity(body, parsed)

const byNum = new Map(parsed.sections)
const skills = [
	{
		name: CORE_NAME,
		description,
		content: buildCore(parsed.header, byNum.get(1), parsed.selfCheck)
	},
	...SKILL_DEFS.map((d) => {
		const text = byNum.get(d.source)
		if (typeof text !== 'string') fail(`缺少第 ${d.source} 节`)
		return { name: d.name, description: d.description, content: text }
	})
]

// 校验：每个技能名合法、内容非空、专项技能正文必须完整包含对应节原文
const NAME_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
for (const s of skills) {
	if (!NAME_RE.test(s.name)) fail(`技能名不合法: ${s.name}`)
	if (!s.description || !s.content) fail(`技能 ${s.name} 缺少 description 或 content`)
}

await writeFile(OUTPUT, JSON.stringify(skills, null, 2) + '\n')

// 清理旧渐进披露方案的生成物（sections/ 目录、skill-body.md、meta.json）
await rm(join(PKG_DIR, 'sections'), { recursive: true, force: true })
await rm(join(PKG_DIR, 'skill-body.md'), { force: true })
await rm(join(PKG_DIR, 'meta.json'), { force: true })

const totalChars = skills.reduce((a, s) => a + s.content.length, 0)
console.log(`OK: ${skills.length} 个技能（core ${skills[0].content.length} 字符，专项共 ${totalChars - skills[0].content.length} 字符），源全文 ${body.length} 字符，内容对等校验通过`)
