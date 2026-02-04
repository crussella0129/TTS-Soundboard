import { useState, useCallback, useEffect } from 'react'
import { TTSProject, createEmptyProject } from './types'
import VoicesView from './VoicesView'
import DialogueLibraryView from './DialogueLibraryView'
import SettingsView from './SettingsView'
import './App.css'

type View = 'voices' | 'dialogue-library' | 'settings'

function App(): JSX.Element {
  const [activeView, setActiveView] = useState<View>('voices')
  const [project, setProject] = useState<TTSProject>(createEmptyProject('Untitled'))
  const [filePath, setFilePath] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [recentFiles, setRecentFiles] = useState<string[]>([])

  useEffect(() => {
    window.api.fileRecent().then(setRecentFiles)
  }, [])

  const updateProject = useCallback(
    (updater: (prev: TTSProject) => TTSProject) => {
      setProject((prev) => {
        const next = updater(prev)
        next.updatedAt = new Date().toISOString()
        return next
      })
      setDirty(true)
    },
    []
  )

  const handleNew = useCallback(() => {
    setProject(createEmptyProject('Untitled'))
    setFilePath(null)
    setDirty(false)
  }, [])

  const handleOpen = useCallback(async () => {
    const result = await window.api.fileOpen()
    if (result.canceled) return
    if (result.error) {
      alert(result.error)
      return
    }
    setProject(result.data as TTSProject)
    setFilePath(result.filePath!)
    setDirty(false)
    window.api.fileRecent().then(setRecentFiles)
  }, [])

  const handleSave = useCallback(async () => {
    if (filePath) {
      const result = await window.api.fileSave(filePath, project)
      if (!result.success) {
        alert(`Save failed: ${result.error}`)
      } else {
        setDirty(false)
      }
    } else {
      const result = await window.api.fileSaveAs(project)
      if (!result.canceled) {
        if (result.error) {
          alert(`Save failed: ${result.error}`)
        } else {
          setFilePath(result.filePath!)
          setDirty(false)
          window.api.fileRecent().then(setRecentFiles)
        }
      }
    }
  }, [filePath, project])

  const handleSaveAs = useCallback(async () => {
    const result = await window.api.fileSaveAs(project)
    if (!result.canceled) {
      if (result.error) {
        alert(`Save failed: ${result.error}`)
      } else {
        setFilePath(result.filePath!)
        setDirty(false)
        window.api.fileRecent().then(setRecentFiles)
      }
    }
  }, [project])

  const handleOpenRecent = useCallback(async (path: string) => {
    const result = await window.api.fileOpenPath(path)
    if (!result.success) {
      alert(`Failed to open: ${result.error}`)
      return
    }
    setProject(result.data as TTSProject)
    setFilePath(path)
    setDirty(false)
    window.api.fileRecent().then(setRecentFiles)
  }, [])

  const navItems: { id: View; label: string; icon: string }[] = [
    { id: 'voices', label: 'Voice Profiles', icon: '\u{1F3A4}' },
    { id: 'dialogue-library', label: 'Dialogue Library', icon: '\u{1F4DA}' },
    { id: 'settings', label: 'Settings', icon: '\u{2699}\u{FE0F}' }
  ]

  const windowTitle = `${project.name}${dirty ? ' *' : ''}${filePath ? ` \u2014 ${filePath}` : ''}`

  return (
    <div className="app-layout">
      <nav className="sidebar" role="navigation" aria-label="Main navigation">
        <div className="sidebar-header">
          <h1 className="app-title">TTS-Soundboard</h1>
          <span className="project-name" title={windowTitle}>
            {project.name}
            {dirty && ' *'}
          </span>
        </div>
        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                className={`nav-item ${activeView === item.id ? 'active' : ''}`}
                onClick={() => setActiveView(item.id)}
                aria-current={activeView === item.id ? 'page' : undefined}
              >
                <span className="nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
      <main className="content" role="main">
        <header className="toolbar">
          <h2 className="view-title">
            {navItems.find((i) => i.id === activeView)?.label}
          </h2>
          <div className="toolbar-actions">
            <button className="toolbar-btn" onClick={handleNew} title="New Project">
              New
            </button>
            <button className="toolbar-btn" onClick={handleOpen} title="Open Project">
              Open
            </button>
            <button className="toolbar-btn" onClick={handleSave} title="Save Project">
              Save
            </button>
            <button className="toolbar-btn" onClick={handleSaveAs} title="Save As...">
              Save As
            </button>
          </div>
        </header>
        <div className="content-body">
          {activeView === 'voices' && (
            <VoicesView project={project} updateProject={updateProject} />
          )}
          {activeView === 'dialogue-library' && (
            <DialogueLibraryView project={project} updateProject={updateProject} />
          )}
          {activeView === 'settings' && (
            <SettingsView recentFiles={recentFiles} onOpenRecent={handleOpenRecent} />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
