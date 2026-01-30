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
} from 'lucide-react'
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
  onSearchChange: (value: string) => void
  onToggleSidebar: () => void
  onViewModeChange: (mode: ViewMode) => void
  onSave: () => void
  onNewNote: () => void
  onNewFolder: () => void
  onRename: () => void
  onDelete: () => void
  onRefresh: () => void
}

export function Toolbar({
  currentTitle,
  isDirty,
  viewMode,
  isSidebarCollapsed,
  searchQuery,
  searchInputRef,
  selectedNodeType,
  onSearchChange,
  onToggleSidebar,
  onViewModeChange,
  onSave,
  onNewNote,
  onNewFolder,
  onRename,
  onDelete,
  onRefresh,
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
        >
          <Columns size={16} />
        </button>
        <button
          className={viewMode === 'edit' ? styles.toggleActive : styles.toggleButton}
          onClick={() => onViewModeChange('edit')}
          aria-label="仅编辑"
        >
          <Edit3 size={16} />
        </button>
        <button
          className={viewMode === 'preview' ? styles.toggleActive : styles.toggleButton}
          onClick={() => onViewModeChange('preview')}
          aria-label="仅预览"
        >
          <Eye size={16} />
        </button>
      </div>
    </header>
  )
}
