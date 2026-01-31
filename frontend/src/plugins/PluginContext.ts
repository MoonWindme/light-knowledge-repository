/**
 * 插件上下文实现
 * 为插件提供与应用交互的 API
 */

import type {
  PluginContext,
  EditorAPI,
  UIAPI,
  StorageAPI,
  NetworkAPI,
  EventsAPI,
  LogAPI,
  Disposable,
  ToolbarButton,
  ContextMenuItem,
  NotificationType,
  ModalOptions,
  InputBoxOptions,
  QuickPickItem,
  QuickPickOptions,
  FetchOptions,
  FetchResponse,
  EditorSelection,
  NoteInfo,
} from './types'
import { useNotesStore } from '../store/useNotesStore'

// 全局事件总线
const eventBus = new Map<string, Set<(data: unknown) => void>>()

// 已注册的 UI 扩展
export const registeredToolbarButtons = new Map<string, ToolbarButton>()
export const registeredContextMenuItems = new Map<string, ContextMenuItem>()

// UI 扩展变更回调
type UIChangeCallback = () => void
const uiChangeCallbacks = new Set<UIChangeCallback>()

export function onUIChange(callback: UIChangeCallback): Disposable {
  uiChangeCallbacks.add(callback)
  return {
    dispose: () => uiChangeCallbacks.delete(callback),
  }
}

function notifyUIChange() {
  uiChangeCallbacks.forEach((callback) => callback())
}

/**
 * 创建插件上下文
 */
export function createPluginContext(pluginId: string): PluginContext {
  const storagePrefix = `plugin:${pluginId}:`

  // 编辑器 API 实现
  const editor: EditorAPI = {
    getContent(): string {
      return useNotesStore.getState().draftContent
    },

    setContent(content: string): void {
      useNotesStore.getState().setDraftContent(content)
    },

    insertText(text: string): void {
      const currentContent = this.getContent()
      // 简单实现：在末尾追加
      // TODO: 需要与 CodeMirror 集成以支持光标位置
      this.setContent(currentContent + text)
    },

    getSelection(): EditorSelection | null {
      // TODO: 需要与 CodeMirror 集成
      // 当前返回 null
      return null
    },

    replaceSelection(text: string): void {
      const selection = this.getSelection()
      if (!selection) {
        this.insertText(text)
        return
      }
      const content = this.getContent()
      const newContent = content.slice(0, selection.start) + text + content.slice(selection.end)
      this.setContent(newContent)
    },

    getCurrentNote(): NoteInfo | null {
      const note = useNotesStore.getState().currentNote
      if (!note) return null
      return {
        id: note.id,
        title: note.title,
      }
    },

    onContentChange(callback: (content: string) => void): Disposable {
      let prevContent = useNotesStore.getState().draftContent
      const unsubscribe = useNotesStore.subscribe((state) => {
        if (state.draftContent !== prevContent) {
          prevContent = state.draftContent
          callback(state.draftContent)
        }
      })
      return { dispose: unsubscribe }
    },
  }

  // UI API 实现
  const ui: UIAPI = {
    registerToolbarButton(button: ToolbarButton): Disposable {
      const fullId = `${pluginId}:${button.id}`
      registeredToolbarButtons.set(fullId, { ...button, id: fullId })
      notifyUIChange()
      return {
        dispose: () => {
          registeredToolbarButtons.delete(fullId)
          notifyUIChange()
        },
      }
    },

    registerContextMenuItem(item: ContextMenuItem): Disposable {
      const fullId = `${pluginId}:${item.id}`
      registeredContextMenuItems.set(fullId, { ...item, id: fullId })
      notifyUIChange()
      return {
        dispose: () => {
          registeredContextMenuItems.delete(fullId)
          notifyUIChange()
        },
      }
    },

    showNotification(message: string, type: NotificationType = 'info'): void {
      const { setStatus } = useNotesStore.getState()
      const tone = type === 'warning' ? 'info' : type
      setStatus(message, tone as 'info' | 'success' | 'error')
    },

    async showModal<T = unknown>(options: ModalOptions): Promise<T | null> {
      // TODO: 实现模态框
      // 当前使用简单的 confirm 代替
      const confirmed = window.confirm(`${options.title}\n\n${options.content}`)
      return confirmed ? (true as unknown as T) : null
    },

    async showInputBox(options: InputBoxOptions): Promise<string | null> {
      const result = window.prompt(options.title || '请输入', options.value || '')
      if (result === null) return null
      if (options.validateInput) {
        const error = options.validateInput(result)
        if (error) {
          this.showNotification(error, 'error')
          return null
        }
      }
      return result
    },

    async showQuickPick<T extends QuickPickItem>(
      items: T[],
      options?: QuickPickOptions
    ): Promise<T | null> {
      // TODO: 实现快速选择 UI
      // 当前使用简单的 prompt 代替
      const labels = items.map((item, i) => `${i + 1}. ${item.label}`).join('\n')
      const result = window.prompt(
        `${options?.title || '请选择'}\n\n${labels}`,
        '1'
      )
      if (!result) return null
      const index = parseInt(result, 10) - 1
      if (index >= 0 && index < items.length) {
        return items[index]
      }
      return null
    },
  }

  // 存储 API 实现
  const storage: StorageAPI = {
    async get<T = unknown>(key: string): Promise<T | undefined> {
      const fullKey = storagePrefix + key
      const value = localStorage.getItem(fullKey)
      if (value === null) return undefined
      try {
        return JSON.parse(value) as T
      } catch {
        return value as unknown as T
      }
    },

    async set(key: string, value: unknown): Promise<void> {
      const fullKey = storagePrefix + key
      localStorage.setItem(fullKey, JSON.stringify(value))
    },

    async delete(key: string): Promise<void> {
      const fullKey = storagePrefix + key
      localStorage.removeItem(fullKey)
    },

    async keys(): Promise<string[]> {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith(storagePrefix)) {
          keys.push(key.slice(storagePrefix.length))
        }
      }
      return keys
    },
  }

  // 网络 API 实现
  const network: NetworkAPI = {
    async fetch(url: string, options?: FetchOptions): Promise<FetchResponse> {
      const controller = new AbortController()
      const timeoutId = options?.timeout
        ? setTimeout(() => controller.abort(), options.timeout)
        : null

      try {
        const response = await window.fetch(url, {
          method: options?.method || 'GET',
          headers: options?.headers,
          body: options?.body
            ? typeof options.body === 'string'
              ? options.body
              : JSON.stringify(options.body)
            : undefined,
          signal: controller.signal,
        })

        const headers: Record<string, string> = {}
        response.headers.forEach((value, key) => {
          headers[key] = value
        })

        return {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          headers,
          text: () => response.text(),
          json: <T>() => response.json() as Promise<T>,
        }
      } finally {
        if (timeoutId) clearTimeout(timeoutId)
      }
    },

    isOnline(): boolean {
      return navigator.onLine
    },
  }

  // 事件 API 实现
  const events: EventsAPI = {
    on<T = unknown>(event: string, callback: (data: T) => void): Disposable {
      const fullEvent = `${pluginId}:${event}`
      if (!eventBus.has(fullEvent)) {
        eventBus.set(fullEvent, new Set())
      }
      const callbacks = eventBus.get(fullEvent)!
      const wrappedCallback = (data: unknown) => callback(data as T)
      callbacks.add(wrappedCallback)
      return {
        dispose: () => callbacks.delete(wrappedCallback),
      }
    },

    emit<T = unknown>(event: string, data?: T): void {
      const fullEvent = `${pluginId}:${event}`
      const callbacks = eventBus.get(fullEvent)
      if (callbacks) {
        callbacks.forEach((callback) => callback(data))
      }
    },
  }

  // 日志 API 实现
  const log: LogAPI = {
    debug(message: string, ...args: unknown[]): void {
      console.debug(`[${pluginId}]`, message, ...args)
    },

    info(message: string, ...args: unknown[]): void {
      console.info(`[${pluginId}]`, message, ...args)
    },

    warn(message: string, ...args: unknown[]): void {
      console.warn(`[${pluginId}]`, message, ...args)
    },

    error(message: string, ...args: unknown[]): void {
      console.error(`[${pluginId}]`, message, ...args)
    },
  }

  return {
    pluginId,
    pluginPath: `/plugins/${pluginId}`,
    editor,
    ui,
    storage,
    network,
    events,
    log,
  }
}
