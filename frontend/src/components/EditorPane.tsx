import CodeMirror from '@uiw/react-codemirror'
import { markdown } from '@codemirror/lang-markdown'
import { EditorView } from '@codemirror/view'
import { oneDark } from '@codemirror/theme-one-dark'
import styles from './EditorPane.module.css'

interface EditorPaneProps {
  value: string
  onChange: (value: string) => void
  isEmpty: boolean
}

const editorTheme = EditorView.theme(
  {
    '&': {
      height: '100%',
      backgroundColor: 'var(--bg-tertiary)',
      color: 'var(--text-primary)',
    },
    '.cm-content': {
      fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
      fontSize: '14px',
      lineHeight: '1.7',
    },
    '.cm-gutters': {
      backgroundColor: '#141414',
      color: '#6b6b6b',
      border: 'none',
    },
    '.cm-activeLine': {
      backgroundColor: 'rgba(124, 58, 237, 0.12)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'rgba(124, 58, 237, 0.12)',
    },
  },
  { dark: true },
)

export function EditorPane({ value, onChange, isEmpty }: EditorPaneProps) {
  if (isEmpty) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>选择或新建一篇笔记开始编辑</div>
        <div className={styles.emptyHint}>支持表格、代码块、数学公式等 Markdown 语法</div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <CodeMirror
        value={value}
        height="100%"
        theme={oneDark}
        extensions={[markdown(), EditorView.lineWrapping, editorTheme]}
        onChange={(next) => onChange(next)}
        basicSetup={{
          lineNumbers: true,
          foldGutter: true,
          highlightActiveLine: true,
        }}
      />
    </div>
  )
}
