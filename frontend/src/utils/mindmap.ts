import { Transformer } from 'markmap-lib'

export interface MindMapNode {
  id: string
  content: string
  children: MindMapNode[]
  depth: number
}

const transformer = new Transformer()

/**
 * 将 Markdown 转换为 markmap 可用的数据结构
 */
export function markdownToMindmap(markdown: string) {
  const { root } = transformer.transform(markdown)
  return root
}

/**
 * 将 markmap 节点树转换回 Markdown 文本
 * @param node markmap 节点
 * @param depth 当前深度（用于生成标题层级）
 */
export function mindmapToMarkdown(node: MindMapNode, depth: number = 0): string {
  const lines: string[] = []
  
  // 根节点作为一级标题
  if (depth === 0) {
    if (node.content) {
      lines.push(`# ${stripHtml(node.content)}`)
      lines.push('')
    }
    // 处理子节点
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        lines.push(mindmapToMarkdown(child, depth + 1))
      }
    }
  } else if (depth <= 6) {
    // 2-6 级标题
    const prefix = '#'.repeat(depth + 1)
    lines.push(`${prefix} ${stripHtml(node.content)}`)
    lines.push('')
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        lines.push(mindmapToMarkdown(child, depth + 1))
      }
    }
  } else {
    // 超过 6 级用列表表示
    const indent = '  '.repeat(depth - 6)
    lines.push(`${indent}- ${stripHtml(node.content)}`)
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        lines.push(mindmapToMarkdown(child, depth + 1))
      }
    }
  }
  
  return lines.join('\n')
}

/**
 * 从 markmap 的 INode 结构生成 Markdown
 */
export function markmapNodeToMarkdown(node: MarkmapINode, depth: number = 0): string {
  const lines: string[] = []
  
  if (depth === 0) {
    // 根节点
    if (node.content) {
      lines.push(`# ${stripHtml(node.content)}`)
      lines.push('')
    }
  } else if (depth <= 5) {
    // 2-6 级标题
    const prefix = '#'.repeat(depth + 1)
    lines.push(`${prefix} ${stripHtml(node.content)}`)
    lines.push('')
  } else {
    // 列表项
    const indent = '  '.repeat(depth - 6)
    lines.push(`${indent}- ${stripHtml(node.content)}`)
  }
  
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      lines.push(markmapNodeToMarkdown(child, depth + 1))
    }
  }
  
  return lines.join('\n').trim()
}

/**
 * 去除 HTML 标签
 */
function stripHtml(html: string): string {
  if (!html) return ''
  // 创建临时元素解析 HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

/**
 * 为节点生成唯一 ID
 */
export function generateNodeId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * 深拷贝节点树
 */
export function cloneNodeTree<T extends { children?: T[] }>(node: T): T {
  return {
    ...node,
    children: node.children ? node.children.map(cloneNodeTree) : undefined,
  }
}

/**
 * 在节点树中查找节点
 */
export function findNodeInTree<T extends { children?: T[] }>(
  root: T,
  predicate: (node: T) => boolean
): T | null {
  if (predicate(root)) {
    return root
  }
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeInTree(child, predicate)
      if (found) return found
    }
  }
  return null
}

/**
 * 更新节点树中的特定节点
 */
export function updateNodeInTree<T extends { children?: T[] }>(
  root: T,
  predicate: (node: T) => boolean,
  updater: (node: T) => T
): T {
  if (predicate(root)) {
    return updater(root)
  }
  if (root.children) {
    return {
      ...root,
      children: root.children.map((child) => updateNodeInTree(child, predicate, updater)),
    }
  }
  return root
}

// markmap INode 类型定义
export interface MarkmapINode {
  content: string
  children?: MarkmapINode[]
  payload?: {
    fold?: number
  }
}
