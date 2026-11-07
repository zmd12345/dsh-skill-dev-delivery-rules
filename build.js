/**
 * 从 rules-source.md 再生成插件的全部派生内容：
 *   sections/section-NN.md  —— 各条款全文（模型按需 read）
 *   skill-body.md           —— 技能正文（索引 + 交付自检，注册时作为 content）
 *   meta.json               —— 注册用的 name/description/whenToUse（description 取源文件 frontmatter）
 *
 * 用法：node build.js   （改规则只改 rules-source.md，然后跑本脚本并重装 bundle）
 * 校验失败时不写任何文件；新增/删除条款节时需同步下方 SCENES 映射表。
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_DIR = dirname(fileURLToPath(import.meta.url))
const SOURCE = join(PKG_DIR, 'rules-source.md')
const SECTIONS_DIR = join(PKG_DIR, 'sections')

const SKILL_NAME = 'dev-delivery-rules'

/** 场景 → 条款文件映射（正文表格；序号必须与源文件一致）。 */
const SCENES = [
	['section-01.md', '需求含糊、缺关键信息、多实现方向、不可逆操作（任何任务开始时先判断）'],
	['section-02.md', '新建项目 / 决定代码放哪、目录分层'],
	['section-03.md', '修复 Bug、定位问题、调试'],
	['section-04.md', '评估改动影响面、控制 diff 范围'],
	['section-05.md', '决定验证范围（L1 小改动 ~ L4 大重构）'],
	['section-06.md', '迁移、框架升级、大规模重构'],
	['section-07.md', '带 GUI 的异步交互（loading、错误提示、危险确认、提交反馈）'],
	['section-08.md', '前端/GUI 样式与布局尺寸'],
	['section-09.md', '命令行删除/备份/编码/远程仓库/垃圾数据清理'],
	['section-10.md', '重要节点与项目信息沉淀']
]

const ADVICE = '典型开发任务通常只需 01、04、05 加场景相关的一两节；纯后端小修通常不必读 07、08。'

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
	if (meta.name !== SKILL_NAME) fail(`frontmatter name 应为 "${SKILL_NAME}"，实际 "${meta.name}"`)
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
	if (heads.length !== SCENES.length) fail(`条款节数量 ${heads.length} 与 SCENES 映射表 ${SCENES.length} 不一致，请同步修改 build.js`)
	heads.forEach(([ , num], k) => {
		if (num !== k + 1) fail(`第 ${k + 1} 个条款标题编号为 ${num}，编号必须连续且从 1 开始`)
	})
	const lastHeadEnd = heads[heads.length - 1][0]
	let boundary = lines.findIndex((l, i) => i > lastHeadEnd && /^## /.test(l))
	if (boundary === -1) boundary = selfIdx
	if (boundary !== selfIdx) fail('"## 交付前自检" 前还有未识别的 "## " 标题')
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

function renderBody({ sections, selfCheck }) {
	const rows = SCENES.map(([file, scene], k) => {
		const num = String(k + 1).padStart(2, '0')
		const title = sections[k][1].split('\n')[0].replace(/^## \d+\.\s*/, '')
		return `| ${scene} | ${num} ${title} | section-${num}.md |`
	}).join('\n')
	return `# 开发交付规则（按条款加载）

本技能是强制工作规则。**不要通读全部条款**：按当前任务场景，用 read 工具读取下表中对应的条款文件（路径相对本技能基目录），只读必需的那几节；动手前完成需求澄清判断，交付前逐项对照文末自检。

规则优先级：用户当次对话中的明确指令高于条款原文；冲突时先向用户指出，再按用户当次选择执行。

## 场景 → 条款文件映射

| 任务场景 | 条款 | 读取文件 |
|---|---|---|
${rows}

${ADVICE}

${selfCheck}`
}

const raw = await readFile(SOURCE, 'utf8')
const { description, body } = parseSource(raw)
const parsed = splitSections(body)
assertParity(body, parsed)
// 自检一节开头那句是总则说明，补注细节出处
const selfCheck = parsed.selfCheck.replace('完成任务前逐项对照：', '完成任务前逐项对照（各条细节见对应条款文件）：')
const content = renderBody({ description, sections: parsed.sections, selfCheck })

await mkdir(SECTIONS_DIR, { recursive: true })
for (const [num, text] of parsed.sections) {
	const name = `section-${String(num).padStart(2, '0')}.md`
	await writeFile(join(SECTIONS_DIR, name), text + '\n')
}
await writeFile(join(PKG_DIR, 'skill-body.md'), content)
await writeFile(
	join(PKG_DIR, 'meta.json'),
	JSON.stringify(
		{
			name: SKILL_NAME,
			description,
			whenToUse: '开发功能、修复 Bug、重构、迁移、优化、调试、测试验证或数据清理时使用，作为交付全流程的强制工作规则。'
		},
		null,
		2
	) + '\n'
)
console.log(
	`OK: ${parsed.sections.length} 节, body ${content.length} 字符（源全文 ${body.length} 字符）, 内容对等校验通过`
)
