/**
 * Host 插件：把《开发交付规则》注册为一组"技能家族"。
 *
 * 1 个核心技能（总则 + 需求澄清 + 导航 + 交付自检）常驻按需加载，
 * 9 个专项技能（分层/调试/最小变更/验证分级/迁移对等/UI反馈/样式尺寸/
 * 命令行安全/项目记录）按任务场景由模型自动加载对应的那几个——
 * 每个会话只为真正用到的规则付 token。
 *
 * 本文件不内嵌任何规则文本：skills.json 是 build.js 从 rules-source.md
 * 生成的产物。修改规则的唯一入口是 rules-source.md，然后：
 *   node build.js   →  重装 bundle（remove_bundle + install_bundle）
 */
export const name = 'skill-dev-delivery-rules'

export const inject = ['skills']

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const PKG_DIR = dirname(fileURLToPath(import.meta.url))

export function apply(ctx) {
	let skills
	try {
		skills = JSON.parse(readFileSync(join(PKG_DIR, 'skills.json'), 'utf8'))
	} catch (error) {
		throw new Error(
			`dsh-skill-dev-delivery-rules: skills.json 缺失或损坏，请先在本包目录运行 "node build.js"（${error.message}）`
		)
	}
	for (const s of skills) {
		const disposer = ctx.skills.register({
			name: s.name,
			description: s.description,
			source: 'dsh-skill-dev-delivery-rules',
			content: s.content
		})
		// ctx.effect 会立即执行传入的 setup 并把返回值作为清理函数；
		// 必须包一层 () => disposer，而不是把 disposer 本身当 setup 传入。
		ctx.effect(() => disposer, `${s.name}: skill registration`)
	}
}
