export type ViewMode = 'split' | 'edit' | 'preview' | 'mindmap' | 'split-mindmap'

export type NodeType = 'folder' | 'file'

export interface FolderNode {
  id: string
  name: string
  type: NodeType
  noteId?: string
  children?: FolderNode[]
}

export interface NoteSummary {
  id: string
  title: string
  updatedAt: string
  folderId?: string
}

export interface NoteDetail extends NoteSummary {
  content: string
}

export interface StatusState {
  message: string
  tone: 'info' | 'success' | 'error'
}
