import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, FileText, Folder, FolderOpen } from 'lucide-react'
import type { FolderNode } from '../types/notes'
import { filterTree } from '../utils/tree'
import styles from './FileTree.module.css'

interface FileTreeProps {
  nodes: FolderNode[]
  searchQuery: string
  selectedNodeId: string | null
  onSelect: (nodeId: string, nodeType: 'folder' | 'file', noteId?: string) => void
}

export function FileTree({ nodes, searchQuery, selectedNodeId, onSelect }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const filteredNodes = useMemo(() => filterTree(nodes, searchQuery), [nodes, searchQuery])
  const forceExpand = searchQuery.trim().length > 0

  useEffect(() => {
    const next = new Set<string>()
    nodes.forEach((node) => {
      if (node.type === 'folder') {
        next.add(node.id)
      }
    })
    setExpanded(next)
  }, [nodes])

  const toggleFolder = (nodeId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const renderNode = (node: FolderNode, depth = 0) => {
    const isFolder = node.type === 'folder'
    const isExpanded = forceExpand || expanded.has(node.id)
    const isSelected = selectedNodeId === node.id
    const paddingLeft = 10 + depth * 14

    return (
      <div key={node.id} className={styles.node}>
        <button
          className={styles.nodeRow}
          data-selected={isSelected}
          style={{ paddingLeft }}
          onClick={() => {
            onSelect(node.id, node.type, node.noteId)
            if (isFolder) {
              toggleFolder(node.id)
            }
          }}
        >
          <span className={styles.chevron}>
            {isFolder ? (isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
          </span>
          <span className={styles.icon}>
            {isFolder ? (isExpanded ? <FolderOpen size={16} /> : <Folder size={16} />) : <FileText size={16} />}
          </span>
          <span className={styles.label}>{node.name}</span>
        </button>
        {isFolder && isExpanded && node.children?.length ? (
          <div className={styles.children}>
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        ) : null}
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.sectionTitle}>文件树</div>
      {filteredNodes.length === 0 ? (
        <div className={styles.empty}>没有匹配的文件</div>
      ) : (
        <div className={styles.tree}>{filteredNodes.map((node) => renderNode(node))}</div>
      )}
    </div>
  )
}
