/**
 * 插件系统入口
 */

export * from './types'
export * from './PluginManager'
export { createPluginContext, registeredToolbarButtons, registeredContextMenuItems, onUIChange } from './PluginContext'

// 重新导出常用类型
export type {
  Plugin,
  PluginManifest,
  PluginContext,
  InstalledPlugin,
  MarketPlugin,
  ToolbarButton,
  ContextMenuItem,
  Disposable,
} from './types'
