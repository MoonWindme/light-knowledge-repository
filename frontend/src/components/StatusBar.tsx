import styles from './StatusBar.module.css'

interface StatusBarProps {
  wordCount: number
  isDirty: boolean
  currentTitle: string
  statusMessage: string
  statusTone: 'info' | 'success' | 'error'
}

export function StatusBar({
  wordCount,
  isDirty,
  currentTitle,
  statusMessage,
  statusTone,
}: StatusBarProps) {
  return (
    <footer className={styles.statusBar}>
      <div className={styles.section}>
        <span className={styles.badge}>{isDirty ? '未保存' : '已保存'}</span>
        <span className={styles.muted}>字数：{wordCount}</span>
        <span className={styles.muted}>当前：{currentTitle}</span>
      </div>
      <div className={styles.section}>
        <span className={styles.status} data-tone={statusTone}>
          {statusMessage}
        </span>
        <span className={styles.muted}>Markdown + KaTeX + Highlight</span>
      </div>
    </footer>
  )
}
