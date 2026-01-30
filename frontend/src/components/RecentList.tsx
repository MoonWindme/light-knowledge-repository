import { Clock } from 'lucide-react'
import type { NoteSummary } from '../types/notes'
import styles from './RecentList.module.css'

interface RecentListProps {
  items: NoteSummary[]
  onOpen: (noteId: string) => void
}

export function RecentList({ items, onOpen }: RecentListProps) {
  if (items.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.title}>最近打开</div>
        <div className={styles.empty}>暂无记录</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.title}>最近打开</div>
      <div className={styles.list}>
        {items.map((item) => (
          <button key={item.id} className={styles.item} onClick={() => onOpen(item.id)}>
            <Clock size={14} />
            <span className={styles.name}>{item.title}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
