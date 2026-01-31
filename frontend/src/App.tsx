import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AIChatPane } from './components/AIChatPane'
import { AISettings } from './components/AISettings'
import { EditorPane } from './components/EditorPane'
import { FileTree } from './components/FileTree'
import { MindMapPane } from './components/MindMapPane'
import { NameDialog } from './components/NameDialog'
import { PluginMarket } from './components/PluginMarket'
import { PreviewPane } from './components/PreviewPane'
import { RecentList } from './components/RecentList'
import { StatusBar } from './components/StatusBar'
import { Toolbar } from './components/Toolbar'
import { useNotesStore } from './store/useNotesStore'
import { usePluginStore } from './plugins/PluginManager'
import { initBuiltinPlugins } from './plugins/builtin'
import { findNodeById } from './utils/tree'
import { countWordLike } from './utils/words'
import { exportMarkdownToPdf, exportSvgToPdf, exportSvgToImage } from './utils/exportPdf'
import styles from './App.module.css'

// 初始化内置插件（只在模块加载时执行一次）
initBuiltinPlugins()

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [isPluginMarketOpen, setIsPluginMarketOpen] = useState(false)
  const [isAISettingsOpen, setIsAISettingsOpen] = useState(false)
  const [isAIChatOpen, setIsAIChatOpen] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const previewRef = useRef<HTMLDivElement>(null)
  const mindmapRef = useRef<HTMLDivElement>(null)
  const {
    folders,
    currentNote,
    draftContent,
    isDirty,
    viewMode,
    searchQuery,
    recentNotes,
    selectedNodeId,
    selectedNodeType,
    status,
    loadInitial,
    openNote,
    saveCurrentNote,
    createNote,
    createFolder,
    renameNote,
    renameFolder,
    deleteNote,
    deleteFolder,
    reconnect,
    setDraftContent,
    setSearchQuery,
    setViewMode,
    setSelectedNode,
    setStatus,
  } = useNotesStore()

  useEffect(() => {
    void loadInitial()
    // 加载插件
    usePluginStore.getState().loadPlugins()
  }, [loadInitial])

  // 切换AI对话面板
  const handleToggleAIChat = useCallback(() => {
    setIsAIChatOpen((prev) => !prev)
  }, [])

  // 插入AI回复到编辑器
  const handleInsertAIText = useCallback((text: string) => {
    setDraftContent(draftContent + '\n\n' + text)
    setStatus('已插入到文档', 'success')
  }, [draftContent, setDraftContent, setStatus])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        void saveCurrentNote()
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
      }
      // Ctrl+Shift+A 快捷键打开/关闭AI对话
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === 'a') {
        event.preventDefault()
        handleToggleAIChat()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveCurrentNote, handleToggleAIChat])

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null
    }
    return findNodeById(folders, selectedNodeId)
  }, [folders, selectedNodeId])

  const wordCount = useMemo(() => countWordLike(draftContent), [draftContent])

  const handleSelectNode = (nodeId: string, nodeType: 'folder' | 'file', noteId?: string) => {
    setSelectedNode(nodeId, nodeType)
    if (nodeType === 'file') {
      void openNote(noteId ?? nodeId)
    }
  }

  const handleNewNote = () => {
    const defaultTitle = selectedNode?.type === 'folder' ? `${selectedNode.name} 新笔记` : '未命名'
    setDialogState({
      kind: 'new-note',
      title: '新建 Markdown 笔记',
      placeholder: '请输入笔记标题',
      confirmText: '创建',
      defaultValue: defaultTitle,
      folderId: selectedNode?.type === 'folder' ? selectedNode.id : undefined,
    })
  }

  const handleNewFolder = () => {
    const defaultName = selectedNode?.type === 'folder' ? `${selectedNode.name} 子目录` : '新建文件夹'
    setDialogState({
      kind: 'new-folder',
      title: '新建文件夹',
      placeholder: '请输入文件夹名称',
      confirmText: '创建',
      defaultValue: defaultName,
      parentId: selectedNode?.type === 'folder' ? selectedNode.id : undefined,
    })
  }

  const handleRename = () => {
    const target =
      selectedNode ??
      (currentNote
        ? { id: currentNote.id, name: currentNote.title, type: 'file' as const, noteId: currentNote.id }
        : null)
    if (!target) {
      return
    }
    setDialogState({
      kind: 'rename',
      title: '重命名',
      placeholder: '请输入新名称',
      confirmText: '确定',
      defaultValue: target.name,
      targetType: target.type,
      targetId: target.noteId ?? target.id,
    })
  }

  const handleDelete = () => {
    const target =
      selectedNode ??
      (currentNote
        ? { id: currentNote.id, name: currentNote.title, type: 'file' as const, noteId: currentNote.id }
        : null)
    if (!target) {
      return
    }
    const ok = window.confirm(`确认删除「${target.name}」？此操作不可撤销。`)
    if (!ok) {
      return
    }
    if (target.type === 'file') {
      void deleteNote(target.noteId ?? target.id)
    } else {
      void deleteFolder(target.id)
    }
  }

  // 导出处理函数
  const handleExportMarkdownPdf = useCallback(async () => {
    const previewElement = previewRef.current?.querySelector('.markdown-body') as HTMLElement | null
    if (previewElement) {
      setStatus('正在导出 PDF...', 'info')
      try {
        await exportMarkdownToPdf(previewElement, currentNote?.title || '文档')
        setStatus('PDF 导出成功', 'success')
      } catch {
        setStatus('PDF 导出失败', 'error')
      }
    } else {
      setStatus('请先切换到预览或分栏模式', 'error')
    }
  }, [currentNote?.title, setStatus])

  const handleExportMindmapPdf = useCallback(async () => {
    const svgElement = mindmapRef.current?.querySelector('svg') as SVGSVGElement | null
    if (svgElement) {
      setStatus('正在导出思维导图 PDF...', 'info')
      try {
        await exportSvgToPdf(svgElement, currentNote?.title || '思维导图')
        setStatus('思维导图 PDF 导出成功', 'success')
      } catch {
        setStatus('思维导图 PDF 导出失败', 'error')
      }
    } else {
      setStatus('请先切换到思维导图视图', 'error')
    }
  }, [currentNote?.title, setStatus])

  const handleExportMindmapImage = useCallback(() => {
    const svgElement = mindmapRef.current?.querySelector('svg') as SVGSVGElement | null
    if (svgElement) {
      setStatus('正在导出思维导图图片...', 'info')
      try {
        exportSvgToImage(svgElement, `${currentNote?.title || '思维导图'}.png`)
        setStatus('思维导图图片导出成功', 'success')
      } catch {
        setStatus('思维导图图片导出失败', 'error')
      }
    } else {
      setStatus('请先切换到思维导图视图', 'error')
    }
  }, [currentNote?.title, setStatus])

  return (
    <div className={styles.appRoot}>
      <Toolbar
        currentTitle={currentNote?.title ?? '未选择笔记'}
        isDirty={isDirty}
        viewMode={viewMode}
        isSidebarCollapsed={isSidebarCollapsed}
        searchQuery={searchQuery}
        searchInputRef={searchInputRef}
        onSearchChange={setSearchQuery}
        onToggleSidebar={() => setIsSidebarCollapsed((value) => !value)}
        onViewModeChange={setViewMode}
        onSave={() => void saveCurrentNote()}
        onNewNote={handleNewNote}
        onNewFolder={handleNewFolder}
        onRename={handleRename}
        onDelete={handleDelete}
        onRefresh={() => void reconnect()}
        selectedNodeType={selectedNodeType}
        hasNote={!!currentNote}
        onExportMarkdownPdf={() => void handleExportMarkdownPdf()}
        onExportMindmapPdf={() => void handleExportMindmapPdf()}
        onExportMindmapImage={handleExportMindmapImage}
        onOpenPluginMarket={() => setIsPluginMarketOpen(true)}
        onOpenAISettings={() => setIsAISettingsOpen(true)}
        isAIChatOpen={isAIChatOpen}
        onToggleAIChat={handleToggleAIChat}
      />
      <div className={styles.main}>
        <aside className={isSidebarCollapsed ? styles.sidebarCollapsed : styles.sidebar}>
          <RecentList
            items={recentNotes}
            onOpen={(noteId) => void openNote(noteId)}
          />
          <FileTree
            nodes={folders}
            searchQuery={searchQuery}
            selectedNodeId={selectedNodeId}
            onSelect={handleSelectNode}
          />
        </aside>
        <section className={styles.workspace} data-view={viewMode}>
          {(viewMode === 'split' || viewMode === 'edit' || viewMode === 'preview' || viewMode === 'split-mindmap') && (
            <EditorPane
              value={draftContent}
              onChange={setDraftContent}
              isEmpty={!currentNote}
            />
          )}
          {(viewMode === 'split' || viewMode === 'preview') && (
            <div ref={previewRef}>
              <PreviewPane markdown={draftContent} isEmpty={!currentNote} />
            </div>
          )}
          {(viewMode === 'mindmap' || viewMode === 'split-mindmap') && (
            <div ref={mindmapRef}>
              <MindMapPane 
                markdown={draftContent} 
                onChange={setDraftContent}
                isEmpty={!currentNote}
              />
            </div>
          )}
        </section>
      </div>
      <StatusBar
        wordCount={wordCount}
        isDirty={isDirty}
        currentTitle={currentNote?.title ?? '未选择笔记'}
        statusMessage={status.message}
        statusTone={status.tone}
      />
      <NameDialog
        open={dialogState !== null}
        title={dialogState?.title ?? '请输入名称'}
        defaultValue={dialogState?.defaultValue ?? ''}
        placeholder={dialogState?.placeholder}
        confirmText={dialogState?.confirmText}
        onCancel={() => setDialogState(null)}
        onConfirm={(value) => {
          if (!dialogState) {
            return
          }
          if (dialogState.kind === 'new-note') {
            void createNote(value, dialogState.folderId)
          } else if (dialogState.kind === 'new-folder') {
            void createFolder(value, dialogState.parentId)
          } else if (dialogState.kind === 'rename') {
            if (dialogState.targetType === 'file') {
              void renameNote(dialogState.targetId, value)
            } else {
              void renameFolder(dialogState.targetId, value)
            }
          }
          setDialogState(null)
        }}
      />
      <PluginMarket
        open={isPluginMarketOpen}
        onClose={() => setIsPluginMarketOpen(false)}
      />
      <AISettings
        open={isAISettingsOpen}
        onClose={() => setIsAISettingsOpen(false)}
      />
      <AIChatPane
        open={isAIChatOpen}
        onClose={() => setIsAIChatOpen(false)}
        currentContent={draftContent}
        onInsertText={currentNote ? handleInsertAIText : undefined}
      />
    </div>
  )
}

type DialogState =
  | {
      kind: 'new-note'
      title?: string
      placeholder?: string
      confirmText?: string
      defaultValue: string
      folderId?: string
    }
  | {
      kind: 'new-folder'
      title?: string
      placeholder?: string
      confirmText?: string
      defaultValue: string
      parentId?: string
    }
  | {
      kind: 'rename'
      title?: string
      placeholder?: string
      confirmText?: string
      defaultValue: string
      targetType: 'file' | 'folder'
      targetId: string
    }

export default App
