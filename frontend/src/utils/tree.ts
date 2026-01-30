import type { FolderNode } from '../types/notes'

export function findNodeById(nodes: FolderNode[], id: string): FolderNode | null {
  for (const node of nodes) {
    if (node.id === id) {
      return node
    }
    if (node.children?.length) {
      const found = findNodeById(node.children, id)
      if (found) {
        return found
      }
    }
  }
  return null
}

export function filterTree(nodes: FolderNode[], query: string): FolderNode[] {
  const normalized = query.trim().toLowerCase()
  if (!normalized) {
    return nodes
  }

  return nodes
    .map((node) => {
      const nameMatches = node.name.toLowerCase().includes(normalized)
      if (node.type === 'file') {
        return nameMatches ? { ...node } : null
      }
      const children = filterTree(node.children ?? [], query)
      if (nameMatches || children.length > 0) {
        return {
          ...node,
          children,
        }
      }
      return null
    })
    .filter((node): node is FolderNode => node !== null)
}
