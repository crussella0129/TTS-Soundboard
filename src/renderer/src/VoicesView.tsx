import { useState, useEffect, useRef, useCallback } from 'react'
import { TTSProject, VoiceProfile, VoiceGraph, generateId, ACCENT_PRESETS } from './types'
import NodeGraphEditor from './NodeGraphEditor'

interface Props {
  project: TTSProject
  updateProject: (updater: (prev: TTSProject) => TTSProject) => void
}

const DEFAULT_GRAPH: VoiceGraph = {
  nodes: [
    { id: 'input', type: 'input', position: { x: 50, y: 200 }, params: {} },
    { id: 'output', type: 'output', position: { x: 700, y: 200 }, params: {} }
  ],
  edges: []
}

function createDefaultProfile(): VoiceProfile {
  const now = new Date().toISOString()
  return {
    id: generateId(),
    name: '',
    pitch: 0,
    rate: 150,
    volume: 1.0,
    accent: 'neutral',
    graph: structuredClone(DEFAULT_GRAPH),
    createdAt: now,
    updatedAt: now
  }
}

export default function VoicesView({ project, updateProject }: Props): JSX.Element {
  const [editing, setEditing] = useState<VoiceProfile | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [editorTab, setEditorTab] = useState<'params' | 'graph'>('params')
  const [systemVoices, setSystemVoices] = useState<TTSVoice[]>([])
  const [selectedSystemVoice, setSelectedSystemVoice] = useState<string>('')
  const [previewText, setPreviewText] = useState('Hello, I am a voice profile preview.')
  const [synthesizing, setSynthesizing] = useState(false)
  const [dspRegistry, setDspRegistry] = useState<Record<string, DSPNodeDef>>({})
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    const loadVoices = async (): Promise<void> => {
      try {
        const result = await window.api.ttsListVoices()
        if (result.ok && result.voices) {
          setSystemVoices(result.voices)
          if (result.voices.length > 0 && !selectedSystemVoice) {
            setSelectedSystemVoice(result.voices[0].id)
          }
        }
      } catch {
        // TTS not ready yet
      }
    }

    const loadDSPNodes = async (): Promise<void> => {
      try {
        const result = await window.api.ttsListDSPNodes()
        if (result.ok && result.nodes) {
          setDspRegistry(result.nodes as Record<string, DSPNodeDef>)
        }
      } catch {
        // TTS not ready yet
      }
    }

    loadVoices()
    loadDSPNodes()
    window.api.onTTSReady(() => {
      loadVoices()
      loadDSPNodes()
    })
  }, [])

  const handleAdd = (): void => {
    const profile = createDefaultProfile()
    setEditing(profile)
    setIsNew(true)
    setEditorTab('params')
  }

  const handleEdit = (vp: VoiceProfile): void => {
    setEditing({
      ...vp,
      graph: vp.graph ?? structuredClone(DEFAULT_GRAPH)
    })
    setIsNew(false)
    setEditorTab('params')
  }

  const handleSave = (): void => {
    if (!editing || !editing.name.trim()) return
    const saved: VoiceProfile = {
      ...editing,
      systemVoiceId: selectedSystemVoice || undefined,
      updatedAt: new Date().toISOString()
    }
    updateProject((prev) => {
      if (isNew) {
        return { ...prev, voiceProfiles: [...prev.voiceProfiles, saved] }
      }
      return {
        ...prev,
        voiceProfiles: prev.voiceProfiles.map((vp) => (vp.id === saved.id ? saved : vp))
      }
    })
    setEditing(null)
    setIsNew(false)
  }

  const handleDelete = (id: string): void => {
    updateProject((prev) => ({
      ...prev,
      voiceProfiles: prev.voiceProfiles.filter((vp) => vp.id !== id)
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

  const handleGraphChange = useCallback(
    (graph: VoiceGraph) => {
      setEditing((prev) => (prev ? { ...prev, graph } : null))
    },
    []
  )

  const handlePreview = async (): Promise<void> => {
    if (!editing || synthesizing) return
    setSynthesizing(true)
    try {
      const graph = editing.graph
      const hasDSPNodes = graph && graph.nodes.some(
        (n) => n.id !== 'input' && n.id !== 'output'
      )

      let result
      if (hasDSPNodes && graph) {
        // Use graph processing pipeline
        result = await window.api.ttsProcessGraph({
          text: previewText,
          voice_id: selectedSystemVoice || undefined,
          rate: editing.rate,
          volume: editing.volume,
          graph: {
            nodes: graph.nodes
              .filter((n) => n.id !== 'input' && n.id !== 'output')
              .map((n) => ({ id: n.id, type: n.type, params: n.params })),
            edges: graph.edges.map((e) => ({ source: e.source, target: e.target }))
          }
        })
      } else {
        // Simple preview without DSP
        result = await window.api.ttsPreview({
          text: previewText,
          voice_id: selectedSystemVoice || undefined,
          rate: editing.rate,
          volume: editing.volume,
          pitch: editing.pitch
        })
      }

      if (result.ok && result.dataUrl) {
        if (audioRef.current) {
          audioRef.current.pause()
        }
        const audio = new Audio(result.dataUrl)
        audioRef.current = audio
        audio.play()
      } else if (result.error) {
        alert(`Preview failed: ${result.error}`)
      }
    } catch (err) {
      alert(`Preview failed: ${(err as Error).message}`)
    } finally {
      setSynthesizing(false)
    }
  }

  // Sync selectedSystemVoice when editing a profile that has one saved
  useEffect(() => {
    if (editing?.systemVoiceId && systemVoices.length > 0) {
      setSelectedSystemVoice(editing.systemVoiceId)
    }
  }, [editing?.id])

  return (
    <div className="view-container">
      <div className="view-header">
        <h3>Voice Profiles ({project.voiceProfiles.length})</h3>
        <button className="btn-primary" onClick={handleAdd}>
          + Add Profile
        </button>
      </div>

      {editing && (
        <div className="form-card">
          <h4>{isNew ? 'New Voice Profile' : 'Edit Voice Profile'}</h4>

          <div className="voice-editor-tabs">
            <button
              className={`voice-editor-tab ${editorTab === 'params' ? 'active' : ''}`}
              onClick={() => setEditorTab('params')}
            >
              Parameters
            </button>
            <button
              className={`voice-editor-tab ${editorTab === 'graph' ? 'active' : ''}`}
              onClick={() => setEditorTab('graph')}
              disabled={Object.keys(dspRegistry).length === 0}
              title={Object.keys(dspRegistry).length === 0 ? 'DSP engine loading...' : 'Edit DSP node graph'}
            >
              DSP Graph
            </button>
          </div>

          {editorTab === 'params' && (
            <div className="form-grid">
              <label className="form-field">
                <span className="form-label">Name</span>
                <input
                  type="text"
                  value={editing.name}
                  onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                  placeholder="e.g. Guard Captain"
                  autoFocus
                />
              </label>
              <label className="form-field">
                <span className="form-label">Accent</span>
                <select
                  value={editing.accent}
                  onChange={(e) => setEditing({ ...editing, accent: e.target.value })}
                >
                  {ACCENT_PRESETS.map((a) => (
                    <option key={a} value={a}>
                      {a.replace(/-/g, ' ')}
                    </option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">System Voice</span>
                <select
                  value={selectedSystemVoice}
                  onChange={(e) => setSelectedSystemVoice(e.target.value)}
                >
                  {systemVoices.length === 0 ? (
                    <option value="">Loading...</option>
                  ) : (
                    systemVoices.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">
                  Pitch{' '}
                  <span className="form-value">
                    {editing.pitch > 0 ? '+' : ''}
                    {editing.pitch} st
                  </span>
                </span>
                <input
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={editing.pitch}
                  onChange={(e) => setEditing({ ...editing, pitch: Number(e.target.value) })}
                />
              </label>
              <label className="form-field">
                <span className="form-label">
                  Rate <span className="form-value">{editing.rate} wpm</span>
                </span>
                <input
                  type="range"
                  min={80}
                  max={300}
                  step={5}
                  value={editing.rate}
                  onChange={(e) => setEditing({ ...editing, rate: Number(e.target.value) })}
                />
              </label>
              <label className="form-field">
                <span className="form-label">
                  Volume <span className="form-value">{Math.round(editing.volume * 100)}%</span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={editing.volume}
                  onChange={(e) => setEditing({ ...editing, volume: Number(e.target.value) })}
                />
              </label>
              <label className="form-field form-field-wide">
                <span className="form-label">Preview Text</span>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Text to speak for preview..."
                />
              </label>
            </div>
          )}

          {editorTab === 'graph' && editing.graph && (
            <div>
              <p className="graph-section-label">
                Right-click to add DSP effect nodes. Drag between handles to connect them.
              </p>
              <NodeGraphEditor
                graph={editing.graph}
                onChange={handleGraphChange}
                dspRegistry={dspRegistry}
              />
            </div>
          )}

          <div className="form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={!editing.name.trim()}>
              {isNew ? 'Create' : 'Save'}
            </button>
            <button
              className="btn-secondary"
              onClick={handlePreview}
              disabled={synthesizing || !previewText.trim()}
            >
              {synthesizing ? 'Processing...' : 'Preview'}
            </button>
            <button className="btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {project.voiceProfiles.length === 0 && !editing ? (
        <div className="placeholder">
          <p>No voice profiles yet.</p>
          <p className="placeholder-sub">
            Create parametric voice profiles to define how your characters sound.
          </p>
        </div>
      ) : (
        <div className="list">
          {project.voiceProfiles.map((vp) => (
            <div
              key={vp.id}
              className={`list-item ${editing?.id === vp.id ? 'selected' : ''}`}
              onClick={() => handleEdit(vp)}
            >
              <div className="list-item-left">
                <span className="list-item-name">{vp.name}</span>
                <span className="list-item-detail">
                  {vp.accent} | Pitch: {vp.pitch > 0 ? '+' : ''}
                  {vp.pitch}st | Rate: {vp.rate} wpm
                  {vp.graph && vp.graph.nodes.length > 2 && (
                    <> | {vp.graph.nodes.length - 2} DSP node{vp.graph.nodes.length - 2 !== 1 ? 's' : ''}</>
                  )}
                </span>
              </div>
              <button
                className="btn-icon btn-danger"
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(vp.id)
                }}
                title="Delete profile"
                aria-label={`Delete ${vp.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
