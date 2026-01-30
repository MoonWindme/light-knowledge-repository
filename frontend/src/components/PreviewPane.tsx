import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeHighlight from 'rehype-highlight'
import rehypeKatex from 'rehype-katex'
import styles from './PreviewPane.module.css'

interface PreviewPaneProps {
  markdown: string
  isEmpty: boolean
}

export function PreviewPane({ markdown, isEmpty }: PreviewPaneProps) {
  if (isEmpty) {
    return (
      <div className={styles.empty}>
        <div className={styles.emptyTitle}>实时预览将在这里呈现</div>
        <div className={styles.emptyHint}>支持 GFM 表格、代码高亮与 KaTeX 公式</div>
      </div>
    )
  }

  const content = markdown.trim().length > 0 ? markdown : '暂无预览内容，请输入 Markdown。'

  return (
    <div className={styles.container}>
      <div className="markdown-body">
        <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex, rehypeHighlight]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
