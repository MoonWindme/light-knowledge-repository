import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorPane } from './components/EditorPane'
import { FileTree } from './components/FileTree'
import { NameDialog } from './components/NameDialog'
import { PreviewPane } from './components/PreviewPane'
import { RecentList } from './components/RecentList'
import { StatusBar } from './components/StatusBar'
import { Toolbar } from './components/Toolbar'
import { useNotesStore } from './store/useNotesStore'
import { findNodeById } from './utils/tree'
import { countWordLike } from './utils/words'
import styles from './App.module.css'

function App() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
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
  } = useNotesStore()

  useEffect(() => {
    void loadInitial()
  }, [loadInitial])

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
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [saveCurrentNote])

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
          <EditorPane
            value={draftContent}
            onChange={setDraftContent}
            isEmpty={!currentNote}
          />
          <PreviewPane markdown={draftContent} isEmpty={!currentNote} />
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
