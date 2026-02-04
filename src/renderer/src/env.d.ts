/// <reference types="vite/client" />

interface TTSVoice {
  id: string
  name: string
  languages: string[]
  gender: string | null
}

interface TTSParams {
  text: string
  voice_id?: string
  rate?: number
  volume?: number
  pitch?: number
}

interface DSPParamDef {
  type: 'float' | 'int' | 'select'
  min?: number
  max?: number
  default: number | string
  label: string
  options?: string[]
}

interface DSPNodeDef {
  label: string
  category: string
  params: Record<string, DSPParamDef>
}

interface DSPGraphNode {
  id: string
  type: string
  params: Record<string, number | string>
}

interface DSPGraph {
  nodes: DSPGraphNode[]
  edges: { source: string; target: string }[]
}

interface Window {
  electron: typeof import('@electron-toolkit/preload').electronAPI
  api: {
    getTheme: () => Promise<'system' | 'light' | 'dark'>
    setTheme: (theme: 'system' | 'light' | 'dark') => Promise<void>
    getSystemDarkMode: () => Promise<boolean>
    fileOpen: () => Promise<{ canceled: boolean; filePath?: string; data?: unknown; error?: string }>
    fileSave: (filePath: string, data: unknown) => Promise<{ success: boolean; error?: string }>
    fileSaveAs: (data: unknown) => Promise<{ canceled: boolean; filePath?: string; error?: string }>
    fileRecent: () => Promise<string[]>
    fileOpenPath: (filePath: string) => Promise<{ success: boolean; data?: unknown; error?: string }>
    notify: (title: string, body: string) => Promise<void>
    ttsStatus: () => Promise<{ ready: boolean }>
    ttsListVoices: () => Promise<{ ok: boolean; voices?: TTSVoice[]; error?: string }>
    ttsSynthesize: (params: TTSParams & { output?: string }) => Promise<{ ok: boolean; output?: string; error?: string }>
    ttsPreview: (params: TTSParams) => Promise<{ ok: boolean; dataUrl?: string; error?: string }>
    ttsExport: (params: TTSParams & { graph?: object }) => Promise<{ canceled?: boolean; ok?: boolean; output?: string; error?: string }>
    ttsListDSPNodes: () => Promise<{ ok: boolean; nodes?: Record<string, DSPNodeDef>; error?: string }>
    ttsProcessGraph: (params: { text: string; voice_id?: string; rate?: number; volume?: number; graph: DSPGraph; output?: string }) => Promise<{ ok: boolean; dataUrl?: string; error?: string }>
    onTTSReady: (callback: () => void) => void
  }
}
