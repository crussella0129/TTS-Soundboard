import { useState, useRef } from 'react'
import { TTSProject, DialogueAsset, generateId, EMOTIONS, CATEGORIES } from './types'

interface Props {
  project: TTSProject
  updateProject: (updater: (prev: TTSProject) => TTSProject) => void
}

type LibraryTab = 'assets' | 'graph'

function createDefaultAsset(): DialogueAsset {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    actorId: '',
    text: '',
    voiceProfileId: '',
    emotion: 'neutral',
    category: 'dialogue',
    createdAt: now,
    updatedAt: now
  }
}

export default function DialogueLibraryView({ project, updateProject }: Props): JSX.Element {
  const [tab, setTab] = useState<LibraryTab>('assets')
  const [editing, setEditing] = useState<DialogueAsset | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [synthesizing, setSynthesizing] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const handleAdd = (): void => {
    const asset = createDefaultAsset()
    if (project.voiceProfiles.length > 0) {
      asset.voiceProfileId = project.voiceProfiles[0].id
    }
    setEditing(asset)
    setIsNew(true)
  }

  const handleEdit = (da: DialogueAsset): void => {
    setEditing({ ...da })
    setIsNew(false)
  }

  const handleSave = (): void => {
    if (!editing || !editing.text.trim()) return
    const saved = { ...editing, updatedAt: new Date().toISOString() }
    updateProject((prev) => {
      if (isNew) {
        return { ...prev, dialogueAssets: [...prev.dialogueAssets, saved] }
      }
      return {
        ...prev,
        dialogueAssets: prev.dialogueAssets.map((da) => (da.id === saved.id ? saved : da))
      }
    })
    setEditing(null)
    setIsNew(false)
  }

  const handleDelete = (id: string): void => {
    updateProject((prev) => ({
      ...prev,
      dialogueAssets: prev.dialogueAssets.filter((da) => da.id !== id)
    }))
    if (editing?.id === id) {
      setEditing(null)
      setIsNew(false)
    }
  }

  const handleCancel = (): void => {
    setEditing(null)
    setIsNew(false)
  }

  const getProfile = (id: string): { name: string; rate: number; volume: number; pitch: number } | null => {
    const vp = project.voiceProfiles.find((v) => v.id === id)
    if (!vp) return null
    return { name: vp.name, rate: vp.rate, volume: vp.volume, pitch: vp.pitch }
  }

  const getProfileName = (id: string): string => {
    return getProfile(id)?.name || 'None'
  }

  const handlePlayAsset = async (da: DialogueAsset): Promise<void> => {
    if (synthesizing) return
    const profile = getProfile(da.voiceProfileId)
    setSynthesizing(da.id)
    try {
      const result = await window.api.ttsPreview({
        text: da.text,
        rate: profile?.rate ?? 150,
        volume: profile?.volume ?? 1.0,
        pitch: profile?.pitch ?? 0
      })
      if (result.ok && result.output) {
        if (audioRef.current) audioRef.current.pause()
        const audio = new Audio(`file://${result.output}`)
        audioRef.current = audio
        audio.play()
      } else if (result.error) {
        alert(`Synthesis failed: ${result.error}`)
      }
    } catch (err) {
      alert(`Synthesis failed: ${(err as Error).message}`)
    } finally {
      setSynthesizing(null)
    }
  }

  const handleExportAsset = async (da: DialogueAsset): Promise<void> => {
    const profile = getProfile(da.voiceProfileId)
    const result = await window.api.ttsExport({
      text: da.text,
      rate: profile?.rate ?? 150,
      volume: profile?.volume ?? 1.0,
      pitch: profile?.pitch ?? 0
    })
    if (result.ok) {
      window.api.notify('Export Complete', `Audio saved to ${result.output}`)
    } else if (result.error) {
      alert(`Export failed: ${result.error}`)
    }
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <h3>Dialogue Library ({project.dialogueAssets.length} assets)</h3>
        <div className="view-header-right">
          <div className="tab-group">
            <button
              className={`tab-btn ${tab === 'assets' ? 'active' : ''}`}
              onClick={() => setTab('assets')}
            >
              Assets
            </button>
            <button
              className={`tab-btn ${tab === 'graph' ? 'active' : ''}`}
              onClick={() => setTab('graph')}
            >
              Graph
            </button>
          </div>
          {tab === 'assets' && (
            <button className="btn-primary" onClick={handleAdd}>
              + Add Dialogue
            </button>
          )}
        </div>
      </div>

      {tab === 'assets' && (
        <>
          {editing && (
            <div className="form-card">
              <h4>{isNew ? 'New Dialogue Asset' : 'Edit Dialogue Asset'}</h4>
              <div className="form-grid">
                <label className="form-field form-field-wide">
                  <span className="form-label">Dialogue Text</span>
                  <textarea
                    value={editing.text}
                    onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                    placeholder="What the character says..."
                    rows={3}
                    autoFocus
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Actor ID</span>
                  <input
                    type="text"
                    value={editing.actorId}
                    onChange={(e) => setEditing({ ...editing, actorId: e.target.value })}
                    placeholder="e.g. guard_01"
                  />
                </label>
                <label className="form-field">
                  <span className="form-label">Voice Profile</span>
                  <select
                    value={editing.voiceProfileId}
                    onChange={(e) => setEditing({ ...editing, voiceProfileId: e.target.value })}
                  >
                    <option value="">None</option>
                    {project.voiceProfiles.map((vp) => (
                      <option key={vp.id} value={vp.id}>
                        {vp.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">Emotion</span>
                  <select
                    value={editing.emotion}
                    onChange={(e) => setEditing({ ...editing, emotion: e.target.value })}
                  >
                    {EMOTIONS.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">Category</span>
                  <select
                    value={editing.category}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        category: e.target.value as DialogueAsset['category']
                      })
                    }
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="form-actions">
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={!editing.text.trim()}
                >
                  {isNew ? 'Create' : 'Save'}
                </button>
                <button className="btn-secondary" onClick={handleCancel}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          {project.dialogueAssets.length === 0 && !editing ? (
            <div className="placeholder">
              <p>No dialogue assets yet.</p>
              <p className="placeholder-sub">
                Add dialogue entries and bind them to actors and voice profiles.
              </p>
            </div>
          ) : (
            <div className="list">
              {project.dialogueAssets.map((da) => (
                <div
                  key={da.id}
                  className={`list-item ${editing?.id === da.id ? 'selected' : ''}`}
                  onClick={() => handleEdit(da)}
                >
                  <div className="list-item-left">
                    <span className="list-item-name">
                      {da.text.length > 80 ? da.text.slice(0, 80) + '...' : da.text}
                    </span>
                    <span className="list-item-detail">
                      {da.actorId || 'No actor'} | {getProfileName(da.voiceProfileId)} |{' '}
                      {da.category} | {da.emotion}
                    </span>
                  </div>
                  <div className="list-item-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handlePlayAsset(da)
                      }}
                      title="Play"
                      disabled={synthesizing === da.id}
                      aria-label="Play dialogue"
                    >
                      {synthesizing === da.id ? '...' : '\u25B6'}
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleExportAsset(da)
                      }}
                      title="Export .wav"
                      aria-label="Export audio"
                    >
                      \u2B07
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(da.id)
                      }}
                      title="Delete asset"
                      aria-label="Delete dialogue asset"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'graph' && (
        <div className="placeholder">
          <p>Dialogue Graph</p>
          <p className="placeholder-sub">
            Directed graph visualization of dialogue relationships. (Phase 2)
          </p>
        </div>
      )}
    </div>
  )
}
