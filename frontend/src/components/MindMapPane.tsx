import { useCallback, useEffect, useRef, useState } from 'react'
import { Markmap } from 'markmap-view'
import { Transformer } from 'markmap-lib'
import { ZoomIn, ZoomOut, Maximize2, Edit2, Check, X, Plus, Trash2, CornerDownRight } from 'lucide-react'
import { markmapNodeToMarkdown, type MarkmapINode } from '../utils/mindmap'
import styles from './MindMapPane.module.css'

interface MindMapPaneProps {
  markdown: string
  onChange?: (markdown: string) => void
  isEmpty?: boolean
  readonly?: boolean
}

interface ContextMenuState {
  x: number
  y: number
  nodeContent: string
}

const transformer = new Transformer()

export function MindMapPane({ markdown, onChange, isEmpty, readonly = false }: MindMapPaneProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const markmapRef = useRef<Markmap | null>(null)
  const [rootNode, setRootNode] = useState<MarkmapINode | null>(null)
  const [editingNode, setEditingNode] = useState<{ element: SVGGElement; content: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [selectedNodeContent, setSelectedNodeContent] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 初始化 markmap
  useEffect(() => {
    if (!svgRef.current) return

    if (!markmapRef.current) {
      markmapRef.current = Markmap.create(svgRef.current, {
        autoFit: true,
        duration: 300,
        maxWidth: 300,
        paddingX: 16,
      })
    }

    return () => {
      // 不销毁实例，因为可能需要重用
    }
  }, [])

  // 当 markdown 变化时更新思维导图
  useEffect(() => {
    if (!markmapRef.current || !markdown) return

    try {
      const { root } = transformer.transform(markdown)
      setRootNode(root as MarkmapINode)
      markmapRef.current.setData(root)
      markmapRef.current.fit()
    } catch (error) {
      console.error('Failed to parse markdown for mindmap:', error)
    }
  }, [markdown])

  // 设置节点交互事件
  useEffect(() => {
    if (!svgRef.current || readonly) return

    const svg = svgRef.current
    
    // 双击编辑
    const handleDoubleClick = (event: MouseEvent) => {
      const target = event.target as Element
      const gNode = target.closest('g.markmap-node') as SVGGElement | null
      
      if (gNode) {
        event.preventDefault()
        event.stopPropagation()
        
        const foreignObject = gNode.querySelector('foreignObject')
        const textContent = foreignObject?.textContent || ''
        
        setEditingNode({ element: gNode, content: textContent })
        setEditValue(textContent)
        setContextMenu(null)
      }
    }

    // 单击选中
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Element
      const gNode = target.closest('g.markmap-node') as SVGGElement | null
      
      if (gNode) {
        const foreignObject = gNode.querySelector('foreignObject')
        const textContent = foreignObject?.textContent || ''
        setSelectedNodeContent(textContent)
        
        // 更新选中样式
        svg.querySelectorAll('g.markmap-node').forEach((node) => {
          node.classList.remove(styles.selected)
        })
        gNode.classList.add(styles.selected)
      } else {
        setSelectedNodeContent(null)
        svg.querySelectorAll('g.markmap-node').forEach((node) => {
          node.classList.remove(styles.selected)
        })
      }
      setContextMenu(null)
    }

    // 右键菜单
    const handleContextMenu = (event: MouseEvent) => {
      const target = event.target as Element
      const gNode = target.closest('g.markmap-node') as SVGGElement | null
      
      if (gNode) {
        event.preventDefault()
        const foreignObject = gNode.querySelector('foreignObject')
        const textContent = foreignObject?.textContent || ''
        
        setSelectedNodeContent(textContent)
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          nodeContent: textContent,
        })
        
        // 更新选中样式
        svg.querySelectorAll('g.markmap-node').forEach((node) => {
          node.classList.remove(styles.selected)
        })
        gNode.classList.add(styles.selected)
      }
    }

    svg.addEventListener('dblclick', handleDoubleClick)
    svg.addEventListener('click', handleClick)
    svg.addEventListener('contextmenu', handleContextMenu)
    
    return () => {
      svg.removeEventListener('dblclick', handleDoubleClick)
      svg.removeEventListener('click', handleClick)
      svg.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [readonly])

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null)
    }
    
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  // 当编辑模式激活时聚焦输入框
  useEffect(() => {
    if (editingNode && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingNode])

  // 处理节点内容更新
  const handleEditConfirm = useCallback(() => {
    if (!editingNode || !rootNode || !onChange) return

    const oldContent = editingNode.content
    const newContent = editValue.trim()

    if (newContent && newContent !== oldContent) {
      const updatedRoot = updateNodeContent(rootNode, oldContent, newContent)
      setRootNode(updatedRoot)
      const newMarkdown = markmapNodeToMarkdown(updatedRoot)
      onChange(newMarkdown)
    }

    setEditingNode(null)
    setEditValue('')
  }, [editingNode, editValue, rootNode, onChange])

  const handleEditCancel = useCallback(() => {
    setEditingNode(null)
    setEditValue('')
  }, [])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleEditConfirm()
    } else if (event.key === 'Escape') {
      handleEditCancel()
    }
  }, [handleEditConfirm, handleEditCancel])

  // 缩放控制
  const handleZoomIn = useCallback(() => {
    if (markmapRef.current) {
      const currentTransform = markmapRef.current.svg.attr('transform') || ''
      const match = currentTransform.match(/scale\(([\d.]+)\)/)
      const currentScale = match ? parseFloat(match[1]) : 1
      markmapRef.current.rescale(currentScale * 1.2)
    }
  }, [])

  const handleZoomOut = useCallback(() => {
    if (markmapRef.current) {
      const currentTransform = markmapRef.current.svg.attr('transform') || ''
      const match = currentTransform.match(/scale\(([\d.]+)\)/)
      const currentScale = match ? parseFloat(match[1]) : 1
      markmapRef.current.rescale(currentScale / 1.2)
    }
  }, [])

  const handleFitView = useCallback(() => {
    if (markmapRef.current) {
      markmapRef.current.fit()
    }
  }, [])

  // 添加根级节点
  const handleAddNode = useCallback(() => {
    if (!rootNode || !onChange) return
    
    const newNode: MarkmapINode = {
      content: '新节点',
      children: [],
    }
    
    const updatedRoot: MarkmapINode = {
      ...rootNode,
      children: [...(rootNode.children || []), newNode],
    }
    
    setRootNode(updatedRoot)
    const newMarkdown = markmapNodeToMarkdown(updatedRoot)
    onChange(newMarkdown)
  }, [rootNode, onChange])

  // 添加子节点到选中节点
  const handleAddChildNode = useCallback(() => {
    if (!rootNode || !onChange || !selectedNodeContent) return
    
    const updatedRoot = addChildToNode(rootNode, selectedNodeContent, {
      content: '新子节点',
      children: [],
    })
    
    setRootNode(updatedRoot)
    const newMarkdown = markmapNodeToMarkdown(updatedRoot)
    onChange(newMarkdown)
    setContextMenu(null)
  }, [rootNode, onChange, selectedNodeContent])

  // 删除选中节点
  const handleDeleteNode = useCallback(() => {
    if (!rootNode || !onChange || !selectedNodeContent) return
    
    // 不允许删除根节点
    if (stripHtml(rootNode.content) === selectedNodeContent) {
      return
    }
    
    const updatedRoot = deleteNodeByContent(rootNode, selectedNodeContent)
    if (updatedRoot) {
      setRootNode(updatedRoot)
      const newMarkdown = markmapNodeToMarkdown(updatedRoot)
      onChange(newMarkdown)
    }
    setSelectedNodeContent(null)
    setContextMenu(null)
  }, [rootNode, onChange, selectedNodeContent])

  // 编辑选中节点
  const handleEditSelectedNode = useCallback(() => {
    if (!selectedNodeContent) return
    setEditValue(selectedNodeContent)
    setEditingNode({ element: null as unknown as SVGGElement, content: selectedNodeContent })
    setContextMenu(null)
  }, [selectedNodeContent])

  if (isEmpty) {
    return (
      <div className={styles.container}>
        <div className={styles.empty}>
          <p>请选择或创建一个笔记以查看思维导图</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.toolbar}>
        <button 
          className={styles.toolButton} 
          onClick={handleZoomIn}
          title="放大"
        >
          <ZoomIn size={16} />
        </button>
        <button 
          className={styles.toolButton} 
          onClick={handleZoomOut}
          title="缩小"
        >
          <ZoomOut size={16} />
        </button>
        <button 
          className={styles.toolButton} 
          onClick={handleFitView}
          title="适应视图"
        >
          <Maximize2 size={16} />
        </button>
        {!readonly && (
          <>
            <div className={styles.divider} />
            <button 
              className={styles.toolButton} 
              onClick={handleAddNode}
              title="添加节点"
            >
              <Plus size={16} />
            </button>
            <button 
              className={styles.toolButton} 
              onClick={handleAddChildNode}
              disabled={!selectedNodeContent}
              title="添加子节点"
            >
              <CornerDownRight size={16} />
            </button>
            <button 
              className={styles.toolButton} 
              onClick={handleEditSelectedNode}
              disabled={!selectedNodeContent}
              title="编辑节点"
            >
              <Edit2 size={16} />
            </button>
            <button 
              className={styles.toolButton} 
              onClick={handleDeleteNode}
              disabled={!selectedNodeContent || Boolean(rootNode && stripHtml(rootNode.content) === selectedNodeContent)}
              title="删除节点"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
      </div>
      
      <div className={styles.mindmapWrapper}>
        <svg ref={svgRef} className={styles.mindmapSvg} />
      </div>

      {/* 右键菜单 */}
      {contextMenu && !readonly && (
        <div 
          className={styles.contextMenu}
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={handleEditSelectedNode}>
            <Edit2 size={14} />
            编辑节点
          </button>
          <button onClick={handleAddChildNode}>
            <CornerDownRight size={14} />
            添加子节点
          </button>
          {rootNode && stripHtml(rootNode.content) !== contextMenu.nodeContent && (
            <button onClick={handleDeleteNode} className={styles.deleteMenuItem}>
              <Trash2 size={14} />
              删除节点
            </button>
          )}
        </div>
      )}

      {/* 编辑对话框 */}
      {editingNode && (
        <div className={styles.editOverlay}>
          <div className={styles.editDialog}>
            <div className={styles.editHeader}>
              <Edit2 size={16} />
              <span>编辑节点</span>
            </div>
            <input
              ref={inputRef}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.editInput}
              placeholder="输入节点内容"
            />
            <div className={styles.editActions}>
              <button 
                className={styles.editConfirm} 
                onClick={handleEditConfirm}
              >
                <Check size={14} />
                确定
              </button>
              <button 
                className={styles.editCancel} 
                onClick={handleEditCancel}
              >
                <X size={14} />
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {!readonly && (
        <div className={styles.hint}>
          双击编辑 | 右键更多操作 | 点击选中节点
        </div>
      )}
    </div>
  )
}

/**
 * 更新节点树中匹配内容的节点
 */
function updateNodeContent(
  node: MarkmapINode, 
  oldContent: string, 
  newContent: string
): MarkmapINode {
  const nodeText = stripHtml(node.content)
  
  if (nodeText === oldContent) {
    return {
      ...node,
      content: newContent,
    }
  }
  
  if (node.children && node.children.length > 0) {
    return {
      ...node,
      children: node.children.map((child) => 
        updateNodeContent(child, oldContent, newContent)
      ),
    }
  }
  
  return node
}

/**
 * 添加子节点到指定节点
 */
function addChildToNode(
  node: MarkmapINode,
  targetContent: string,
  newChild: MarkmapINode
): MarkmapINode {
  const nodeText = stripHtml(node.content)
  
  if (nodeText === targetContent) {
    return {
      ...node,
      children: [...(node.children || []), newChild],
    }
  }
  
  if (node.children && node.children.length > 0) {
    return {
      ...node,
      children: node.children.map((child) => 
        addChildToNode(child, targetContent, newChild)
      ),
    }
  }
  
  return node
}

/**
 * 删除指定内容的节点
 */
function deleteNodeByContent(
  node: MarkmapINode,
  targetContent: string
): MarkmapINode | null {
  const nodeText = stripHtml(node.content)
  
  // 如果当前节点是目标，返回 null（由父节点过滤掉）
  if (nodeText === targetContent) {
    return null
  }
  
  // 递归处理子节点
  if (node.children && node.children.length > 0) {
    const filteredChildren = node.children
      .map((child) => deleteNodeByContent(child, targetContent))
      .filter((child): child is MarkmapINode => child !== null)
    
    return {
      ...node,
      children: filteredChildren,
    }
  }
  
  return node
}

/**
 * 去除 HTML 标签
 */
function stripHtml(html: string): string {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}
