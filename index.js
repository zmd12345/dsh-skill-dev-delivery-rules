/**
 * Host 插件：把《开发交付规则》注册为"渐进披露"型会话技能。
 *
 * 本文件不内嵌任何规则文本：正文（skill-body.md）、注册元数据
 * （meta.json）与条款全文（sections/）都是 build.js 从 rules-source.md
 * 生成的产物。修改规则的唯一入口是 rules-source.md，然后：
 *   node build.js   →  重装 bundle（remove_bundle + install_bundle）
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

export const name = 'skill-dev-delivery-rules'

export const inject = ['skills']

const PKG_DIR = dirname(fileURLToPath(import.meta.url))
const SECTIONS_DIR = join(PKG_DIR, 'sections')

function readGenerated(file) {
	try {
		return readFileSync(join(PKG_DIR, file), 'utf8')
	} catch (error) {
		throw new Error(
			`dsh-skill-dev-delivery-rules: ${file} 缺失，请先在本包目录运行 "node build.js"（${error.message}）`
		)
	}
}

export function apply(ctx) {
	const meta = JSON.parse(readGenerated('meta.json'))
	const content = readGenerated('skill-body.md')
	const disposer = ctx.skills.register({
		name: meta.name,
		description: meta.description,
		whenToUse: meta.whenToUse,
		source: 'dsh-skill-dev-delivery-rules',
		resourceBase: { kind: 'directory', path: SECTIONS_DIR },
		content
	})
	// ctx.effect 会立即执行传入的 setup 并把返回值作为清理函数；
	// 必须包一层 () => disposer，而不是把 disposer 本身当 setup 传入。
	ctx.effect(() => disposer, `${meta.name}: skill registration`)
}
