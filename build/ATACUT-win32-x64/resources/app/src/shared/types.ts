import { EditMode, TrackType, TransitionType, EffectType, HardwareAccelType } from './constants';

// ============================================================================
// MEDIA & CLIPS
// ============================================================================

export interface MediaFile {
  id: string;
  name: string;
  path: string;
  type: 'video' | 'audio' | 'image';
  duration: number; // in seconds
  width?: number;
  height?: number;
  fps?: number;
  codec?: string;
  bitrate?: number;
  size: number; // file size in bytes
  thumbnailPath?: string;
  proxyPath?: string;
  proxyStatus: 'none' | 'generating' | 'ready' | 'failed';
  waveformPath?: string;
  metadata?: MediaMetadata;
  createdAt: number;
  favorite?: boolean;
  rating?: number; // 0-5
  tags?: string[];
}

export interface MediaMetadata {
  cameraModel?: string;
  cameraName?: string; // e.g., "GoPro HERO 11", "DJI Osmo Action 4"
  dateRecorded?: string;
  location?: string;
  resolution?: string;
  isActionCamera?: boolean;
  needsStabilization?: boolean;
}

export interface Clip {
  id: string;
  mediaId: string;
  trackId: string;
  startTime: number; // position on timeline in seconds
  duration: number; // visible duration on timeline
  trimStart: number; // trim in point relative to source media
  trimEnd: number; // trim out point relative to source media
  volume: number; // 0-1
  muted: boolean;
  locked: boolean;
  effects: Effect[];
  transitions: {
    in?: Transition;
    out?: Transition;
  };
  textOverlay?: TextOverlay;
  transform?: Transform;
  linked?: boolean; // for audio-video linking
  linkedClipId?: string;
  version?: string; // for clip versioning
  color?: string; // clip label color
}

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
  keyframes?: Keyframe[];
}

export interface Keyframe {
  id: string;
  time: number; // time relative to clip start
  property: string; // e.g., 'opacity', 'x', 'y', 'scale'
  value: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'bezier';
  bezierPoints?: [number, number, number, number]; // for custom bezier curves
}

// ============================================================================
// TIMELINE & TRACKS
// ============================================================================

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  clips: Clip[];
  muted: boolean;
  locked: boolean;
  solo: boolean;
  height: number;
  expanded: boolean; // for waveform expansion
  order: number; // for layering
}

export interface TimelineState {
  tracks: Track[];
  playheadPosition: number; // in seconds
  pixelsPerSecond: number;
  duration: number;
  isPlaying: boolean;
  selectedClipIds: string[];
  editMode: EditMode;
  snapEnabled: boolean;
  snapThreshold: number;
  magneticTimeline: boolean;
  markers: Marker[];
  zoom: number;
}

export interface Marker {
  id: string;
  time: number;
  label: string;
  color: string;
  type: 'chapter' | 'note' | 'cut';
}

// ============================================================================
// EFFECTS & TRANSITIONS
// ============================================================================

export interface Effect {
  id: string;
  type: EffectType;
  enabled: boolean;
  parameters: Record<string, number | string>;
  keyframes?: Keyframe[];
}

export interface Transition {
  id: string;
  type: TransitionType;
  duration: number; // in milliseconds
  parameters?: Record<string, any>;
}

export interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  backgroundColor?: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  fadeIn?: number; // duration in ms
  fadeOut?: number; // duration in ms
  alignment: 'left' | 'center' | 'right';
  effects?: string[]; // SVG effect IDs
  keyframes?: Keyframe[];
}

// ============================================================================
// PROJECT
// ============================================================================

export interface Project {
  id: string;
  name: string;
  version: number;
  createdAt: number;
  updatedAt: number;
  timeline: TimelineState;
  mediaLibrary: MediaFile[];
  exportSettings: ExportSettings;
  metadata: ProjectMetadata;
  hasUnsavedChanges?: boolean;
}

export interface ProjectMetadata {
  description?: string;
  author?: string;
  tags?: string[];
  template?: string; // e.g., "Vlog intro", "Gaming montage"
  notes?: ProjectNote[];
}

export interface ProjectNote {
  id: string;
  text: string;
  timestamp: number;
  color: string;
  position?: { x: number; y: number }; // for sticky notes
}

// ============================================================================
// EXPORT
// ============================================================================

export interface ExportSettings {
  format: string;
  codec: string;
  width: number;
  height: number;
  fps: number;
  videoBitrate: string;
  audioBitrate: string;
  audioCodec: string;
  hardwareAccel: HardwareAccelType;
  twoPass: boolean;
  preset?: string;
}

export interface ExportPreset {
  id: string;
  name: string;
  settings: ExportSettings;
  isCustom: boolean;
}

export interface ExportJob {
  id: string;
  projectId: string;
  outputPath: string;
  settings: ExportSettings;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'pending' | 'exporting';
  progress: number; // 0-100
  currentPass?: number;
  totalPasses?: number;
  startTime?: number;
  endTime?: number;
  error?: string;
  chunks?: ExportChunk[];
  
  // Compatibility - these duplicate settings properties for easier access
  preset?: string;
  width?: number;
  height?: number;
  fps?: number;
  videoBitrate?: string | number;
  audioBitrate?: string | number;
  format?: string;
  codec?: string;
}

export interface ExportChunk {
  id: string;
  startTime: number;
  endTime: number;
  outputPath: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

// ============================================================================
// SMART TOOLS
// ============================================================================

export interface SmartCutRegion {
  id: string;
  startTime: number;
  endTime: number;
  reason: 'filler_word' | 'silence' | 'manual';
  confidence?: number; // 0-1
  word?: string; // the detected filler word
}

export interface JumpCutMark {
  id: string;
  time: number;
}

export interface AutoReframeSettings {
  targetAspectRatio: number; // e.g., 9/16 for vertical
  detectionMethod: 'crop' | 'scale' | 'pan';
  safeArea: number; // percentage
}

export interface AudioDuckingSettings {
  threshold: number; // dB
  reduction: number; // dB
  fadeTime: number; // ms
}

// ============================================================================
// CLIPBOARD
// ============================================================================

export interface ClipboardItem {
  id: string;
  clips: Clip[];
  timestamp: number;
  thumbnailPath?: string;
  duration: number;
}

// ============================================================================
// PREFERENCES & SETTINGS
// ============================================================================

export interface Preferences {
  theme: 'dark' | 'light';
  autoSave: boolean;
  autoSaveInterval: number;
  proxyEnabled: boolean;
  proxyQuality: 'low' | 'medium' | 'high';
  hardwareAccel: HardwareAccelType;
  maxMemoryGB: number;
  cacheLocation: string;
  defaultExportSettings: ExportSettings;
  keyboardShortcuts: Record<string, string>;
  timelineSettings: {
    showWaveforms: boolean;
    showThumbnails: boolean;
    snapEnabled: boolean;
    magneticTimeline: boolean;
  };
  accessibility: {
    highContrast: boolean;
    screenReaderEnabled: boolean;
  };
}

// ============================================================================
// IPC COMMUNICATION
// ============================================================================

export interface IPCMessage<T = any> {
  channel: string;
  data: T;
}

export interface FFmpegProgress {
  percent: number;
  currentTime: number;
  totalTime: number;
  fps?: number;
  speed?: string;
}

export interface FFmpegTask {
  id: string;
  type: 'proxy' | 'thumbnail' | 'waveform' | 'export' | 'smart_cut' | 'scene_detect';
  inputPath: string;
  outputPath: string;
  options: any;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  error?: string;
}

// ============================================================================
// RECOVERY & HISTORY
// ============================================================================

export interface RecoveryData {
  project: Project;
  timestamp: number;
  operations: Operation[];
}

export interface Operation {
  id: string;
  type: string;
  timestamp: number;
  data: any;
  canUndo: boolean;
  canRedo: boolean;
}

// ============================================================================
// HARDWARE & PERFORMANCE
// ============================================================================

export interface HardwareInfo {
  gpuAvailable: boolean;
  gpuName?: string;
  supportedAcceleration: HardwareAccelType[];
  recommendedAcceleration: HardwareAccelType;
  totalMemory: number;
  availableMemory: number;
}

export interface PerformanceMetrics {
  fps: number;
  renderTime: number;
  memoryUsage: number;
  ffmpegQueueLength: number;
  activeWorkers: number;
}