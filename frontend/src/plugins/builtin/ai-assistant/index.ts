/**
 * AI 辅助写作插件
 * 提供智能续写、翻译、语法检查等功能
 */

import type { Plugin, PluginContext, Disposable } from '../../types'

// AI API 响应类型
interface AIResponse {
  success: boolean
  result?: string
  error?: string
}

// 插件状态
let disposables: Disposable[] = []

export const AIAssistantPlugin: Plugin = {
  manifest: {
    id: 'ai-assistant',
    name: 'AI 辅助写作',
    version: '1.0.0',
    description: '智能续写、翻译、语法检查等 AI 辅助功能',
    author: 'Markdown Notes',
    icon: '✨',
    keywords: ['AI', '写作', '翻译', '语法'],
  },

  async activate(ctx: PluginContext) {
    ctx.log.info('AI 辅助写作插件已激活')

    // 注册工具栏按钮 - 智能续写
    disposables.push(
      ctx.ui.registerToolbarButton({
        id: 'ai-complete',
        icon: 'Sparkles',
        title: 'AI 续写',
        onClick: () => handleComplete(ctx),
        group: 'ai',
        order: 1,
      })
    )

    // 注册工具栏按钮 - 翻译
    disposables.push(
      ctx.ui.registerToolbarButton({
        id: 'ai-translate',
        icon: 'Languages',
        title: '翻译',
        onClick: () => handleTranslate(ctx),
        group: 'ai',
        order: 2,
      })
    )

    // 注册工具栏按钮 - 语法检查
    disposables.push(
      ctx.ui.registerToolbarButton({
        id: 'ai-grammar',
        icon: 'SpellCheck',
        title: '语法检查',
        onClick: () => handleGrammar(ctx),
        group: 'ai',
        order: 3,
      })
    )

    // 注册右键菜单 - 翻译选中文本
    disposables.push(
      ctx.ui.registerContextMenuItem({
        id: 'ai-translate-selection',
        label: '翻译选中文本',
        onClick: () => handleTranslateSelection(ctx),
        group: 'ai',
        when: () => {
          const selection = ctx.editor.getSelection()
          return selection !== null && selection.text.length > 0
        },
      })
    )

    // 注册右键菜单 - 优化选中文本
    disposables.push(
      ctx.ui.registerContextMenuItem({
        id: 'ai-improve-selection',
        label: '优化选中文本',
        onClick: () => handleImproveSelection(ctx),
        group: 'ai',
        when: () => {
          const selection = ctx.editor.getSelection()
          return selection !== null && selection.text.length > 0
        },
      })
    )
  },

  deactivate() {
    // 清理注册的资源
    disposables.forEach((d) => d.dispose())
    disposables = []
  },
}

/**
 * 调用 AI API
 */
async function callAI(
  ctx: PluginContext,
  action: 'complete' | 'translate' | 'grammar',
  text: string,
  targetLang?: string
): Promise<AIResponse> {
  try {
    const response = await ctx.network.fetch(`/api/ai/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: { text, action, targetLang },
    })

    if (!response.ok) {
      return { success: false, error: `请求失败: ${response.status}` }
    }

    return await response.json<AIResponse>()
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '网络错误',
    }
  }
}

/**
 * 处理智能续写
 */
async function handleComplete(ctx: PluginContext) {
  const content = ctx.editor.getContent()
  if (!content.trim()) {
    ctx.ui.showNotification('请先输入一些内容', 'warning')
    return
  }

  ctx.ui.showNotification('正在生成续写内容...', 'info')

  const response = await callAI(ctx, 'complete', content)

  if (response.success && response.result) {
    ctx.editor.setContent(response.result)
    ctx.ui.showNotification('续写完成', 'success')
  } else {
    ctx.ui.showNotification(response.error || '续写失败', 'error')
  }
}

/**
 * 处理翻译
 */
async function handleTranslate(ctx: PluginContext) {
  const content = ctx.editor.getContent()
  if (!content.trim()) {
    ctx.ui.showNotification('请先输入一些内容', 'warning')
    return
  }

  // 让用户选择目标语言
  const choice = await ctx.ui.showQuickPick(
    [
      { label: '翻译为中文', description: 'zh' },
      { label: '翻译为英文', description: 'en' },
    ],
    { title: '选择目标语言' }
  )

  if (!choice) return

  const targetLang = choice.description

  ctx.ui.showNotification('正在翻译...', 'info')

  const response = await callAI(ctx, 'translate', content, targetLang)

  if (response.success && response.result) {
    ctx.editor.setContent(response.result)
    ctx.ui.showNotification('翻译完成', 'success')
  } else {
    ctx.ui.showNotification(response.error || '翻译失败', 'error')
  }
}

/**
 * 处理语法检查
 */
async function handleGrammar(ctx: PluginContext) {
  const content = ctx.editor.getContent()
  if (!content.trim()) {
    ctx.ui.showNotification('请先输入一些内容', 'warning')
    return
  }

  ctx.ui.showNotification('正在检查语法...', 'info')

  const response = await callAI(ctx, 'grammar', content)

  if (response.success && response.result) {
    ctx.editor.setContent(response.result)
    ctx.ui.showNotification('语法检查完成', 'success')
  } else {
    ctx.ui.showNotification(response.error || '语法检查失败', 'error')
  }
}

/**
 * 处理翻译选中文本
 */
async function handleTranslateSelection(ctx: PluginContext) {
  const selection = ctx.editor.getSelection()
  if (!selection || !selection.text.trim()) {
    ctx.ui.showNotification('请先选中一些文本', 'warning')
    return
  }

  // 自动检测语言并选择目标语言
  const hasChineseChars = /[\u4e00-\u9fa5]/.test(selection.text)
  const targetLang = hasChineseChars ? 'en' : 'zh'

  ctx.ui.showNotification('正在翻译选中文本...', 'info')

  const response = await callAI(ctx, 'translate', selection.text, targetLang)

  if (response.success && response.result) {
    ctx.editor.replaceSelection(response.result)
    ctx.ui.showNotification('翻译完成', 'success')
  } else {
    ctx.ui.showNotification(response.error || '翻译失败', 'error')
  }
}

/**
 * 处理优化选中文本
 */
async function handleImproveSelection(ctx: PluginContext) {
  const selection = ctx.editor.getSelection()
  if (!selection || !selection.text.trim()) {
    ctx.ui.showNotification('请先选中一些文本', 'warning')
    return
  }

  ctx.ui.showNotification('正在优化文本...', 'info')

  const response = await callAI(ctx, 'grammar', selection.text)

  if (response.success && response.result) {
    ctx.editor.replaceSelection(response.result)
    ctx.ui.showNotification('优化完成', 'success')
  } else {
    ctx.ui.showNotification(response.error || '优化失败', 'error')
  }
}

export default AIAssistantPlugin
