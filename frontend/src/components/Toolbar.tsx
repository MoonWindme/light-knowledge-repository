import { useMemo, type RefObject } from 'react'
import {
  Columns,
  Edit3,
  Eye,
  FilePlus,
  FolderPlus,
  Menu,
  Pencil,
  RefreshCw,
  Save,
  Search,
  Trash2,
  GitBranch,
  LayoutPanelLeft,
  Puzzle,
  Sparkles,
  MessageSquare,
} from 'lucide-react'
import { ExportMenu } from './ExportMenu'
import type { NodeType, ViewMode } from '../types/notes'
import styles from './Toolbar.module.css'

interface ToolbarProps {
  currentTitle: string
  isDirty: boolean
  viewMode: ViewMode
  isSidebarCollapsed: boolean
  searchQuery: string
  searchInputRef: RefObject<HTMLInputElement | null>
  selectedNodeType: NodeType | null
  hasNote: boolean
  onSearchChange: (value: string) => void
  onToggleSidebar: () => void
  onViewModeChange: (mode: ViewMode) => void
  onSave: () => void
  onNewNote: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onRefresh: () => void
  onExportMarkdownPdf: () => void
  onExportMindmapPdf: () => void
  onExportMindmapImage: () => void
  onOpenPluginMarket: () => void
  onOpenAISettings: () => void
  isAIChatOpen: boolean
  onToggleAIChat: () => void
}

export function Toolbar({
  currentTitle,
  isDirty,
  viewMode,
  isSidebarCollapsed,
  searchQuery,
  searchInputRef,
  selectedNodeType,
  hasNote,
  onSearchChange,
  onToggleSidebar,
  onViewModeChange,
  onSave,
  onNewNote,
  onNewFolder,
  onRename,
  onDelete,
  onRefresh,
  onExportMarkdownPdf,
  onExportMindmapPdf,
  onExportMindmapImage,
  onOpenPluginMarket,
  onOpenAISettings,
  isAIChatOpen,
  onToggleAIChat,
}: ToolbarProps) {
  const titleLabel = useMemo(() => {
    return isDirty ? `${currentTitle} *` : currentTitle
  }, [currentTitle, isDirty])

  return (
    <header className={styles.header}>
      <div className={styles.brand}>
        <button
          className={styles.iconButton}
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <Menu size={18} />
        </button>
        <div className={styles.brandText}>
          <span className={styles.appName}>Markdown Notes</span>
          <span className={styles.currentTitle}>{titleLabel}</span>
        </div>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryButton} onClick={onNewNote}>
          <FilePlus size={16} />
          新建
        </button>
        <button className={styles.secondaryButton} onClick={onNewFolder}>
          <FolderPlus size={16} />
          新建文件夹
        </button>
        <button className={styles.secondaryButton} onClick={onSave} disabled={!isDirty}>
          <Save size={16} />
          保存
        </button>
        <button className={styles.iconButton} onClick={onRename} disabled={!selectedNodeType}>
          <Pencil size={16} />
        </button>
        <button className={styles.iconButton} onClick={onDelete} disabled={!selectedNodeType}>
          <Trash2 size={16} />
        </button>
        <button className={styles.iconButton} onClick={onRefresh} aria-label="刷新目录">
          <RefreshCw size={16} />
        </button>
        <ExportMenu
          onExportMarkdownPdf={onExportMarkdownPdf}
          onExportMindmapPdf={onExportMindmapPdf}
          onExportMindmapImage={onExportMindmapImage}
          disabled={!hasNote}
          hasMindmap={viewMode === 'mindmap' || viewMode === 'split-mindmap'}
        />
        <div className={styles.separator} />
        <button 
          className={isAIChatOpen ? styles.aiChatButtonActive : styles.aiChatButton}
          onClick={onToggleAIChat}
          title="AI 对话 (Ctrl+Shift+A)"
        >
          <MessageSquare size={16} />
          AI 助手
        </button>
        <button 
          className={styles.iconButton} 
          onClick={onOpenAISettings}
          title="AI 设置"
        >
          <Sparkles size={16} />
        </button>
        <div className={styles.separator} />
        <button 
          className={styles.iconButton} 
          onClick={onOpenPluginMarket}
          title="插件市场"
        >
          <Puzzle size={16} />
        </button>
      </div>

      <label className={styles.search}>
        <Search size={16} />
        <input
          ref={searchInputRef}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索文件或笔记"
        />
      </label>

      <div className={styles.viewToggle} role="group" aria-label="视图模式">
        <button
          className={viewMode === 'split' ? styles.toggleActive : styles.toggleButton}
          onClick={() => onViewModeChange('split')}
          aria-label="分栏视图"
          title="编辑器 + 预览"
        >
          <Columns size={16} />
        </button>
        <button
          className={viewMode === 'edit' ? styles.toggleActive : styles.toggleButton}
          onClick={() => onViewModeChange('edit')}
          aria-label="仅编辑"
          title="仅编辑器"
        >
          <Edit3 size={16} />
        </button>
        <button
          className={viewMode === 'preview' ? styles.toggleActive : styles.toggleButton}
          onClick={() => onViewModeChange('preview')}
          aria-label="仅预览"
          title="仅预览"
        >
          <Eye size={16} />
        </button>
        <button
          className={viewMode === 'mindmap' ? styles.toggleActive : styles.toggleButton}
          onClick={() => onViewModeChange('mindmap')}
          aria-label="思维导图"
          title="思维导图"
        >
          <GitBranch size={16} />
        </button>
        <button
          className={viewMode === 'split-mindmap' ? styles.toggleActive : styles.toggleButton}
          onClick={() => onViewModeChange('split-mindmap')}
          aria-label="编辑器+思维导图"
          title="编辑器 + 思维导图"
        >
          <LayoutPanelLeft size={16} />
        </button>
      </div>
    </header>
  )
}
