/**
 * 插件系统类型定义
 */

// 插件基本信息
export interface PluginManifest {
  id: string
  name: string
  version: string
  description: string
  author: string
  icon?: string
  keywords?: string[]
  repository?: string
  homepage?: string
  license?: string
  // 依赖的其他插件
  dependencies?: Record<string, string>
  // 扩展点声明
  contributes?: PluginContributes
}

// 插件贡献点
export interface PluginContributes {
  // 工具栏按钮
  toolbarButtons?: ToolbarButtonContribution[]
  // 右键菜单项
  contextMenuItems?: ContextMenuContribution[]
  // 命令
  commands?: CommandContribution[]
  // 配置项
  configuration?: ConfigurationContribution
  // 快捷键
  keybindings?: KeybindingContribution[]
}

// 工具栏按钮贡献
export interface ToolbarButtonContribution {
  id: string
  title: string
  icon: string
  command: string
  group?: string
  order?: number
}

// 右键菜单贡献
export interface ContextMenuContribution {
  id: string
  label: string
  command: string
  group?: string
  order?: number
  when?: string
}

// 命令贡献
export interface CommandContribution {
  id: string
  title: string
  category?: string
}

// 配置贡献
export interface ConfigurationContribution {
  title: string
  properties: Record<string, ConfigurationProperty>
}

export interface ConfigurationProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object'
  default?: unknown
  description?: string
  enum?: string[]
  minimum?: number
  maximum?: number
}

// 快捷键贡献
export interface KeybindingContribution {
  command: string
  key: string
  mac?: string
  when?: string
}

// 插件实例接口
export interface Plugin {
  manifest: PluginManifest
  // 生命周期钩子
  activate(context: PluginContext): void | Promise<void>
  deactivate?(): void | Promise<void>
}

// 插件上下文 - 提供给插件使用的 API
export interface PluginContext {
  // 插件信息
  pluginId: string
  pluginPath: string

  // 编辑器 API
  editor: EditorAPI

  // UI 扩展 API
  ui: UIAPI

  // 存储 API
  storage: StorageAPI

  // 网络 API
  network: NetworkAPI

  // 事件 API
  events: EventsAPI

  // 日志 API
  log: LogAPI
}

// 编辑器 API
export interface EditorAPI {
  // 获取当前内容
  getContent(): string
  // 设置内容
  setContent(content: string): void
  // 在光标位置插入文本
  insertText(text: string): void
  // 获取选中的文本
  getSelection(): EditorSelection | null
  // 替换选中的文本
  replaceSelection(text: string): void
  // 获取当前笔记信息
  getCurrentNote(): NoteInfo | null
  // 监听内容变化
  onContentChange(callback: (content: string) => void): Disposable
}

export interface EditorSelection {
  start: number
  end: number
  text: string
}

export interface NoteInfo {
  id: string
  title: string
  path?: string
}

// UI API
export interface UIAPI {
  // 注册工具栏按钮
  registerToolbarButton(button: ToolbarButton): Disposable
  // 注册右键菜单项
  registerContextMenuItem(item: ContextMenuItem): Disposable
  // 显示通知
  showNotification(message: string, type?: NotificationType): void
  // 显示模态框
  showModal<T = unknown>(options: ModalOptions): Promise<T | null>
  // 显示输入框
  showInputBox(options: InputBoxOptions): Promise<string | null>
  // 显示快速选择
  showQuickPick<T extends QuickPickItem>(items: T[], options?: QuickPickOptions): Promise<T | null>
}

export interface ToolbarButton {
  id: string
  icon: string
  title: string
  onClick: () => void
  group?: string
  order?: number
}

export interface ContextMenuItem {
  id: string
  label: string
  onClick: () => void
  group?: string
  order?: number
  when?: () => boolean
}

export type NotificationType = 'info' | 'success' | 'error' | 'warning'

export interface ModalOptions {
  title: string
  content: React.ReactNode | string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
}

export interface InputBoxOptions {
  title?: string
  placeholder?: string
  value?: string
  validateInput?: (value: string) => string | null
}

export interface QuickPickItem {
  label: string
  description?: string
  detail?: string
}

export interface QuickPickOptions {
  title?: string
  placeholder?: string
}

// 存储 API
export interface StorageAPI {
  // 获取插件存储的值
  get<T = unknown>(key: string): Promise<T | undefined>
  // 设置插件存储的值
  set(key: string, value: unknown): Promise<void>
  // 删除插件存储的值
  delete(key: string): Promise<void>
  // 获取所有键
  keys(): Promise<string[]>
}

// 网络 API
export interface NetworkAPI {
  // 发送 HTTP 请求
  fetch(url: string, options?: FetchOptions): Promise<FetchResponse>
  // 检查是否联网
  isOnline(): boolean
}

export interface FetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  body?: string | object
  timeout?: number
}

export interface FetchResponse {
  ok: boolean
  status: number
  statusText: string
  headers: Record<string, string>
  text(): Promise<string>
  json<T = unknown>(): Promise<T>
}

// 事件 API
export interface EventsAPI {
  // 监听事件
  on<T = unknown>(event: string, callback: (data: T) => void): Disposable
  // 触发事件
  emit<T = unknown>(event: string, data?: T): void
}

// 日志 API
export interface LogAPI {
  debug(message: string, ...args: unknown[]): void
  info(message: string, ...args: unknown[]): void
  warn(message: string, ...args: unknown[]): void
  error(message: string, ...args: unknown[]): void
}

// 可销毁对象
export interface Disposable {
  dispose(): void
}

// 插件状态
export type PluginState = 'inactive' | 'activating' | 'active' | 'deactivating' | 'error'

// 已安装的插件信息
export interface InstalledPlugin {
  manifest: PluginManifest
  state: PluginState
  enabled: boolean
  installedAt: string
  updatedAt?: string
  error?: string
}

// 插件市场信息
export interface MarketPlugin {
  id: string
  name: string
  version: string
  description: string
  author: string
  icon?: string
  downloads: number
  rating: number
  keywords?: string[]
  installed?: boolean
  installedVersion?: string
}
