import { request } from './client'
import type { FolderNode, NoteDetail, NoteSummary } from '../types/notes'

export const fetchFolders = () => request<FolderNode[]>('/api/folders')

export const fetchNotes = () => request<NoteSummary[]>('/api/notes')

export const fetchNote = (id: string) => request<NoteDetail>(`/api/notes/${id}`)

export const createNote = (payload: { title: string; folderId?: string }) =>
  request<NoteDetail>('/api/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateNote = (id: string, payload: Partial<NoteDetail>) =>
  request<NoteDetail>(`/api/notes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const deleteNote = (id: string) =>
  request<void>(`/api/notes/${id}`, {
    method: 'DELETE',
  })

export const createFolder = (payload: { name: string; parentId?: string }) =>
  request<FolderNode>('/api/folders', {
    method: 'POST',
    body: JSON.stringify(payload),
  })

export const updateFolder = (id: string, payload: { name: string }) =>
  request<FolderNode>(`/api/folders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })

export const deleteFolder = (id: string) =>
  request<void>(`/api/folders/${id}`, {
    method: 'DELETE',
  })
