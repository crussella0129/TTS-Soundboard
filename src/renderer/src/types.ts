/** Voice profile parameters for TTS synthesis */
export interface VoiceProfile {
  id: string
  name: string
  pitch: number // semitones offset, -12 to +12
  rate: number // words per minute, 80 to 300
  volume: number // 0.0 to 1.0
  accent: string // preset identifier
  createdAt: string
  updatedAt: string
}

/** A single dialogue entry bound to an actor and voice profile */
export interface DialogueAsset {
  id: string // deterministic hash
  actorId: string
  text: string
  voiceProfileId: string
  emotion: string
  category: 'bark' | 'narration' | 'combat' | 'ambient' | 'dialogue' | 'other'
  audioCachePath?: string // path to cached .wav
  createdAt: string
  updatedAt: string
}

/** An actor/character in the project */
export interface Actor {
  id: string
  name: string
  voiceProfileId: string
}

/** The full project file structure (.ttsp) */
export interface TTSProject {
  version: '1.0'
  name: string
  createdAt: string
  updatedAt: string
  voiceProfiles: VoiceProfile[]
  actors: Actor[]
  dialogueAssets: DialogueAsset[]
}

/** Generate a short random ID */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

/** Accent presets available in Phase 1 */
export const ACCENT_PRESETS = [
  'neutral',
  'american',
  'british',
  'australian',
  'southern-us',
  'midwest-us',
  'new-york'
] as const

/** Emotion tags */
export const EMOTIONS = [
  'neutral',
  'happy',
  'sad',
  'angry',
  'fearful',
  'surprised',
  'disgusted',
  'calm',
  'excited'
] as const

/** Dialogue categories */
export const CATEGORIES = [
  'bark',
  'narration',
  'combat',
  'ambient',
  'dialogue',
  'other'
] as const

/** Creates a new empty project */
export function createEmptyProject(name: string): TTSProject {
  const now = new Date().toISOString()
  return {
    version: '1.0',
    name,
    createdAt: now,
    updatedAt: now,
    voiceProfiles: [],
    actors: [],
    dialogueAssets: []
  }
}
