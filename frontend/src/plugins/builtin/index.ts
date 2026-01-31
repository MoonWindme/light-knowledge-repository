/**
 * 内置插件注册
 */

import { registerBuiltinPlugin, usePluginStore } from '../PluginManager'
import { AIAssistantPlugin } from './ai-assistant'

/**
 * 初始化内置插件
 */
export function initBuiltinPlugins() {
  // 注册 AI 辅助插件
  registerBuiltinPlugin(AIAssistantPlugin)
}

/**
 * 激活已启用的内置插件
 */
export async function activateBuiltinPlugins() {
  const { activatePlugin, installedPlugins } = usePluginStore.getState()
  
  // 检查 AI 辅助插件是否需要自动安装
  if (!installedPlugins.has('ai-assistant')) {
    // 默认不自动安装，让用户通过插件市场安装
    // await usePluginStore.getState().installPlugin(AIAssistantPlugin)
  } else {
    const plugin = installedPlugins.get('ai-assistant')
    if (plugin?.enabled && plugin.state !== 'active') {
      await activatePlugin('ai-assistant')
    }
  }
}
