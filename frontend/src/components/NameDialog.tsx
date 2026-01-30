import { useEffect, useRef, useState } from 'react'
import styles from './NameDialog.module.css'

interface NameDialogProps {
  open: boolean
  title: string
  defaultValue: string
  placeholder?: string
  confirmText?: string
  onConfirm: (value: string) => void
  onCancel: () => void
}

export function NameDialog({
  open,
  title,
  defaultValue,
  placeholder,
  confirmText = '确认',
  onConfirm,
  onCancel,
}: NameDialogProps) {
  const [value, setValue] = useState(defaultValue)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setValue(defaultValue)
      setError('')
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open, defaultValue])

  if (!open) {
    return null
  }

  const handleConfirm = () => {
    const trimmed = value.trim()
    if (!trimmed) {
      setError('名称不能为空')
      return
    }
    onConfirm(trimmed)
  }

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true">
      <div className={styles.dialog}>
        <div className={styles.title}>{title}</div>
        <input
          ref={inputRef}
          className={styles.input}
          value={value}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              handleConfirm()
            }
            if (event.key === 'Escape') {
              onCancel()
            }
          }}
        />
        {error ? <div className={styles.error}>{error}</div> : null}
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            取消
          </button>
          <button className={styles.confirmButton} onClick={handleConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
