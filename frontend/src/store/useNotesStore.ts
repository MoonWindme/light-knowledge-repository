import { create } from 'zustand'
import {
  createFolder as apiCreateFolder,
  createNote as apiCreateNote,
  deleteFolder as apiDeleteFolder,
  deleteNote as apiDeleteNote,
  fetchFolders,
  fetchNote,
  fetchNotes,
  updateFolder as apiUpdateFolder,
  updateNote as apiUpdateNote,
} from '../api/notes'
import type { FolderNode, NoteDetail, NoteSummary, NodeType, StatusState, ViewMode } from '../types/notes'

interface NotesStore {
  folders: FolderNode[]
  notes: NoteSummary[]
  currentNote: NoteDetail | null
  draftContent: string
  isDirty: boolean
  viewMode: ViewMode
  isLoading: boolean
  searchQuery: string
  recentNotes: NoteSummary[]
  selectedNodeId: string | null
  selectedNodeType: NodeType | null
  status: StatusState
  setSearchQuery: (value: string) => void
  setViewMode: (mode: ViewMode) => void
  setSelectedNode: (id: string | null, type: NodeType | null) => void
  setDraftContent: (value: string) => void
  setStatus: (message: string, tone?: StatusState['tone']) => void
  loadInitial: () => Promise<void>
  openNote: (noteId: string) => Promise<void>
  saveCurrentNote: () => Promise<void>
  createNote: (title: string, folderId?: string) => Promise<void>
  renameNote: (noteId: string, title: string) => Promise<void>
  deleteNote: (noteId: string) => Promise<void>
  createFolder: (name: string, parentId?: string) => Promise<void>
  renameFolder: (folderId: string, name: string) => Promise<void>
  deleteFolder: (folderId: string) => Promise<void>
  refreshFolders: () => Promise<void>
  reconnect: () => Promise<void>
}

const MAX_RECENT = 6

const demoNote: NoteDetail = {
  id: 'demo-note',
  title: '欢迎使用 Markdown 笔记',
  updatedAt: new Date().toISOString(),
  content: `# 欢迎使用\n\n- 左侧是文件树\n- 中间是 Markdown 编辑器\n- 右侧是实时预览\n\n\`\`\`ts\nconsole.log('Hello Markdown')\n\`\`\`\n\n$$E=mc^2$$\n`,
}

const demoFolders: FolderNode[] = [
  {
    id: 'demo-root',
    name: '示例笔记',
    type: 'folder',
    children: [
      {
        id: 'demo-note',
        name: '欢迎.md',
        type: 'file',
        noteId: 'demo-note',
      },
    ],
  },
]

const demoNotes: NoteSummary[] = [
  {
    id: demoNote.id,
    title: demoNote.title,
    updatedAt: demoNote.updatedAt,
  },
]

export const useNotesStore = create<NotesStore>((set, get) => ({
  folders: [],
  notes: [],
  currentNote: null,
  draftContent: '',
  isDirty: false,
  viewMode: 'split',
  isLoading: false,
  searchQuery: '',
  recentNotes: [],
  selectedNodeId: null,
  selectedNodeType: null,
  status: { message: '准备就绪', tone: 'info' },
  setSearchQuery: (value) => set({ searchQuery: value }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedNode: (id, type) => set({ selectedNodeId: id, selectedNodeType: type }),
  setDraftContent: (value) =>
    set((state) => ({
      draftContent: value,
      isDirty: state.currentNote ? value !== state.currentNote.content : value.trim().length > 0,
    })),
  setStatus: (message, tone = 'info') => set({ status: { message, tone } }),
  loadInitial: async () => {
    set({ isLoading: true })
    try {
      const [folders, notes] = await Promise.all([fetchFolders(), fetchNotes()])
      set({
        folders,
        notes,
        isLoading: false,
        status: { message: '后端已连接', tone: 'success' },
      })
    } catch (error) {
      const message = getErrorMessage(error)
      set({
        folders: demoFolders,
        notes: demoNotes,
        currentNote: demoNote,
        draftContent: demoNote.content,
        isDirty: false,
        isLoading: false,
        status: { message: `后端未就绪：${message}，已加载示例数据`, tone: 'error' },
      })
    }
  },
  openNote: async (noteId) => {
    set({ isLoading: true })
    try {
      const note = await fetchNote(noteId)
      set((state) => ({
        currentNote: note,
        draftContent: note.content,
        isDirty: false,
        isLoading: false,
        recentNotes: updateRecent(state.recentNotes, note),
        selectedNodeId: note.id,
        selectedNodeType: 'file',
        status: { message: `已打开：${note.title}`, tone: 'success' },
      }))
    } catch (error) {
      const message = getErrorMessage(error)
      set({
        isLoading: false,
        status: { message: `打开失败：${message}`, tone: 'error' },
      })
    }
  },
  saveCurrentNote: async () => {
    const { currentNote, draftContent } = get()
    if (!currentNote) {
      set({ status: { message: '没有可保存的笔记', tone: 'error' } })
      return
    }
    try {
      const previousId = currentNote.id
      const updated = await apiUpdateNote(currentNote.id, {
        title: currentNote.title,
        content: draftContent,
      })
      set((state) => ({
        currentNote: updated,
        draftContent: updated.content,
        isDirty: false,
        notes: upsertNote(state.notes, previousId, updated),
        recentNotes: upsertNote(state.recentNotes, previousId, updated),
        selectedNodeId: state.selectedNodeId === previousId ? updated.id : state.selectedNodeId,
        status: { message: '保存成功', tone: 'success' },
      }))
    } catch (error) {
      const message = getErrorMessage(error)
      set({ status: { message: `保存失败：${message}`, tone: 'error' } })
    }
  },
  createNote: async (title, folderId) => {
    try {
      const note = await apiCreateNote({ title, folderId })
      set((state) => ({
        currentNote: note,
        draftContent: note.content ?? '',
        isDirty: false,
        notes: [note, ...state.notes.filter((item) => item.id !== note.id)],
        recentNotes: updateRecent(state.recentNotes, note),
        selectedNodeId: note.id,
        selectedNodeType: 'file',
        status: { message: '新建笔记完成', tone: 'success' },
      }))
      await get().refreshFolders()
    } catch (error) {
      const message = getErrorMessage(error)
      set({ status: { message: `新建笔记失败：${message}`, tone: 'error' } })
    }
  },
  renameNote: async (noteId, title) => {
    try {
      const updated = await apiUpdateNote(noteId, { title })
      const previousId = noteId
      set((state) => ({
        notes: upsertNote(state.notes, previousId, updated),
        currentNote: state.currentNote?.id === noteId ? updated : state.currentNote,
        recentNotes: upsertNote(state.recentNotes, previousId, updated),
        selectedNodeId: state.selectedNodeId === previousId ? updated.id : state.selectedNodeId,
        status: { message: '重命名成功', tone: 'success' },
      }))
      await get().refreshFolders()
    } catch (error) {
      const message = getErrorMessage(error)
      set({ status: { message: `重命名失败：${message}`, tone: 'error' } })
    }
  },
  deleteNote: async (noteId) => {
    try {
      await apiDeleteNote(noteId)
      set((state) => ({
        notes: state.notes.filter((note) => note.id !== noteId),
        recentNotes: state.recentNotes.filter((note) => note.id !== noteId),
        currentNote: state.currentNote?.id === noteId ? null : state.currentNote,
        draftContent: state.currentNote?.id === noteId ? '' : state.draftContent,
        isDirty: state.currentNote?.id === noteId ? false : state.isDirty,
        selectedNodeId: state.selectedNodeId === noteId ? null : state.selectedNodeId,
        selectedNodeType: state.selectedNodeId === noteId ? null : state.selectedNodeType,
        status: { message: '已删除笔记', tone: 'success' },
      }))
      await get().refreshFolders()
    } catch (error) {
      const message = getErrorMessage(error)
      set({ status: { message: `删除失败：${message}`, tone: 'error' } })
    }
  },
  createFolder: async (name, parentId) => {
    try {
      await apiCreateFolder({ name, parentId })
      await get().refreshFolders()
      set({ status: { message: '已创建文件夹', tone: 'success' } })
    } catch (error) {
      const message = getErrorMessage(error)
      set({ status: { message: `创建文件夹失败：${message}`, tone: 'error' } })
    }
  },
  renameFolder: async (folderId, name) => {
    try {
      await apiUpdateFolder(folderId, { name })
      await get().refreshFolders()
      set({ status: { message: '文件夹重命名完成', tone: 'success' } })
    } catch (error) {
      const message = getErrorMessage(error)
      set({ status: { message: `文件夹重命名失败：${message}`, tone: 'error' } })
    }
  },
  deleteFolder: async (folderId) => {
    try {
      await apiDeleteFolder(folderId)
      await get().refreshFolders()
      set({ status: { message: '文件夹已删除', tone: 'success' } })
    } catch (error) {
      const message = getErrorMessage(error)
      set({ status: { message: `文件夹删除失败：${message}`, tone: 'error' } })
    }
  },
  refreshFolders: async () => {
    try {
      const folders = await fetchFolders()
      set({ folders })
    } catch (error) {
      const message = getErrorMessage(error)
      set({ status: { message: `刷新目录失败：${message}`, tone: 'error' } })
    }
  },
  reconnect: async () => {
    set({ isLoading: true })
    try {
      const [folders, notes] = await Promise.all([fetchFolders(), fetchNotes()])
      set({
        folders,
        notes,
        isLoading: false,
        status: { message: '已重新连接后端', tone: 'success' },
      })
    } catch (error) {
      const message = getErrorMessage(error)
      set({
        isLoading: false,
        status: { message: `后端连接失败：${message}`, tone: 'error' },
      })
    }
  },
}))

function updateRecent(items: NoteSummary[], note: NoteSummary) {
  const filtered = items.filter((item) => item.id !== note.id)
  return [note, ...filtered].slice(0, MAX_RECENT)
}

function upsertNote(items: NoteSummary[], previousId: string, note: NoteSummary) {
  const filtered = items.filter((item) => item.id !== previousId && item.id !== note.id)
  return [note, ...filtered]
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message || '未知错误'
  }
  if (typeof error === 'string') {
    return error
  }
  return '未知错误'
}
