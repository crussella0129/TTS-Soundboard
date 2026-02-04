import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  // Theme
  getTheme: (): Promise<'system' | 'light' | 'dark'> => ipcRenderer.invoke('get-theme'),
  setTheme: (theme: 'system' | 'light' | 'dark'): Promise<void> =>
    ipcRenderer.invoke('set-theme', theme),
  getSystemDarkMode: (): Promise<boolean> => ipcRenderer.invoke('get-system-dark-mode'),

  // File operations
  fileOpen: (): Promise<{ canceled: boolean; filePath?: string; data?: unknown; error?: string }> =>
    ipcRenderer.invoke('file:open'),
  fileSave: (
    filePath: string,
    data: unknown
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('file:save', filePath, data),
  fileSaveAs: (
    data: unknown
  ): Promise<{ canceled: boolean; filePath?: string; error?: string }> =>
    ipcRenderer.invoke('file:save-as', data),
  fileRecent: (): Promise<string[]> => ipcRenderer.invoke('file:recent'),
  fileOpenPath: (
    filePath: string
  ): Promise<{ success: boolean; data?: unknown; error?: string }> =>
    ipcRenderer.invoke('file:open-path', filePath),

  // Notifications
  notify: (title: string, body: string): Promise<void> =>
    ipcRenderer.invoke('notify', title, body),

  // TTS
  ttsStatus: (): Promise<{ ready: boolean }> => ipcRenderer.invoke('tts:status'),
  ttsListVoices: (): Promise<{
    ok: boolean
    voices?: { id: string; name: string; languages: string[]; gender: string | null }[]
    error?: string
  }> => ipcRenderer.invoke('tts:list-voices'),
  ttsSynthesize: (params: {
    text: string
    voice_id?: string
    rate?: number
    volume?: number
    pitch?: number
    output?: string
  }): Promise<{ ok: boolean; output?: string; error?: string }> =>
    ipcRenderer.invoke('tts:synthesize', params),
  ttsPreview: (params: {
    text: string
    voice_id?: string
    rate?: number
    volume?: number
    pitch?: number
  }): Promise<{ ok: boolean; output?: string; error?: string }> =>
    ipcRenderer.invoke('tts:preview', params),
  ttsExport: (params: {
    text: string
    voice_id?: string
    rate?: number
    volume?: number
    pitch?: number
  }): Promise<{ canceled?: boolean; ok?: boolean; output?: string; error?: string }> =>
    ipcRenderer.invoke('tts:export', params),
  onTTSReady: (callback: () => void): void => {
    ipcRenderer.on('tts:ready', callback)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-expect-error fallback for non-isolated context
  window.electron = electronAPI
  // @ts-expect-error fallback for non-isolated context
  window.api = api
}
