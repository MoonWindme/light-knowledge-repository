import { useState, useRef, useEffect } from 'react'
import { Download, FileText, GitBranch, Image } from 'lucide-react'
import styles from './ExportMenu.module.css'

interface ExportMenuProps {
  onExportMarkdownPdf: () => void
  onExportMindmapPdf: () => void
  onExportMindmapImage: () => void
  disabled?: boolean
  hasMindmap?: boolean
}

export function ExportMenu({
  onExportMarkdownPdf,
  onExportMindmapPdf,
  onExportMindmapImage,
  disabled = false,
  hasMindmap = false,
}: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleExport = (callback: () => void) => {
    callback()
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.trigger}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        title="导出"
      >
        <Download size={16} />
        导出
      </button>
      
      {isOpen && (
        <div className={styles.dropdown}>
          <button
            className={styles.menuItem}
            onClick={() => handleExport(onExportMarkdownPdf)}
          >
            <FileText size={16} />
            <div className={styles.menuItemText}>
              <span className={styles.menuItemTitle}>导出为 PDF</span>
              <span className={styles.menuItemDesc}>Markdown 文档</span>
            </div>
          </button>
          
          {hasMindmap && (
            <>
              <div className={styles.divider} />
              <button
                className={styles.menuItem}
                onClick={() => handleExport(onExportMindmapPdf)}
              >
                <GitBranch size={16} />
                <div className={styles.menuItemText}>
                  <span className={styles.menuItemTitle}>思维导图 PDF</span>
                  <span className={styles.menuItemDesc}>导出思维导图为 PDF</span>
                </div>
              </button>
              <button
                className={styles.menuItem}
                onClick={() => handleExport(onExportMindmapImage)}
              >
                <Image size={16} />
                <div className={styles.menuItemText}>
                  <span className={styles.menuItemTitle}>思维导图图片</span>
                  <span className={styles.menuItemDesc}>导出为 PNG 图片</span>
                </div>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
