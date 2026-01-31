/**
 * 插件管理器
 * 负责插件的加载、激活、停用和管理
 */

import { create } from 'zustand'
import type { Plugin, InstalledPlugin, PluginState, Disposable } from './types'
import { createPluginContext } from './PluginContext'

// 插件实例存储
const pluginInstances = new Map<string, Plugin>()
const pluginContexts = new Map<string, ReturnType<typeof createPluginContext>>()
const pluginDisposables = new Map<string, Disposable[]>()

// 插件 Store
interface PluginStore {
  installedPlugins: Map<string, InstalledPlugin>
  isLoading: boolean
  error: string | null

  // Actions
  loadPlugins: () => Promise<void>
  installPlugin: (plugin: Plugin) => Promise<void>
  uninstallPlugin: (pluginId: string) => Promise<void>
  enablePlugin: (pluginId: string) => Promise<void>
  disablePlugin: (pluginId: string) => Promise<void>
  activatePlugin: (pluginId: string) => Promise<void>
  deactivatePlugin: (pluginId: string) => Promise<void>
  getPlugin: (pluginId: string) => InstalledPlugin | undefined
  getAllPlugins: () => InstalledPlugin[]
}

// 持久化键
const STORAGE_KEY = 'installed_plugins'

// 从 localStorage 加载插件数据
function loadPluginsFromStorage(): Map<string, InstalledPlugin> {
  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (data) {
      const parsed = JSON.parse(data) as [string, InstalledPlugin][]
      return new Map(parsed)
    }
  } catch (error) {
    console.error('Failed to load plugins from storage:', error)
  }
  return new Map()
}

// 保存插件数据到 localStorage
function savePluginsToStorage(plugins: Map<string, InstalledPlugin>): void {
  try {
    const data = Array.from(plugins.entries())
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.error('Failed to save plugins to storage:', error)
  }
}

export const usePluginStore = create<PluginStore>((set, get) => ({
  installedPlugins: new Map(),
  isLoading: false,
  error: null,

  loadPlugins: async () => {
    set({ isLoading: true, error: null })
    try {
      const plugins = loadPluginsFromStorage()
      set({ installedPlugins: plugins, isLoading: false })

      // 自动激活已启用的插件
      for (const [pluginId, plugin] of plugins) {
        if (plugin.enabled && plugin.state === 'active') {
          // 插件需要重新加载和激活
          // 这里只更新状态，实际激活在插件加载时处理
          plugins.set(pluginId, { ...plugin, state: 'inactive' })
        }
      }
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : '加载插件失败',
      })
    }
  },

  installPlugin: async (plugin: Plugin) => {
    const { installedPlugins } = get()
    const pluginId = plugin.manifest.id

    if (installedPlugins.has(pluginId)) {
      throw new Error(`插件 ${pluginId} 已安装`)
    }

    // 存储插件实例
    pluginInstances.set(pluginId, plugin)

    // 创建安装记录
    const installedPlugin: InstalledPlugin = {
      manifest: plugin.manifest,
      state: 'inactive',
      enabled: true,
      installedAt: new Date().toISOString(),
    }

    const newPlugins = new Map(installedPlugins)
    newPlugins.set(pluginId, installedPlugin)
    set({ installedPlugins: newPlugins })
    savePluginsToStorage(newPlugins)

    // 自动激活
    await get().activatePlugin(pluginId)
  },

  uninstallPlugin: async (pluginId: string) => {
    const { installedPlugins, deactivatePlugin } = get()

    if (!installedPlugins.has(pluginId)) {
      throw new Error(`插件 ${pluginId} 未安装`)
    }

    // 先停用
    await deactivatePlugin(pluginId)

    // 清理实例
    pluginInstances.delete(pluginId)
    pluginContexts.delete(pluginId)

    // 移除安装记录
    const newPlugins = new Map(installedPlugins)
    newPlugins.delete(pluginId)
    set({ installedPlugins: newPlugins })
    savePluginsToStorage(newPlugins)
  },

  enablePlugin: async (pluginId: string) => {
    const { installedPlugins, activatePlugin } = get()
    const plugin = installedPlugins.get(pluginId)

    if (!plugin) {
      throw new Error(`插件 ${pluginId} 未安装`)
    }

    if (plugin.enabled) return

    const newPlugins = new Map(installedPlugins)
    newPlugins.set(pluginId, { ...plugin, enabled: true })
    set({ installedPlugins: newPlugins })
    savePluginsToStorage(newPlugins)

    // 激活插件
    await activatePlugin(pluginId)
  },

  disablePlugin: async (pluginId: string) => {
    const { installedPlugins, deactivatePlugin } = get()
    const plugin = installedPlugins.get(pluginId)

    if (!plugin) {
      throw new Error(`插件 ${pluginId} 未安装`)
    }

    if (!plugin.enabled) return

    // 先停用
    await deactivatePlugin(pluginId)

    const newPlugins = new Map(installedPlugins)
    newPlugins.set(pluginId, { ...plugin, enabled: false })
    set({ installedPlugins: newPlugins })
    savePluginsToStorage(newPlugins)
  },

  activatePlugin: async (pluginId: string) => {
    const { installedPlugins } = get()
    const installedPlugin = installedPlugins.get(pluginId)

    if (!installedPlugin) {
      throw new Error(`插件 ${pluginId} 未安装`)
    }

    if (installedPlugin.state === 'active') return

    const plugin = pluginInstances.get(pluginId)
    if (!plugin) {
      // 插件实例不存在，可能是从存储恢复的
      // 需要重新加载插件代码
      console.warn(`插件 ${pluginId} 实例不存在，跳过激活`)
      return
    }

    // 更新状态
    const updateState = (state: PluginState, error?: string) => {
      const plugins = new Map(get().installedPlugins)
      plugins.set(pluginId, { ...plugins.get(pluginId)!, state, error })
      set({ installedPlugins: plugins })
      savePluginsToStorage(plugins)
    }

    updateState('activating')

    try {
      // 创建上下文
      const context = createPluginContext(pluginId)
      pluginContexts.set(pluginId, context)

      // 调用激活钩子
      await plugin.activate(context)

      updateState('active')
      console.info(`插件 ${pluginId} 已激活`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '激活失败'
      updateState('error', message)
      console.error(`插件 ${pluginId} 激活失败:`, error)
    }
  },

  deactivatePlugin: async (pluginId: string) => {
    const { installedPlugins } = get()
    const installedPlugin = installedPlugins.get(pluginId)

    if (!installedPlugin) {
      throw new Error(`插件 ${pluginId} 未安装`)
    }

    if (installedPlugin.state !== 'active') return

    const plugin = pluginInstances.get(pluginId)
    if (!plugin) return

    // 更新状态
    const updateState = (state: PluginState, error?: string) => {
      const plugins = new Map(get().installedPlugins)
      plugins.set(pluginId, { ...plugins.get(pluginId)!, state, error })
      set({ installedPlugins: plugins })
      savePluginsToStorage(plugins)
    }

    updateState('deactivating')

    try {
      // 调用停用钩子
      if (plugin.deactivate) {
        await plugin.deactivate()
      }

      // 清理 disposables
      const disposables = pluginDisposables.get(pluginId)
      if (disposables) {
        disposables.forEach((d) => d.dispose())
        pluginDisposables.delete(pluginId)
      }

      // 清理上下文
      pluginContexts.delete(pluginId)

      updateState('inactive')
      console.info(`插件 ${pluginId} 已停用`)
    } catch (error) {
      const message = error instanceof Error ? error.message : '停用失败'
      updateState('error', message)
      console.error(`插件 ${pluginId} 停用失败:`, error)
    }
  },

  getPlugin: (pluginId: string) => {
    return get().installedPlugins.get(pluginId)
  },

  getAllPlugins: () => {
    return Array.from(get().installedPlugins.values())
  },
}))

/**
 * 注册内置插件
 */
export function registerBuiltinPlugin(plugin: Plugin): void {
  pluginInstances.set(plugin.manifest.id, plugin)
}

/**
 * 获取插件上下文（供插件内部使用）
 */
export function getPluginContext(pluginId: string): ReturnType<typeof createPluginContext> | undefined {
  return pluginContexts.get(pluginId)
}

/**
 * 添加 disposable（供插件内部使用）
 */
export function addDisposable(pluginId: string, disposable: Disposable): void {
  if (!pluginDisposables.has(pluginId)) {
    pluginDisposables.set(pluginId, [])
  }
  pluginDisposables.get(pluginId)!.push(disposable)
}
