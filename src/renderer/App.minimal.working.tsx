import React, { useState, useEffect, useRef } from 'react';
import './styles/global.css';

// Add CSS animations
const styleElement = document.createElement('style');
styleElement.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  @keyframes slideInUp {
    from {
      transform: translateY(20px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;
if (!document.head.querySelector('style[data-animations]')) {
  styleElement.setAttribute('data-animations', 'true');
  document.head.appendChild(styleElement);
}

interface MediaFile {
  id: string;
  path: string;
  name: string;
  type: string;
  duration: number;
}

interface TimelineClip {
  id: string;
  mediaId: string;
  mediaPath: string;
  mediaName: string;
  startTime: number;
  duration: number;
  trackIndex: number;
  trimStart?: number;
  trimEnd?: number;
  volume?: number;
  speed?: number;
  effects?: string[];
  color?: string;
  locked?: boolean;
  muted?: boolean;
  opacity?: number;
  transition?: {
    type: 'fade' | 'dissolve' | 'slide' | 'wipe' | 'zoom';
    duration: number;
  };
  // Fade handles
  fadeIn?: number; // Duration in seconds
  fadeOut?: number; // Duration in seconds
  // Color grading
  brightness?: number; // -100 to 100
  contrast?: number; // -100 to 100
  saturation?: number; // -100 to 100
  temperature?: number; // -100 to 100 (cool to warm)
  // Filters
  filter?: 'none' | 'blur' | 'sharpen' | 'vintage' | 'sepia';
  filterIntensity?: number; // 0 to 100
  // Chroma key
  chromaKey?: {
    enabled: boolean;
    color: string; // hex color to remove
    threshold: number; // 0 to 100
    smoothing: number; // 0 to 100
  };
  thumbnailUrl?: string;
  waveformData?: number[];
  // Text clip properties
  isTextClip?: boolean;
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  textColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  textPositionX?: number;
  textPositionY?: number;
  textAnimation?: 'none' | 'fadeIn' | 'slideIn' | 'typewriter';
  textStrokeColor?: string;
  textStrokeWidth?: number;
  // Keyframe animation
  keyframes?: Keyframe[];
}

interface Keyframe {
  id: string;
  time: number; // time relative to clip start
  property: 'opacity' | 'x' | 'y' | 'scaleX' | 'scaleY' | 'rotation';
  value: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
}

interface HistoryState {
  clips: TimelineClip[];
  playhead: number;
}

interface Marker {
  id: string;
  time: number;
  label: string;
}

const App: React.FC = () => {
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [playheadPosition, setPlayheadPosition] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(50);
  const [draggedMedia, setDraggedMedia] = useState<MediaFile | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [isDraggingClip, setIsDraggingClip] = useState<string | null>(null);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragStartTime, setDragStartTime] = useState(0);
  const [resizingClip, setResizingClip] = useState<{id: string, side: 'left' | 'right'} | null>(null);
  const [snappingEnabled, setSnappingEnabled] = useState(true);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [copiedClips, setCopiedClips] = useState<TimelineClip[]>([]);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [debugClickTime, setDebugClickTime] = useState<number | null>(null);
  const [tracks, setTracks] = useState<Array<{index: number, label: string, type: 'video' | 'audio' | 'text' | 'effects', color: string, locked?: boolean, muted?: boolean}>>([
    { index: 0, label: 'Video 1', type: 'video', color: '#4A90E2' },
    { index: 1, label: 'Audio 1', type: 'audio', color: '#50C878' },
  ]);
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, clipId?: string} | null>(null);
  const [clipContextMenu, setClipContextMenu] = useState<{x: number, y: number, clipId: string} | null>(null);
  const [hoveredClip, setHoveredClip] = useState<string | null>(null);
  const [resizePreview, setResizePreview] = useState<{clipId: string, newDuration: number, side: 'left' | 'right'} | null>(null);
  const [magneticSnap, setMagneticSnap] = useState(true);
  const [snapThreshold, setSnapThreshold] = useState(0.1);
  const [snapLineX, setSnapLineX] = useState<number | null>(null); // Visual snap line position
  const [showTextModal, setShowTextModal] = useState(false);
  const [textModalData, setTextModalData] = useState({
    text: '',
    fontSize: 48,
    fontFamily: 'Arial',
    textColor: '#FFFFFF',
    textAlign: 'center' as 'left' | 'center' | 'right',
    duration: 5
  });
  const [editingVolumeClipId, setEditingVolumeClipId] = useState<string | null>(null);
  const [previewPlaybackSpeed, setPreviewPlaybackSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSafeMargins, setShowSafeMargins] = useState(false);
  const [draggingTextClipId, setDraggingTextClipId] = useState<string | null>(null);
  const [editingTextClipId, setEditingTextClipId] = useState<string | null>(null);
  const [editingTextContent, setEditingTextContent] = useState<{ clipId: string; text: string } | null>(null);
  const [chromaKeyPickerActive, setChromaKeyPickerActive] = useState<string | null>(null);
  
  // New advanced features state
  const [fadeDragging, setFadeDragging] = useState<{clipId: string, type: 'in' | 'out', startX: number, startValue: number} | null>(null);
  const [showColorGrading, setShowColorGrading] = useState(false);
  const [colorGradingClipId, setColorGradingClipId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterClipId, setFilterClipId] = useState<string | null>(null);
  const [showChromaKey, setShowChromaKey] = useState(false);
  const [chromaKeyClipId, setChromaKeyClipId] = useState<string | null>(null);
  const [showKeyframeEditor, setShowKeyframeEditor] = useState(false);
  const [keyframeClipId, setKeyframeClipId] = useState<string | null>(null);
  const [hoveredSubmenu, setHoveredSubmenu] = useState<string | null>(null);
  const [lassoStart, setLassoStart] = useState<{x: number, y: number} | null>(null);
  const [lassoRect, setLassoRect] = useState<{x: number, y: number, width: number, height: number} | null>(null);
  const [waveformCache, setWaveformCache] = useState<Map<string, number[]>>(new Map());
  const [thumbnailCache, setThumbnailCache] = useState<Map<string, string[]>>(new Map());
  const [showThumbnails, setShowThumbnails] = useState(true);
  const [showWaveforms, setShowWaveforms] = useState(true);
  const [useProxies, setUseProxies] = useState(false);
  const [proxyProgress, setProxyProgress] = useState<Map<string, number>>(new Map());
  const [availableLUTs, setAvailableLUTs] = useState<{name: string, path: string}[]>([
    { name: 'Cinematic Warm', path: 'presets/cinematic-warm.cube' },
    { name: 'Cinematic Cool', path: 'presets/cinematic-cool.cube' },
    { name: 'Vintage Film', path: 'presets/vintage-film.cube' },
    { name: 'High Contrast', path: 'presets/high-contrast.cube' },
    { name: 'Teal & Orange', path: 'presets/teal-orange.cube' },
  ]);
  const [showAudioMixer, setShowAudioMixer] = useState(false);
  const [audioTracks, setAudioTracks] = useState<{id: string, name: string, volume: number, pan: number, muted: boolean, solo: boolean}[]>([
    { id: 'master', name: 'Master', volume: 100, pan: 0, muted: false, solo: false },
    { id: 'track1', name: 'Track 1', volume: 80, pan: 0, muted: false, solo: false },
    { id: 'track2', name: 'Track 2', volume: 80, pan: 0, muted: false, solo: false },
  ]);
  
  // OffscreenCanvas and performance optimizations
  const timelineCanvasRef = useRef<HTMLCanvasElement>(null);
  const offscreenCanvasRef = useRef<OffscreenCanvas | null>(null);
  const [isDirtyTimeline, setIsDirtyTimeline] = useState(true);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const chromaCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const timelineRef = useRef<HTMLDivElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Calculate total timeline duration
  const totalDuration = Math.max(
    timelineClips.reduce((max, clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return clipEnd > max ? clipEnd : max;
    }, 0),
    10 // Minimum 10 seconds
  );

  // ✅ CRITICAL: Memoize current clip BEFORE any useEffects to maintain hooks order
  const currentClipId = React.useMemo(() => {
    const clip = timelineClips.find(c => 
      playheadPosition >= c.startTime && 
      playheadPosition < c.startTime + c.duration
    );
    return clip?.id;
  }, [timelineClips, playheadPosition]);

  const currentClipMemo = React.useMemo(() => {
    if (!currentClipId) return undefined;
    return timelineClips.find(c => c.id === currentClipId);
  }, [currentClipId, timelineClips]);

  const getCurrentClip = React.useCallback(() => {
    return currentClipMemo;
  }, [currentClipMemo]);

  // Extract primitives for useEffect dependencies
  const currentMediaPath = currentClipMemo?.mediaPath;
  const currentClipStartTime = currentClipMemo?.startTime;
  const currentClipDuration = currentClipMemo?.duration;
  const isTextClip = currentClipMemo?.isTextClip;
  const currentClipVolume = currentClipMemo?.volume;
  const currentClipMuted = currentClipMemo?.muted;
  
  // Menu event listeners (only set up once on mount)
  React.useEffect(() => {
    const handleMenuEvent = (event: string) => {
      console.log('Menu event:', event);
      
      switch(event) {
        case 'menu-new-project':
          setTimelineClips([]);
          setMediaFiles([]);
          setSelectedClipIds([]);
          setHistory([]);
          setHistoryIndex(-1);
          break;
        case 'menu-open-project':
          handleOpenProject();
          break;
        case 'menu-save-project':
          handleSaveProject();
          break;
        case 'menu-import-media':
          handleImportVideo();
          break;
        case 'menu-export':
          handleExport();
          break;
        case 'menu-play-pause':
          setIsPlaying(prev => !prev);
          break;
        case 'menu-split-clip':
          handleSplitClip();
          break;
        case 'menu-duplicate-clip':
          setTimelineClips(prev => {
            const selected = prev.find(c => c.id === selectedClipIds[0]);
            if (selected) {
              const newClip = { ...selected, id: `clip-${Date.now()}-dup`, startTime: selected.startTime + selected.duration };
              saveToHistory();
              return [...prev, newClip];
            }
            return prev;
          });
          break;
        case 'menu-delete':
          handleDeleteClip();
          break;
        case 'menu-zoom-in':
          setZoom(prev => Math.min(200, prev + 10));
          break;
        case 'menu-zoom-out':
          setZoom(prev => Math.max(10, prev - 10));
          break;
        case 'menu-toggle-snapping':
          setMagneticSnap(prev => !prev);
          break;
        case 'menu-jump-start':
          setPlayheadPosition(0);
          break;
        case 'menu-jump-end':
          setPlayheadPosition(prev => totalDuration);
          break;
      }
    };

    // Listen to menu events from main process (only once on mount)
    if (window.electronAPI && window.electronAPI.on) {
      const events = [
        'menu-new-project', 'menu-open-project', 'menu-save-project', 'menu-save-project-as',
        'menu-import-media', 'menu-export', 'menu-play-pause', 'menu-split-clip',
        'menu-duplicate-clip', 'menu-delete', 'menu-zoom-in', 'menu-zoom-out',
        'menu-toggle-snapping', 'menu-jump-start', 'menu-jump-end'
      ];
      
      events.forEach(event => {
        window.electronAPI.on(event, () => handleMenuEvent(event));
      });
    }
    
    // Listen for export progress events
    if (window.electronAPI && window.electronAPI.on) {
      window.electronAPI.on('export-progress', (data: any) => {
        console.log('📊 Export progress:', data.percent + '%');
        setExportProgress(Math.min(data.percent, 100));
      });
      
      window.electronAPI.on('export-complete', (data: any) => {
        console.log('✅ Export complete:', data.outputPath);
        setIsExporting(false);
        setExportProgress(0);
        alert(`✅ Export voltooid!\n\nJe video is opgeslagen in:\n${data.outputPath}\n\nOpen de 'exports' map om je video te bekijken.`);
      });
      
      window.electronAPI.on('export-error', (data: any) => {
        console.error('❌ Export error:', data.error);
        setIsExporting(false);
        setExportProgress(0);
        alert(`❌ Export mislukt:\n${data.error}`);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  // Auto-save recovery data every 60 seconds
  React.useEffect(() => {
    const autoSaveInterval = setInterval(async () => {
      try {
        const project = {
          id: `project-${Date.now()}`,
          name: 'Auto-saved Project',
          version: 1,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          mediaFiles,
          timeline: { clips: timelineClips, tracks: [] },
          settings: {},
        };
        await window.electronAPI.invoke('RECOVERY_DATA_SAVE', project);
        console.log('Auto-save completed');
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, 60000); // Every 60 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [mediaFiles, timelineClips]);
  
  // Load recovery data on mount
  React.useEffect(() => {
    const loadRecovery = async () => {
      try {
        const result = await window.electronAPI.invoke('RECOVERY_DATA_LOAD');
        if (result.success && result.data && result.data.project) {
          const shouldRecover = window.confirm('Found unsaved work. Do you want to recover it?');
          if (shouldRecover) {
            const project = result.data.project;
            setTimelineClips(project.timeline?.clips || []);
            setMediaFiles(project.mediaFiles || []);
            console.log('Recovery data loaded');
          }
        }
      } catch (error) {
        console.error('Failed to load recovery:', error);
      }
    };
    loadRecovery();
  }, []);

  // Import video
  const handleImportVideo = async () => {
    try {
      console.log('Importing video...');
      const result = await window.electronAPI.invoke('IMPORT_MEDIA_DIALOG');
      console.log('Import result:', result);
      
      if (result.success && result.data && result.data.length > 0) {
        // Create temporary video elements to get real duration
        const filesWithDuration = await Promise.all(
          result.data.map(async (file: any) => {
            try {
              // Create a video element to get actual duration
              const video = document.createElement('video');
              video.preload = 'metadata';
              
              const durationPromise = new Promise<number>((resolve) => {
                video.onloadedmetadata = () => {
                  resolve(video.duration);
                  video.remove();
                };
                video.onerror = () => {
                  console.warn('Failed to load video metadata for:', file.path);
                  resolve(file.duration || 30); // Fallback
                  video.remove();
                };
              });
              
              video.src = file.path;
              const actualDuration = await durationPromise;
              
              console.log('Video duration detected:', file.name, actualDuration);
              
              return {
                id: `media-${Date.now()}-${Math.random()}`,
                path: file.path,
                name: file.name,
                type: file.type,
                duration: actualDuration,
                width: file.width,
                height: file.height,
              };
            } catch (error) {
              console.error('Error getting duration for:', file.path, error);
              return {
                id: `media-${Date.now()}-${Math.random()}`,
                path: file.path,
                name: file.name,
                type: file.type,
                duration: file.duration || 30,
              };
            }
          })
        );
        
        setMediaFiles(prev => [...prev, ...filesWithDuration]);
        console.log('Added files:', filesWithDuration);
        
        // Auto-generate proxies for 4K videos
        filesWithDuration.forEach(async file => {
          if (file.type === 'video' && file.path && (file.width >= 3840 || file.height >= 2160)) {
            console.log('🎬 Detected 4K video, auto-generating proxy:', file.name);
            try {
              // Normaliseer file:// URL naar filesystem path
              let fsPath = file.path;
              if (fsPath.startsWith('file:///')) {
                fsPath = decodeURI(fsPath.replace('file:///', ''));
              } else if (fsPath.startsWith('file://')) {
                fsPath = decodeURI(fsPath.replace('file://', ''));
              }
              
              setProxyProgress(prev => new Map(prev).set(file.id, 0));
              await window.electronAPI.invoke('GENERATE_PROXY', {
                inputPath: fsPath,
                outputPath: fsPath.replace(/\.[^.]+$/, '_proxy.mp4'),
              });
              setProxyProgress(prev => new Map(prev).set(file.id, 100));
              console.log('✅ Proxy generated for:', file.name);
            } catch (error) {
              console.error('❌ Failed to generate proxy:', error);
              setProxyProgress(prev => {
                const newMap = new Map(prev);
                newMap.delete(file.id);
                return newMap;
              });
            }
          }
          
          // Generate thumbnails - with strict validation
          if (file.type === 'video' && file.path && typeof file.path === 'string') {
            try {
              // Normaliseer file:// URL naar filesystem path
              let fsPath = file.path;
              if (fsPath.startsWith('file:///')) {
                fsPath = decodeURI(fsPath.replace('file:///', ''));
              } else if (fsPath.startsWith('file://')) {
                fsPath = decodeURI(fsPath.replace('file://', ''));
              }
              
              // Extra validatie: check of path niet leeg of undefined is
              if (!fsPath || fsPath.length === 0) {
                console.warn('⚠️ Skipping thumbnail, invalid path:', file.name);
                return; // Skip this file
              }
              
              console.log('🖼️ Generating thumbnails for:', fsPath);
              
              const thumbnails = await window.electronAPI.invoke('GENERATE_THUMBNAIL', {
                inputPath: fsPath,
                outputDir: fsPath.replace(/\.[^.]+$/, '_thumbs'),
                count: 8,
              });
              
              if (thumbnails?.success && thumbnails?.data) {
                setThumbnailCache(prev => new Map(prev).set(file.id, thumbnails.data));
                console.log('✅ Thumbnails generated:', thumbnails.data.length);
              }
            } catch (error) {
              console.error('❌ Failed to generate thumbnails for', file.name, ':', error);
            }
          }
          
          // Generate waveforms for audio/video files
          if ((file.type === 'audio' || file.type === 'video') && file.path) {
            try {
              await generateWaveform(file.path, file.id);
            } catch (error) {
              console.error('❌ Failed to generate waveform:', error);
            }
          }
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      alert('Import failed: ' + error);
    }
  };

  // Generate waveform data for audio/video clips
  const generateWaveform = async (filePath: string, fileId: string): Promise<number[]> => {
    // Check cache first
    if (waveformCache.has(fileId)) {
      return waveformCache.get(fileId)!;
    }

    // Generate 100 sample points for waveform
    const sampleCount = 100;
    const waveform: number[] = [];
    
    // Simulate waveform generation (in real app, would use Web Audio API)
    for (let i = 0; i < sampleCount; i++) {
      const value = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
      waveform.push(value);
    }
    
    // Cache it
    setWaveformCache(prev => new Map(prev).set(fileId, waveform));
    return waveform;
  };

  // OffscreenCanvas for timeline rendering optimization
  useEffect(() => {
    if (!timelineCanvasRef.current) return;
    
    const canvas = timelineCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size to match container
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      setIsDirtyTimeline(true);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Create OffscreenCanvas for better performance
    if (!offscreenCanvasRef.current && 'OffscreenCanvas' in window) {
      offscreenCanvasRef.current = new OffscreenCanvas(canvas.width, canvas.height);
    }

    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Sync video SOURCE - only when mediaPath actually changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    // Clear video if no clip or text clip
    if (!currentMediaPath || isTextClip) {
      if (video.src) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      return;
    }
    
    // Normalize URLs for comparison
    const normalizeUrl = (url: string) => {
      if (!url) return '';
      return decodeURI(url).toLowerCase().replace(/\\/g, '/');
    };
    
    const currentSrc = normalizeUrl(video.src);
    const targetSrc = normalizeUrl(currentMediaPath);
    
    // Only reload if source is ACTUALLY different
    if (currentSrc !== targetSrc) {
      console.log('🔄 Video source changed:', targetSrc);
      video.src = currentMediaPath;
      video.load();
    }
  }, [currentMediaPath, isTextClip]); // ✅ Only primitive dependencies

  // Sync video TIME - separate from source changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentClipMemo || isPlaying || isTextClip) return;
    
    const timeInClip = playheadPosition - (currentClipStartTime || 0);
    
    // Only update if difference is significant (> 0.1s)
    if (Math.abs(video.currentTime - timeInClip) > 0.1) {
      video.currentTime = Math.max(0, Math.min(timeInClip, currentClipDuration || 0));
    }
  }, [playheadPosition, currentClipStartTime, currentClipDuration, isPlaying, isTextClip, currentClipMemo]);

  // Render timeline to OffscreenCanvas when dirty
  useEffect(() => {
    if (!isDirtyTimeline || !offscreenCanvasRef.current) return;

    const offscreen = offscreenCanvasRef.current;
    const ctx = offscreen.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, offscreen.width, offscreen.height);

    // Draw timeline grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i < totalDuration; i++) {
      const x = i * zoom;
      if (i % 5 === 0) {
        ctx.strokeStyle = '#555';
      } else {
        ctx.strokeStyle = '#333';
      }
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, offscreen.height);
      ctx.stroke();
    }

    setIsDirtyTimeline(false);
    
    // Copy to main canvas
    if (timelineCanvasRef.current) {
      const mainCtx = timelineCanvasRef.current.getContext('2d');
      if (mainCtx) {
        mainCtx.drawImage(offscreen, 0, 0);
      }
    }
  }, [isDirtyTimeline, zoom, totalDuration]);

  // Apply keyframe interpolation
  const interpolateKeyframe = (keyframes: Keyframe[], time: number, property: Keyframe['property']): number | null => {
    const relevantKeyframes = keyframes.filter(k => k.property === property).sort((a, b) => a.time - b.time);
    if (relevantKeyframes.length === 0) return null;
    if (relevantKeyframes.length === 1) return relevantKeyframes[0].value;
    
    // Find surrounding keyframes
    let before = relevantKeyframes[0];
    let after = relevantKeyframes[relevantKeyframes.length - 1];
    
    for (let i = 0; i < relevantKeyframes.length - 1; i++) {
      if (relevantKeyframes[i].time <= time && relevantKeyframes[i + 1].time >= time) {
        before = relevantKeyframes[i];
        after = relevantKeyframes[i + 1];
        break;
      }
    }
    
    if (before === after) return before.value;
    
    // Calculate interpolation
    const progress = (time - before.time) / (after.time - before.time);
    const easing = after.easing || 'linear';
    
    let easedProgress = progress;
    if (easing === 'ease-in') easedProgress = progress * progress;
    else if (easing === 'ease-out') easedProgress = 1 - (1 - progress) * (1 - progress);
    else if (easing === 'ease-in-out') easedProgress = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
    
    return before.value + (after.value - before.value) * easedProgress;
  };

  // Apply color grading to video element
  const applyColorGrading = (clip: TimelineClip): string => {
    if (!clip.brightness && !clip.contrast && !clip.saturation && !clip.temperature) return '';
    
    const filters: string[] = [];
    if (clip.brightness) filters.push(`brightness(${100 + clip.brightness}%)`);
    if (clip.contrast) filters.push(`contrast(${100 + clip.contrast}%)`);
    if (clip.saturation) filters.push(`saturate(${100 + clip.saturation}%)`);
    if (clip.temperature) {
      const hue = clip.temperature * 0.5; // -50 to 50 degrees
      filters.push(`hue-rotate(${hue}deg)`);
    }
    
    return filters.join(' ');
  };

  // Apply video filters
  const applyFilter = (clip: TimelineClip): string => {
    if (!clip.filter || clip.filter === 'none') return '';
    
    const intensity = (clip.filterIntensity || 100) / 100;
    
    switch (clip.filter) {
      case 'blur':
        return `blur(${5 * intensity}px)`;
      case 'sharpen':
        return `contrast(${100 + 20 * intensity}%) brightness(${100 + 5 * intensity}%)`;
      case 'vintage':
        return `sepia(${30 * intensity}%) contrast(${100 - 10 * intensity}%) brightness(${100 + 10 * intensity}%)`;
      case 'sepia':
        return `sepia(${100 * intensity}%)`;
      default:
        return '';
    }
  };

  // Save to history
  const saveToHistory = () => {
    const newState: HistoryState = {
      clips: JSON.parse(JSON.stringify(timelineClips)),
      playhead: playheadPosition,
    };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 50) newHistory.shift(); // Keep last 50
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Undo/Redo
  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      setTimelineClips(JSON.parse(JSON.stringify(prevState.clips)));
      setPlayheadPosition(prevState.playhead);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      setTimelineClips(JSON.parse(JSON.stringify(nextState.clips)));
      setPlayheadPosition(nextState.playhead);
      setHistoryIndex(historyIndex + 1);
    }
  };

  // Snapping calculation - improved to snap across all tracks
  const snapToNearby = (time: number, threshold = 0.1): number => {
    if (!magneticSnap) return time;
    
    // Get all snap points from all tracks, not just same track
    const snapPoints = [
      0,
      ...timelineClips.flatMap(c => {
        if (!c.isTextClip) {
          return [c.startTime, c.startTime + c.duration];
        }
        return [];
      }),
      ...markers.map(m => m.time),
      playheadPosition, // Add playhead as snap point
    ];
    
    // Remove duplicates
    const uniqueSnapPoints = [...new Set(snapPoints)].sort((a, b) => a - b);
    
    // Find nearest snap point
    let nearestPoint = time;
    let minDistance = threshold;
    
    for (const point of uniqueSnapPoints) {
      const distance = Math.abs(time - point);
      if (distance < minDistance) {
        minDistance = distance;
        nearestPoint = point;
      }
    }
    
    if (nearestPoint !== time) {
      console.log('🧲 Snapped:', time, '→', nearestPoint);
    }
    
    return nearestPoint;
  };

  // Handle playhead dragging
  useEffect(() => {
    if (!isDraggingPlayhead) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / zoom;
      const exactTime = dragStartTime + deltaTime;
      const clampedTime = Math.max(0, Math.min(totalDuration, exactTime));
      
      // Apply snapping only if not holding Shift and snapping is enabled
      const finalTime = (e.shiftKey || !snappingEnabled) ? clampedTime : snapToNearby(clampedTime, 0.3);
      
      setPlayheadPosition(finalTime);
    };

    const handleMouseUp = (e: MouseEvent) => {
      console.log('[PLAYHEAD DRAG END]', {
        final: playheadPosition.toFixed(6),
        shift: e.shiftKey
      });
      setIsDraggingPlayhead(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDraggingPlayhead, dragStartX, dragStartTime, zoom, totalDuration]);

  // Playback animation with speed support
  useEffect(() => {
    if (isPlaying && videoRef.current) {
      const clip = currentClipMemo; // Use stable reference
      if (clip) {
        const speed = clip.speed || 1;
        videoRef.current.playbackRate = speed;
        videoRef.current.play().catch(() => {});
      }
      
      const startTime = Date.now();
      const startPosition = playheadPosition;
      
      const animate = () => {
        const clip = currentClipMemo; // Use stable reference
        const speed = clip?.speed || 1;
        const elapsed = ((Date.now() - startTime) / 1000) * speed;
        const newPosition = startPosition + elapsed;
        
        if (newPosition >= totalDuration) {
          setIsPlaying(false);
          setPlayheadPosition(totalDuration);
          if (videoRef.current) videoRef.current.pause();
        } else {
          setPlayheadPosition(newPosition);
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };
      
      animationFrameRef.current = requestAnimationFrame(animate);
      
      return () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        if (videoRef.current) videoRef.current.pause();
      };
    }
  }, [isPlaying, playheadPosition, currentClipMemo, totalDuration]); // ✅ Added currentClipMemo

  // Debounced window resize handler (200ms debounce)
  useEffect(() => {
    const handleResize = () => {
      setIsDirtyTimeline(true);
    };

    const debouncedResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(handleResize, 200);
    };

    window.addEventListener('resize', debouncedResize);
    return () => {
      window.removeEventListener('resize', debouncedResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      
      if (e.code === 'Space') {
        e.preventDefault();
        setIsPlaying(prev => !prev);
      } else if (e.code === 'Delete' && selectedClipIds.length > 0) {
        handleDeleteClip();
      } else if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSplitClip();
      } else if (e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.code === 'KeyZ' && (e.ctrlKey || e.metaKey) && e.shiftKey) || 
                 (e.code === 'KeyY' && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.code === 'KeyC' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleCopy();
      } else if (e.code === 'KeyV' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handlePaste();
      } else if (e.code === 'KeyD' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDuplicate();
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleAddMarker();
      } else if (e.code === 'KeyG') {
        e.preventDefault();
        setMagneticSnap(prev => !prev);
        console.log('🧲 Magnetic snap:', !magneticSnap ? 'ON' : 'OFF');
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        setPlayheadPosition(Math.max(0, playheadPosition - (e.shiftKey ? 1 : 0.033)));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        setPlayheadPosition(Math.min(totalDuration, playheadPosition + (e.shiftKey ? 1 : 0.033)));
      } else if (e.code === 'Home') {
        e.preventDefault();
        setPlayheadPosition(0);
      } else if (e.code === 'End') {
        e.preventDefault();
        setPlayheadPosition(totalDuration);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedClipIds, isPlaying, playheadPosition, copiedClips, historyIndex]);

  // Handle external file drop from file explorer
  const handleExternalFileDrop = async (files: FileList) => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm', '.m4v'];
    const validFiles: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
      if (videoExtensions.includes(ext)) {
        validFiles.push(file);
      }
    }
    
    if (validFiles.length === 0) {
      alert('Please drop video files (.mp4, .mov, .avi, etc.)');
      return;
    }
    
    // Process each file
    for (const file of validFiles) {
      try {
        const filePath = (file as any).path;
        
        if (filePath) {
          // Use HTML5 video element to get actual duration
          const video = document.createElement('video');
          video.preload = 'metadata';
          
          const actualDuration = await new Promise<number>((resolve) => {
            video.onloadedmetadata = () => {
              console.log('Video duration from dropped file:', file.name, video.duration);
              resolve(video.duration);
              video.remove();
            };
            video.onerror = () => {
              console.warn('Failed to load video metadata for dropped file:', file.name);
              resolve(30); // Fallback
              video.remove();
            };
            video.src = filePath;
          });
          
          const newFile: MediaFile = {
            id: `media-${Date.now()}-${Math.random()}`,
            path: filePath,
            name: file.name,
            type: 'video',
            duration: actualDuration,
          };
          
          setMediaFiles(prev => [...prev, newFile]);
          console.log('Added dropped file:', newFile);
        } else {
          // Fallback: add with mock data
          const newFile: MediaFile = {
            id: `media-${Date.now()}-${Math.random()}`,
            path: file.name,
            name: file.name,
            type: 'video',
            duration: 30,
          };
          setMediaFiles(prev => [...prev, newFile]);
        }
      } catch (error) {
        console.error('Error processing dropped file:', error);
      }
    }
  };

  // Snapping helpers
  const snapThresholdSeconds = 0.1; // Snap within 0.1 seconds
  
  const getSnapPoints = (): number[] => {
    const snapPoints: number[] = [];
    
    // Add clip starts and ends
    timelineClips.forEach(clip => {
      if (!clip.isTextClip) {
        snapPoints.push(clip.startTime); // Clip start
        snapPoints.push(clip.startTime + clip.duration); // Clip end
      }
    });
    
    // Add marker times
    markers.forEach(marker => {
      snapPoints.push(marker.time);
    });
    
    // Add playhead position
    snapPoints.push(playheadPosition);
    
    // Remove duplicates and sort
    return [...new Set(snapPoints)].sort((a, b) => a - b);
  };
  
  const findNearestSnapPoint = (desiredTime: number): number | null => {
    const snapPoints = getSnapPoints();
    let nearest: number | null = null;
    let minDistance = snapThresholdSeconds;
    
    snapPoints.forEach(point => {
      const distance = Math.abs(point - desiredTime);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = point;
      }
    });
    
    return nearest;
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, file: MediaFile) => {
    console.log('Drag started:', file);
    setDraggedMedia(file);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('Drop event, draggedMedia:', draggedMedia);
    
    // Check if dropping external files
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      console.log('Dropping external files:', e.dataTransfer.files);
      handleExternalFileDrop(e.dataTransfer.files);
      return;
    }
    
    if (!draggedMedia) {
      console.log('No dragged media');
      return;
    }

    // Calculate drop position from mouse X and Y coordinates
    const timelineContainer = e.currentTarget as HTMLElement;
    const rect = timelineContainer.getBoundingClientRect();
    const x = e.clientX - rect.left - 60; // Subtract track label width
    const y = e.clientY - rect.top - 30; // Subtract ruler (30px) - header is now separate
    
    const dropTime = Math.max(0, x / zoom); // Ensure time is never negative
    const trackIndex = Math.max(0, Math.floor(y / 70)); // 70px per track, ensure never negative
    const maxTrackIndex = tracks.length - 1;

    console.log('Dropping at time:', dropTime, 'track:', trackIndex, 'max:', maxTrackIndex, 'y:', y);

    // Apply magnetic snapping
    let finalDropTime = dropTime;
    const nearestSnap = findNearestSnapPoint(dropTime);
    if (nearestSnap !== null && magneticSnap) {
      finalDropTime = nearestSnap;
      console.log('🧲 Snapped to:', nearestSnap, '(was:', dropTime, ')');
    }

    // Convert Windows path to file:// URL for Electron
    const fileUrl = draggedMedia.path.startsWith('file://') 
      ? draggedMedia.path 
      : 'file:///' + draggedMedia.path.replace(/\\/g, '/');

    const newClip: TimelineClip = {
      id: `clip-${Date.now()}-${Math.random()}`,
      mediaId: draggedMedia.id,
      mediaPath: fileUrl,
      mediaName: draggedMedia.name,
      startTime: Math.max(0, finalDropTime), // Double check: never negative
      duration: draggedMedia.duration,
      trackIndex: Math.min(trackIndex, maxTrackIndex), // Clamp to available tracks
    };

    setTimelineClips(prev => [...prev, newClip].sort((a, b) => a.startTime - b.startTime));
    setDraggedMedia(null);
    console.log('Clip added:', newClip);
  };

  // Clipboard operations
  const handleCopy = () => {
    const selected = timelineClips.filter(c => selectedClipIds.includes(c.id));
    setCopiedClips(JSON.parse(JSON.stringify(selected)));
  };

  const handlePaste = () => {
    if (copiedClips.length === 0) return;
    const minStart = Math.min(...copiedClips.map(c => c.startTime));
    const offset = playheadPosition - minStart;
    const newClips = copiedClips.map(clip => ({
      ...clip,
      id: `clip-${Date.now()}-${Math.random()}`,
      startTime: Math.max(0, clip.startTime + offset), // Prevent negative
    }));
    setTimelineClips(prev => [...prev, ...newClips]);
    setSelectedClipIds(newClips.map(c => c.id));
    saveToHistory();
  };

  const handleDuplicate = () => {
    handleCopy();
    handlePaste();
  };

  // Marker operations
  const handleAddMarker = () => {
    const newMarker: Marker = {
      id: `marker-${Date.now()}`,
      time: playheadPosition,
      label: `Marker ${markers.length + 1}`,
    };
    setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
  };

  // Add to timeline (for click)
  const handleAddToTimeline = (file: MediaFile) => {
    const lastClipEnd = timelineClips.reduce((max, clip) => {
      const clipEnd = clip.startTime + clip.duration;
      return clipEnd > max ? clipEnd : max;
    }, 0);
    
    // Convert Windows path to file:// URL for Electron
    const fileUrl = file.path.startsWith('file://') 
      ? file.path 
      : 'file:///' + file.path.replace(/\\/g, '/');
    
    const newClip: TimelineClip = {
      id: `clip-${Date.now()}-${Math.random()}`,
      mediaId: file.id,
      mediaPath: fileUrl,
      mediaName: file.name,
      startTime: lastClipEnd,
      duration: file.duration,
      trackIndex: 0,
      volume: 1,
      speed: 1,
      effects: [],
    };
    
    setTimelineClips(prev => [...prev, newClip]);
    saveToHistory();
  };

  // Split clip at playhead
  const handleSplitClip = () => {
    if (selectedClipIds.length === 0) {
      // Silently ignore if no clip selected (user might be typing)
      return;
    }

    const clipId = selectedClipIds[0];
    const clip = timelineClips.find(c => c.id === clipId);
    if (!clip) return;

    // Use EXACT playhead position without any rounding
    const exactPlayhead = playheadPosition;
    const clipEnd = clip.startTime + clip.duration;
    const tolerance = 0.001; // 1ms tolerance

    console.log('═══════════════════════════════════════════════');
    console.log('[SPLIT] BEFORE SPLIT:');
    console.log('  Current playheadPosition state:', playheadPosition);
    console.log('  Exact playhead to use:', exactPlayhead.toFixed(6));
    console.log('  Clip start:', clip.startTime.toFixed(6));
    console.log('  Clip end:', clipEnd.toFixed(6));
    console.log('  Clip duration:', clip.duration.toFixed(6));
    console.log('  Split will occur at:', exactPlayhead.toFixed(6) + 's');
    console.log('═══════════════════════════════════════════════');

    // Check if playhead is inside the clip with precision
    if (exactPlayhead < clip.startTime - tolerance || exactPlayhead > clipEnd + tolerance) {
      alert(`Playhead must be inside the clip!\n\nClip: ${clip.startTime.toFixed(3)}s - ${clipEnd.toFixed(3)}s\nPlayhead: ${exactPlayhead.toFixed(3)}s`);
      return;
    }

    // Calculate exact durations with maximum precision
    const leftDuration = exactPlayhead - clip.startTime;
    const rightDuration = clip.duration - leftDuration;

    console.log('[SPLIT] Creating clips:', {
      leftDuration: leftDuration.toFixed(6),
      rightDuration: rightDuration.toFixed(6),
      total: clip.duration.toFixed(6),
      sum: (leftDuration + rightDuration).toFixed(6)
    });

    // Create left clip (original clip trimmed at playhead)
    const leftClip: TimelineClip = {
      ...clip,
      duration: leftDuration,
    };

    // Create right clip (new clip starting exactly at playhead)
    const rightClip: TimelineClip = {
      ...clip,
      id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      startTime: exactPlayhead,
      duration: rightDuration,
      trimStart: (clip.trimStart || 0) + leftDuration,
    };

    // Replace original clip with both new clips in order
    const newClips = timelineClips.map(c => 
      c.id === clipId ? leftClip : c
    );
    
    // Insert right clip right after left clip
    const insertIndex = newClips.findIndex(c => c.id === leftClip.id) + 1;
    newClips.splice(insertIndex, 0, rightClip);

    console.log('[SPLIT SUCCESS]', {
      leftClip: { start: leftClip.startTime.toFixed(6), duration: leftClip.duration.toFixed(6) },
      rightClip: { start: rightClip.startTime.toFixed(6), duration: rightClip.duration.toFixed(6) }
    });

    saveToHistory();
    setTimelineClips(newClips);
    setSelectedClipIds([rightClip.id]); // Select the right clip
  };

  // Delete selected clips (with ripple option)
  const handleDeleteClip = (ripple = false) => {
    if (selectedClipIds.length === 0) return;

    if (ripple) {
      // Ripple delete - close gaps
      const deletedClips = timelineClips.filter(c => selectedClipIds.includes(c.id));
      const minTime = Math.min(...deletedClips.map(c => c.startTime));
      const maxTime = Math.max(...deletedClips.map(c => c.startTime + c.duration));
      const gapSize = maxTime - minTime;
      
      setTimelineClips(prev => 
        prev.filter(c => !selectedClipIds.includes(c.id))
          .map(c => c.startTime > maxTime ? {...c, startTime: c.startTime - gapSize} : c)
      );
    } else {
      setTimelineClips(prev => prev.filter(c => !selectedClipIds.includes(c.id)));
    }
    
    setSelectedClipIds([]);
    saveToHistory();
  };

  // Open project
  const handleOpenProject = async () => {
    try {
      const result = await window.electronAPI.invoke('PROJECT_OPEN');
      if (result.success && result.data) {
        const project = result.data;
        setTimelineClips(project.timeline?.clips || []);
        setMediaFiles(project.mediaFiles || []);
        console.log('Project loaded:', project.name);
      }
    } catch (error) {
      console.error('Failed to open project:', error);
      alert('Failed to open project');
    }
  };

  // Save project
  const handleSaveProject = async () => {
    try {
      const project = {
        id: `project-${Date.now()}`,
        name: 'My Project',
        version: 1,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        mediaFiles,
        timeline: { clips: timelineClips, tracks: [] },
        settings: {},
      };
      const result = await window.electronAPI.invoke('PROJECT_SAVE', project);
      if (result.success) {
        console.log('Project saved:', result.data);
        alert('Project saved successfully!');
      }
    } catch (error) {
      console.error('Failed to save project:', error);
      alert('Failed to save project');
    }
  };

  // Export video - IMPROVED
  const handleExport = async () => {
    if (timelineClips.length === 0) {
      alert('Add clips to timeline first');
      return;
    }

    try {
      setIsExporting(true);
      setExportProgress(0);
      console.log('🎬 Starting export with clips:', timelineClips.length);
      console.log('📋 Timeline clips:', timelineClips.map(c => ({
        id: c.id,
        isTextClip: c.isTextClip,
        mediaPath: c.mediaPath,
        duration: c.duration,
      })));

      // Prepare clean export data
      const exportData = {
        clips: timelineClips.map(clip => {
          console.log('🔍 Processing clip:', {
            id: clip.id,
            isTextClip: clip.isTextClip,
            mediaPath: clip.mediaPath,
          });

          // For text clips, ensure isTextClip is set
          if (clip.isTextClip) {
            return {
              isTextClip: true,
              text: clip.text || '',
              fontSize: clip.fontSize || 32,
              fontFamily: clip.fontFamily || 'Arial',
              textColor: clip.textColor || '#FFFFFF',
              textAlign: clip.textAlign || 'center',
              textPositionX: clip.textPositionX || 0.5,
              textPositionY: clip.textPositionY || 0.5,
              duration: clip.duration || 5,
              startTime: clip.startTime || 0,
            };
          }

          // For video clips - normalize path
          let mediaPath = clip.mediaPath || '';
          if (mediaPath.startsWith('file:///')) {
            mediaPath = decodeURI(mediaPath.replace('file:///', ''));
          } else if (mediaPath.startsWith('file://')) {
            mediaPath = decodeURI(mediaPath.replace('file://', ''));
          }

          console.log('📹 Video clip after path normalization:', {
            id: clip.id,
            mediaPath: mediaPath,
            originalPath: clip.mediaPath,
          });

          // For video clips
          return {
            path: mediaPath,
            mediaPath: mediaPath,
            startTime: clip.startTime || 0,
            duration: clip.duration || 30,
            trimStart: clip.trimStart || 0,
            trimEnd: clip.trimEnd || (clip.duration || 30),
            volume: clip.volume || 100,
            muted: clip.muted || false,
            opacity: clip.opacity || 100,
            speed: clip.speed || 1,
            // Color grading
            brightness: clip.brightness || 0,
            contrast: clip.contrast || 0,
            saturation: clip.saturation || 0,
            temperature: clip.temperature || 0,
            // Filters
            filter: clip.filter || 'none',
            filterIntensity: clip.filterIntensity || 0,
            // Fade handles
            fadeIn: clip.fadeIn || 0,
            fadeOut: clip.fadeOut || 0,
            // Transition
            transition: clip.transition,
            // Effects
            effects: clip.effects || [],
            // Keyframes
            keyframes: clip.keyframes || [],
            // Chroma key
            chromaKey: clip.chromaKey,
            isTextClip: false,
          };
        }).filter((c, index) => {
          // Filter out clips without paths (invalid video clips only)
          if (!c.isTextClip && !c.mediaPath) {
            console.warn(`⚠️ Skipping video clip ${index} without mediaPath`);
            return false;
          }
          console.log(`✅ Keeping clip ${index}:`, { isTextClip: c.isTextClip, haPath: !!c.mediaPath });
          return true;
        }),
        settings: {
          codec: 'h264',
          resolution: '1920x1080',
          fps: 30,
          bitrate: '5000k',
        },
      };

      console.log('📤 Export data:', exportData);
      
      // Log summary
      const videoClipsCount = exportData.clips.filter((c: any) => !c.isTextClip).length;
      const textClipsCount = exportData.clips.filter((c: any) => c.isTextClip).length;
      console.log(`📊 Export summary: ${videoClipsCount} video clips, ${textClipsCount} text clips`);
      
      if (textClipsCount > 0) {
        console.log('📝 Text clips in export:', exportData.clips.filter((c: any) => c.isTextClip));
      }
      
      const result = await window.electronAPI.invoke('EXPORT_VIDEO', exportData);
      
      if (!result.success) {
        throw new Error(result.error || 'Export failed');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      setIsExporting(false);
      setExportProgress(0);
      alert(`❌ Export mislukt:\n${error}`);
    }
  };

  // Add track
  const handleAddTrack = (type: 'video' | 'audio' | 'text' | 'effects') => {
    const existingOfType = tracks.filter(t => t.type === type);
    const newIndex = tracks.length;
    
    const colorMap = {
      video: '#4A90E2',
      audio: '#50C878',
      text: '#FFB347',
      effects: '#9B59B6',
    };
    
    const newTrack = {
      index: newIndex,
      label: `${type.charAt(0).toUpperCase() + type.slice(1)} ${existingOfType.length + 1}`,
      type,
      color: colorMap[type] || '#4A90E2',
    };
    setTracks(prev => [...prev, newTrack]);
    setContextMenu(null);
    console.log('Added track:', newTrack);
  };

  // Handle trim/resize with mouse and touch
  useEffect(() => {
    if (!resizingClip) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - dragStartX;
      const deltaTime = deltaX / zoom;
      const MIN_DURATION = 1.0; // Increased to 1 second minimum to prevent disappearing clips

      setTimelineClips(prev => 
        prev.map(clip => {
          if (clip.id !== resizingClip.id) return clip;

          if (resizingClip.side === 'left') {
            // Dragging left edge - adjust start time and duration
            const newStartTime = Math.max(0, dragStartTime + deltaTime);
            const durationChange = dragStartTime - newStartTime;
            const potentialDuration = clip.duration + durationChange;
            
            // If new duration would be too small, clamp it and adjust start time
            if (potentialDuration < MIN_DURATION) {
              return { 
                ...clip, 
                duration: MIN_DURATION, 
                startTime: Math.max(0, clip.startTime + clip.duration - MIN_DURATION)
              };
            }
            
            return { ...clip, startTime: newStartTime, duration: potentialDuration };
          } else {
            // Dragging right edge - adjust duration only
            const potentialDuration = dragStartTime + deltaTime;
            
            // Ensure minimum duration
            if (potentialDuration < MIN_DURATION) {
              return { ...clip, duration: MIN_DURATION };
            }
            
            return { ...clip, duration: potentialDuration };
          }
        })
      );
    };

    const handleMouseUp = () => {
      setResizingClip(null);
      saveToHistory();
    };

    // Touch event handlers for mobile/tablet
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY } as MouseEvent);
      }
    };

    const handleTouchEnd = () => {
      setResizingClip(null);
      saveToHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false } as AddEventListenerOptions);
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [resizingClip, dragStartX, dragStartTime, zoom]);

  // Handle fade handles dragging
  useEffect(() => {
    if (!fadeDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - fadeDragging.startX;
      const deltaTime = Math.abs(deltaX / zoom);
      const newValue = Math.max(0, Math.min(5, fadeDragging.startValue + (deltaX > 0 ? deltaTime : -deltaTime)));

      setTimelineClips(prev =>
        prev.map(clip =>
          clip.id === fadeDragging.clipId
            ? { ...clip, [fadeDragging.type === 'in' ? 'fadeIn' : 'fadeOut']: newValue }
            : clip
        )
      );
    };

    const handleMouseUp = () => {
      setFadeDragging(null);
      saveToHistory();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [fadeDragging, zoom]);

  // Handle lasso selection
  useEffect(() => {
    if (!lassoStart) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!timelineRef.current) return;
      const rect = timelineRef.current.getBoundingClientRect();
      const x = Math.min(lassoStart.x, e.clientX - rect.left);
      const y = Math.min(lassoStart.y, e.clientY - rect.top);
      const width = Math.abs(e.clientX - rect.left - lassoStart.x);
      const height = Math.abs(e.clientY - rect.top - lassoStart.y);

      setLassoRect({ x, y, width, height });

      // Select clips within lasso
      const selectedIds: string[] = [];
      timelineClips.forEach(clip => {
        const clipX = 60 + clip.startTime * zoom;
        const clipWidth = clip.duration * zoom;
        const clipY = 30 + clip.trackIndex * 70;
        const clipHeight = 60;

        // Check intersection
        if (
          x < clipX + clipWidth &&
          x + width > clipX &&
          y < clipY + clipHeight &&
          y + height > clipY
        ) {
          selectedIds.push(clip.id);
        }
      });

      setSelectedClipIds(selectedIds);
    };

    const handleMouseUp = () => {
      setLassoStart(null);
      setLassoRect(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [lassoStart, timelineClips, zoom]);

  // Close context menus on outside click
  useEffect(() => {
    if (!contextMenu && !clipContextMenu) return;
    
    const handleClickOutside = () => {
      setContextMenu(null);
      setClipContextMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu, clipContextMenu]);

  // Update video volume and mute state when clip properties change
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !currentClipMemo || isTextClip) return;
    
    // Ensure volume is within valid range (0.0 - 1.0)
    const volumeLevel = Math.min(1.0, Math.max(0.0, (currentClipVolume || 100) / 100));
    
    // Only update if difference is significant
    if (Math.abs(video.volume - volumeLevel) > 0.01) {
      video.volume = volumeLevel;
    }
    
    const shouldMute = currentClipMuted || false;
    if (video.muted !== shouldMute) {
      video.muted = shouldMute;
    }
  }, [currentClipVolume, currentClipMuted, isTextClip, currentClipMemo]); // ✅ Only primitive dependencies

  // Close text editing panel when clicking outside or pressing ESC
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close if clicking inside the editing panel or on text
      const target = e.target as HTMLElement;
      if (editingTextClipId && !target.closest('[data-text-edit-panel]') && !target.closest('[data-text-overlay]')) {
        setEditingTextClipId(null);
        saveToHistory();
      }
    };

    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editingTextClipId) {
        setEditingTextClipId(null);
        saveToHistory();
      }
    };

    if (editingTextClipId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [editingTextClipId]);

  return (
    <div 
      style={{ 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: '#1e1e1e',
        color: '#fff',
        fontFamily: 'Arial, sans-serif',
        overflow: 'hidden',
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Top Bar */}
      <div style={{ 
        padding: '6px 10px', 
        background: 'linear-gradient(180deg, #2d2d2d 0%, #252525 100%)',
        borderBottom: '2px solid #1a1a1a',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        gap: '6px',
        alignItems: 'center',
      }}>
        {/* File Operations */}
        <button 
          onClick={async () => {
            try {
              const result = await window.electronAPI.invoke('PROJECT_NEW', 'Untitled Project');
              if (result.success) {
                setTimelineClips([]);
                setMediaFiles([]);
                setSelectedClipIds([]);
                setHistory([]);
                setHistoryIndex(-1);
                console.log('New project created');
              }
            } catch (error) {
              console.error('Failed to create project:', error);
            }
          }}
          style={{
            ...smallButtonStyle,
            background: '#50C878',
          }}
          title="New Project"
        >
          🆕
        </button>
        
        <button 
          onClick={async () => {
            try {
              const result = await window.electronAPI.invoke('PROJECT_OPEN');
              if (result.success && result.data) {
                const project = result.data;
                setTimelineClips(project.timeline?.clips || []);
                setMediaFiles(project.mediaFiles || []);
                console.log('Project loaded:', project.name);
              }
            } catch (error) {
              console.error('Failed to open project:', error);
            }
          }}
          style={{
            ...smallButtonStyle,
            background: '#4A90E2',
          }}
          title="Open Project"
        >
          📂
        </button>
        
        <button 
          onClick={async () => {
            try {
              const project = {
                id: `project-${Date.now()}`,
                name: 'My Project',
                version: 1,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                mediaFiles,
                timeline: { clips: timelineClips, tracks: [] },
                settings: {},
              };
              const result = await window.electronAPI.invoke('PROJECT_SAVE', project);
              if (result.success) {
                console.log('Project saved:', result.data);
              }
            } catch (error) {
              console.error('Failed to save project:', error);
            }
          }}
          style={{
            ...smallButtonStyle,
            background: '#FFB347',
          }}
          title="Save Project"
        >
          💾
        </button>
        
        <div style={{ width: '1px', height: '30px', background: 'linear-gradient(180deg, transparent, #555, transparent)' }} />
        
        <button 
          onClick={handleImportVideo} 
          style={{
            ...buttonStyle,
            background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
            boxShadow: '0 2px 6px rgba(74, 144, 226, 0.4)',
            fontWeight: '600',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          📁 Import Media
        </button>
        
        <div style={{ width: '1px', height: '30px', background: 'linear-gradient(180deg, transparent, #555, transparent)' }} />
        
        {/* Playback Controls */}
        <button 
          onClick={() => setIsPlaying(!isPlaying)} 
          style={{
            ...buttonStyle,
            background: isPlaying ? 'linear-gradient(135deg, #ff6b6b, #d63031)' : 'linear-gradient(135deg, #50C878, #2d8653)',
            boxShadow: isPlaying ? '0 2px 6px rgba(255, 107, 107, 0.4)' : '0 2px 6px rgba(80, 200, 120, 0.4)',
            minWidth: '70px',
            fontWeight: '600',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          {isPlaying ? '⏸️' : '▶️'}
        </button>
        
        {/* Editing Tools */}
        <button 
          onClick={handleSplitClip} 
          style={{
            ...buttonStyle,
            background: selectedClipIds.length === 0 ? '#3a3a3a' : 'linear-gradient(135deg, #FFB347, #E89C2C)',
            boxShadow: selectedClipIds.length > 0 ? '0 2px 6px rgba(255, 179, 71, 0.4)' : 'none',
            cursor: selectedClipIds.length === 0 ? 'not-allowed' : 'pointer',
            opacity: selectedClipIds.length === 0 ? 0.5 : 1,
          }} 
          disabled={selectedClipIds.length === 0}
          onMouseEnter={(e) => selectedClipIds.length > 0 && (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          ✂️ Split
        </button>
        
        <button 
          onClick={() => handleDeleteClip(false)} 
          style={{
            ...buttonStyle,
            background: selectedClipIds.length === 0 ? '#3a3a3a' : 'linear-gradient(135deg, #ff6b6b, #d63031)',
            boxShadow: selectedClipIds.length > 0 ? '0 2px 6px rgba(255, 107, 107, 0.4)' : 'none',
            cursor: selectedClipIds.length === 0 ? 'not-allowed' : 'pointer',
            opacity: selectedClipIds.length === 0 ? 0.5 : 1,
          }} 
          disabled={selectedClipIds.length === 0}
          onMouseEnter={(e) => selectedClipIds.length > 0 && (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🗑️ Delete
        </button>
        
        <div style={{ width: '1px', height: '30px', background: 'linear-gradient(180deg, transparent, #555, transparent)' }} />

        {/* Undo/Redo Buttons */}
        <button 
          onClick={handleUndo} 
          style={{
            ...smallButtonStyle,
            background: historyIndex <= 0 ? '#3a3a3a' : '#555',
            cursor: historyIndex <= 0 ? 'not-allowed' : 'pointer',
            opacity: historyIndex <= 0 ? 0.5 : 1,
          }} 
          disabled={historyIndex <= 0}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </button>
        
        <button 
          onClick={handleRedo} 
          style={{
            ...smallButtonStyle,
            background: historyIndex >= history.length - 1 ? '#3a3a3a' : '#555',
            cursor: historyIndex >= history.length - 1 ? 'not-allowed' : 'pointer',
            opacity: historyIndex >= history.length - 1 ? 0.5 : 1,
          }} 
          disabled={historyIndex >= history.length - 1}
          title="Redo (Ctrl+Y)"
        >
          ↷
        </button>
        
        <div style={{ width: '1px', height: '30px', background: 'linear-gradient(180deg, transparent, #555, transparent)' }} />
        
        {/* Text Tool */}
        <button 
          onClick={() => {
            setTextModalData({
              text: '',
              fontSize: 48,
              fontFamily: 'Arial',
              textColor: '#FFFFFF',
              textAlign: 'center',
              duration: 5
            });
            setShowTextModal(true);
          }} 
          style={{
            ...buttonStyle,
            background: 'linear-gradient(135deg, #FFB347, #E89C2C)',
            boxShadow: '0 2px 6px rgba(255, 179, 71, 0.4)',
            fontWeight: '600',
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          🅰️ Add Text
        </button>
        
        <div style={{ width: '1px', height: '30px', background: 'linear-gradient(180deg, transparent, #555, transparent)' }} />
        
        {/* View Options */}
        <button 
          onClick={() => setShowThumbnails(!showThumbnails)} 
          style={{
            ...smallButtonStyle,
            background: showThumbnails ? '#4A90E2' : '#3a3a3a',
            boxShadow: showThumbnails ? '0 2px 4px rgba(74, 144, 226, 0.4)' : 'none',
          }}
          title="Toggle thumbnails"
        >
          🖼️
        </button>
        
        <button 
          onClick={() => setShowWaveforms(!showWaveforms)} 
          style={{
            ...smallButtonStyle,
            background: showWaveforms ? '#50C878' : '#3a3a3a',
            boxShadow: showWaveforms ? '0 2px 4px rgba(80, 200, 120, 0.4)' : 'none',
          }}
          title="Toggle waveforms"
        >
          📊
        </button>
        
        <button 
          onClick={() => setMagneticSnap(!magneticSnap)} 
          style={{
            ...smallButtonStyle,
            background: magneticSnap ? '#9B59B6' : '#3a3a3a',
            boxShadow: magneticSnap ? '0 2px 4px rgba(155, 89, 182, 0.4)' : 'none',
          }}
          title="Toggle magnetic snapping"
        >
          🧲
        </button>
        
        <div style={{ width: '1px', height: '30px', background: 'linear-gradient(180deg, transparent, #555, transparent)' }} />
        
        {/* Effects Panel Toggle */}
        <button 
          onClick={() => setShowEffectsPanel(!showEffectsPanel)} 
          style={{
            ...buttonStyle,
            background: showEffectsPanel ? 'linear-gradient(135deg, #9B59B6, #7D3C98)' : '#3a3a3a',
            boxShadow: showEffectsPanel ? '0 2px 6px rgba(155, 89, 182, 0.4)' : 'none',
          }}
          title="Toggle Effects Panel"
        >
          ✨ Effects
        </button>
        
        <div style={{ width: '1px', height: '30px', background: 'linear-gradient(180deg, transparent, #555, transparent)' }} />
        
        {/* Export */}
        <button 
          onClick={handleExport} 
          style={{
            ...buttonStyle,
            background: isExporting || timelineClips.length === 0 
              ? '#3a3a3a' 
              : 'linear-gradient(135deg, #9B59B6, #7D3C98)',
            boxShadow: !isExporting && timelineClips.length > 0 ? '0 2px 6px rgba(155, 89, 182, 0.4)' : 'none',
            cursor: isExporting || timelineClips.length === 0 ? 'not-allowed' : 'pointer',
            opacity: isExporting || timelineClips.length === 0 ? 0.5 : 1,
            minWidth: '140px',
          }} 
          disabled={isExporting || timelineClips.length === 0}
          onMouseEnter={(e) => !isExporting && timelineClips.length > 0 && (e.currentTarget.style.transform = 'translateY(-1px)')}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {isExporting ? `⏳ ${exportProgress}% Exporteren...` : '📤 Export Video'}
        </button>
        
        <button 
          onClick={() => {
            setMagneticSnap(prev => !prev);
            console.log('🧲 Magnetic snap:', !magneticSnap ? 'ON' : 'OFF');
          }}
          style={{
            ...smallButtonStyle,
            background: magneticSnap ? '#50C878' : '#666',
            transition: 'all 0.2s ease',
          }}
          title={`Magnetic Snap (${magneticSnap ? 'ON' : 'OFF'}) - Press G`}
        >
          {magneticSnap ? '🧲 ON' : '🧲 OFF'}
        </button>
        
        {/* Right Side Controls */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Zoom Controls */}
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '8px',
            padding: '6px 12px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '6px',
            border: '1px solid #444',
          }}>
            <div style={{ fontSize: '11px', color: '#aaa', fontWeight: '600' }}>ZOOM</div>
            <button 
              onClick={() => setZoom(Math.max(20, zoom - 10))} 
              style={{
                ...smallButtonStyle,
                background: '#4A90E2',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              −
            </button>
            <div style={{ 
              fontSize: '12px', 
              minWidth: '70px', 
              textAlign: 'center',
              fontWeight: '600',
              fontFamily: 'monospace',
            }}>
              {zoom}px/s
            </div>
            <button 
              onClick={() => setZoom(Math.min(200, zoom + 10))} 
              style={{
                ...smallButtonStyle,
                background: '#4A90E2',
                fontWeight: 'bold',
                fontSize: '16px',
              }}
            >
              +
            </button>
          </div>
          
          {/* Timecode Display */}
          <div style={{ 
            padding: '8px 14px', 
            background: 'linear-gradient(135deg, #2a2a2a, #1f1f1f)',
            borderRadius: '6px',
            fontSize: '13px',
            fontFamily: 'monospace',
            fontWeight: '700',
            border: '1px solid #4A90E2',
            boxShadow: '0 0 10px rgba(74, 144, 226, 0.3)',
            minWidth: '140px',
            textAlign: 'center',
          }}>
            <span style={{ color: '#4A90E2' }}>{Math.floor(playheadPosition / 60).toString().padStart(2, '0')}:{Math.floor(playheadPosition % 60).toString().padStart(2, '0')}</span>
            <span style={{ color: '#666' }}> / </span>
            <span style={{ color: '#888' }}>{Math.floor(totalDuration / 60).toString().padStart(2, '0')}:{Math.floor(totalDuration % 60).toString().padStart(2, '0')}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Media Library */}
        <div style={{ 
          width: '250px', 
          backgroundColor: '#252525', 
          borderRight: '1px solid #444',
          display: 'flex',
          flexDirection: 'column',
        }}>
          <div style={{ padding: '10px', fontWeight: 'bold', borderBottom: '1px solid #444' }}>
            Media Library ({mediaFiles.length})
          </div>
          
          {/* Media Processing Buttons */}
          {mediaFiles.length > 0 && (
            <div style={{ padding: '8px', borderBottom: '1px solid #444', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              <button
                onClick={async () => {
                  for (const file of mediaFiles.filter(f => f.type === 'video')) {
                    try {
                      console.log('Generating proxy for:', file.name);
                      await window.electronAPI.invoke('GENERATE_PROXY', file);
                    } catch (error) {
                      console.error('Proxy generation failed:', error);
                    }
                  }
                }}
                style={{
                  ...smallButtonStyle,
                  background: '#9B59B6',
                  fontSize: '10px',
                  padding: '4px 8px',
                }}
                title="Generate proxy files for smooth 4K editing"
              >
                🎬 Proxies
              </button>
              
              <button
                onClick={async () => {
                  for (const file of mediaFiles.filter(f => f.type === 'video')) {
                    try {
                      console.log('Generating thumbnails for:', file.name);
                      await window.electronAPI.invoke('GENERATE_THUMBNAIL', file);
                    } catch (error) {
                      console.error('Thumbnail generation failed:', error);
                    }
                  }
                }}
                style={{
                  ...smallButtonStyle,
                  background: '#4A90E2',
                  fontSize: '10px',
                  padding: '4px 8px',
                }}
                title="Generate thumbnails for timeline preview"
              >
                🖼️ Thumbs
              </button>
              
              <button
                onClick={async () => {
                  for (const file of mediaFiles.filter(f => f.type === 'video' || f.type === 'audio')) {
                    try {
                      console.log('Generating waveform for:', file.name);
                      await window.electronAPI.invoke('GENERATE_WAVEFORM', file);
                    } catch (error) {
                      console.error('Waveform generation failed:', error);
                    }
                  }
                }}
                style={{
                  ...smallButtonStyle,
                  background: '#50C878',
                  fontSize: '10px',
                  padding: '4px 8px',
                }}
                title="Generate audio waveforms"
              >
                📊 Waves
              </button>
            </div>
          )}
          
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
            {mediaFiles.length === 0 && (
              <div style={{ color: '#666', fontSize: '12px', padding: '20px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: '32px', marginBottom: '10px' }}>📁</div>
                No media files.<br/>
                Click <strong>"Import"</strong> to add files<br/>
                or <strong>drag & drop</strong> video files here
              </div>
            )}
            {mediaFiles.map(file => (
              <div 
                key={file.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, file)}
                onDragEnd={() => setDraggedMedia(null)}
                onClick={() => handleAddToTimeline(file)}
                style={{
                  padding: '10px',
                  marginBottom: '8px',
                  backgroundColor: '#2a3f5f',
                  borderRadius: '6px',
                  cursor: 'grab',
                  fontSize: '12px',
                  border: '1px solid #3d5a7f',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#3d5a7f';
                  e.currentTarget.style.transform = 'translateX(4px)';
                  e.currentTarget.style.borderColor = '#4da6ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#2a3f5f';
                  e.currentTarget.style.transform = 'translateX(0)';
                  e.currentTarget.style.borderColor = '#3d5a7f';
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '6px',
                }}>
                  <div style={{ fontSize: '20px' }}>
                    {file.type === 'video' ? '🎬' : file.type === 'audio' ? '🎵' : '🖼️'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontWeight: 'bold', 
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {file.name}
                    </div>
                    <div style={{ color: '#aaa', fontSize: '10px' }}>
                      {file.duration.toFixed(1)}s • {file.type}
                    </div>
                  </div>
                </div>
                <div style={{ 
                  fontSize: '10px', 
                  color: '#888',
                  borderTop: '1px solid #3d5a7f',
                  paddingTop: '6px',
                }}>
                  🖱️ Drag to timeline or click to add
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview & Timeline */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Preview Area */}
          <div style={{ 
            height: isFullscreen ? '100vh' : '420px', 
            backgroundColor: '#0a0a0a', 
            display: 'flex', 
            flexDirection: 'column',
            borderBottom: '1px solid #444',
            position: isFullscreen ? 'fixed' : 'relative',
            top: isFullscreen ? 0 : 'auto',
            left: isFullscreen ? 0 : 'auto',
            width: isFullscreen ? '100vw' : 'auto',
            zIndex: isFullscreen ? 10000 : 1,
          }}>
            {/* Preview Controls */}
            <div style={{
              padding: '4px 8px',
              background: 'linear-gradient(180deg, #1a1a1a, #0f0f0f)',
              borderBottom: '1px solid #333',
              display: 'flex',
              gap: '4px',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {/* Step Backward */}
                <button
                  onClick={() => {
                    const newPos = Math.max(0, playheadPosition - 0.1);
                    setPlayheadPosition(newPos);
                    if (videoRef.current && currentClipMemo) {
                      videoRef.current.currentTime = newPos - currentClipMemo.startTime;
                    }
                  }}
                  style={{
                    ...smallButtonStyle,
                    background: '#4A90E2',
                  }}
                  title="Step backward (0.1s)"
                >
                  ⏮️
                </button>

                {/* Play/Pause */}
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    ...buttonStyle,
                    background: isPlaying ? 'linear-gradient(135deg, #ff6b6b, #d63031)' : 'linear-gradient(135deg, #50C878, #2d8653)',
                    minWidth: '50px',
                  }}
                >
                  {isPlaying ? '⏸️' : '▶️'}
                </button>

                {/* Step Forward */}
                <button
                  onClick={() => {
                    const newPos = Math.min(totalDuration, playheadPosition + 0.1);
                    setPlayheadPosition(newPos);
                    if (videoRef.current && currentClipMemo) {
                      videoRef.current.currentTime = newPos - currentClipMemo.startTime;
                    }
                  }}
                  style={{
                    ...smallButtonStyle,
                    background: '#4A90E2',
                  }}
                  title="Step forward (0.1s)"
                >
                  ⏭️
                </button>

                <div style={{ width: '1px', height: '24px', background: '#333' }} />

                {/* Playback Speed */}
                <select
                  value={previewPlaybackSpeed}
                  onChange={(e) => {
                    const speed = parseFloat(e.target.value);
                    setPreviewPlaybackSpeed(speed);
                    if (videoRef.current) videoRef.current.playbackRate = speed;
                  }}
                  style={{
                    background: '#2a2a2a',
                    color: '#fff',
                    border: '1px solid #444',
                    borderRadius: '3px',
                    padding: '3px 6px',
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                  title="Playback speed"
                >
                  <option value="0.25">0.25x</option>
                  <option value="0.5">0.5x</option>
                  <option value="1">1x</option>
                  <option value="1.5">1.5x</option>
                  <option value="2">2x</option>
                </select>

                <div style={{ width: '1px', height: '20px', background: '#333' }} />

                {/* Add Marker */}
                <button
                  onClick={() => {
                    const newMarker: Marker = {
                      id: `marker-${Date.now()}`,
                      time: playheadPosition,
                      label: `Marker ${markers.length + 1}`,
                    };
                    setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
                  }}
                  style={{
                    ...smallButtonStyle,
                    background: '#9B59B6',
                  }}
                  title="Add marker at playhead (M)"
                >
                  🎯
                </button>

                {/* Safe Margins */}
                <button
                  onClick={() => setShowSafeMargins(!showSafeMargins)}
                  style={{
                    ...smallButtonStyle,
                    background: showSafeMargins ? '#FFB347' : '#3a3a3a',
                  }}
                  title="Toggle safe margins"
                >
                  📐
                </button>
              </div>

              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {/* Snapshot */}
                <button
                  onClick={() => {
                    if (videoRef.current) {
                      const canvas = document.createElement('canvas');
                      canvas.width = videoRef.current.videoWidth;
                      canvas.height = videoRef.current.videoHeight;
                      const ctx = canvas.getContext('2d');
                      if (ctx) {
                        ctx.drawImage(videoRef.current, 0, 0);
                        canvas.toBlob((blob) => {
                          if (blob) {
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `snapshot-${Date.now()}.png`;
                            a.click();
                          }
                        });
                      }
                    }
                  }}
                  style={{
                    ...smallButtonStyle,
                    background: '#4A90E2',
                  }}
                  title="Take snapshot"
                >
                  📸
                </button>

                {/* Fullscreen */}
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  style={{
                    ...smallButtonStyle,
                    background: isFullscreen ? '#FFB347' : '#3a3a3a',
                  }}
                  title="Toggle fullscreen"
                >
                  {isFullscreen ? '🗗' : '⛶'}
                </button>
              </div>
            </div>

            {/* Preview Canvas */}
            <div 
              ref={previewContainerRef}
              style={{ 
                flex: 1,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {currentClipMemo ? (
                <div style={{ 
                  position: 'relative', 
                  maxWidth: '100%', 
                  maxHeight: '100%',
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {/* Video */}
                  {!currentClipMemo.isTextClip && (() => {
                    const colorGrading = applyColorGrading(currentClipMemo);
                    const filter = applyFilter(currentClipMemo);
                    const combinedFilter = [colorGrading, filter].filter(f => f).join(' ');
                    
                    // Apply fade in/out opacity
                    const timeInClip = playheadPosition - currentClipMemo.startTime;
                      let fadeOpacity = 1;
                      if (currentClipMemo.fadeIn && timeInClip < currentClipMemo.fadeIn) {
                        fadeOpacity = timeInClip / currentClipMemo.fadeIn;
                      }
                      if (currentClipMemo.fadeOut && timeInClip > currentClipMemo.duration - currentClipMemo.fadeOut) {
                        fadeOpacity = (currentClipMemo.duration - timeInClip) / currentClipMemo.fadeOut;
                      }
                    
                    // Apply transition effects
                    let transitionOpacity = 1;
                    let transitionTransform = 'none';
                    let transitionFilter = '';
                    
                    if (currentClipMemo.transition) {
                      const transDuration = currentClipMemo.transition.duration || 0.5;
                      const transType = currentClipMemo.transition.type;
                        
                        // Apply transition at the start of clip
                        if (timeInClip < transDuration) {
                          const progress = timeInClip / transDuration;
                          
                          switch (transType) {
                            case 'fade':
                              transitionOpacity = progress;
                              break;
                            case 'dissolve':
                              transitionOpacity = progress;
                              transitionFilter = `blur(${(1 - progress) * 10}px)`;
                              break;
                            case 'wipe':
                              transitionTransform = `translateX(${(1 - progress) * -100}%)`;
                              break;
                            case 'slide':
                              transitionTransform = `translateX(${(1 - progress) * 100}%)`;
                              break;
                            case 'zoom':
                              transitionTransform = `scale(${0.5 + progress * 0.5})`;
                              transitionOpacity = progress;
                              break;
                          }
                        }
                    }
                    
                    const finalOpacity = fadeOpacity * transitionOpacity * ((currentClipMemo.opacity || 100) / 100);
                    const finalFilter = [combinedFilter, transitionFilter].filter(f => f).join(' ');
                    
                    // Chroma key effect
                    const hasChromaKey = currentClipMemo.chromaKey?.enabled;
                      
                    return (
                      <>
                        <video
                          ref={videoRef}
                          key={currentClipMemo.id}
                            style={{ 
                              maxWidth: '100%', 
                              maxHeight: '100%',
                              objectFit: 'contain',
                              filter: finalFilter,
                              opacity: hasChromaKey ? 0 : finalOpacity,
                              transform: transitionTransform,
                              display: hasChromaKey ? 'none' : 'block',
                            }}
                            preload="metadata"
                            playsInline
                            autoPlay={false}
                            controls={false}
                            disablePictureInPicture={true}
                            disableRemotePlayback={true}
                          onLoadStart={() => {
                            console.log('🎬 [VIDEO] Loading started:', {
                              clipId: currentClipMemo?.id,
                              mediaPath: currentClipMemo?.mediaPath,
                              videoSrc: videoRef.current?.src,
                              timestamp: new Date().toISOString(),
                            });
                          }}
                          onCanPlay={() => {
                            console.log('✅ [VIDEO] Can play:', currentClipMemo?.mediaPath);
                          }}
                          onLoadedMetadata={() => {
                            console.log('✅ [VIDEO] Metadata loaded:', {
                              clipId: currentClipMemo?.id,
                              duration: videoRef.current?.duration,
                              readyState: videoRef.current?.readyState,
                              networkState: videoRef.current?.networkState,
                            });
                            
                            if (videoRef.current && currentClipMemo) {
                              const timeInClip = playheadPosition - currentClipMemo.startTime;
                              videoRef.current.currentTime = timeInClip;
                              videoRef.current.playbackRate = previewPlaybackSpeed;
                              
                              // Apply volume settings once - clamp to 0.0-1.0 range
                              const volumeLevel = Math.min(1.0, Math.max(0.0, (currentClipMemo.volume || 100) / 100));
                              videoRef.current.volume = volumeLevel;
                              videoRef.current.muted = currentClipMemo.muted || false;
                          
                          // Optimize audio quality
                          try {
                            // @ts-ignore - mediaSession API
                            if ('mediaSession' in navigator) {
                              navigator.mediaSession.metadata = null;
                            }
                          } catch (e) {
                            // Ignore if not supported
                          }
                        }
                      }}
                      onCanPlayThrough={() => {
                        // Audio buffer is ready - no need to set volume again
                        // Volume is already set in onLoadedMetadata
                      }}
                      onError={(e) => {
                        console.error('❌ [VIDEO] ERROR:', {
                          clipId: currentClipMemo?.id,
                          mediaPath: currentClipMemo?.mediaPath,
                          videoSrc: videoRef.current?.src,
                          error: e.currentTarget.error,
                          code: e.currentTarget.error?.code,
                          message: e.currentTarget.error?.message,
                        });
                      }}
                      onEmptied={() => {
                        console.warn('⚠️ [VIDEO] EMPTIED event - video element cleared!');
                      }}
                      onStalled={() => {
                        console.warn('⚠️ [VIDEO] STALLED - network issues?');
                      }}
                      onTimeUpdate={() => {
                        if (isPlaying && videoRef.current && currentClipMemo) {
                          const clipEnd = currentClipMemo.startTime + currentClipMemo.duration;
                          if (playheadPosition >= clipEnd) {
                            videoRef.current.pause();
                          }
                        }
                      }}
                      onPlay={() => {
                            // Start chroma key processing when video plays
                            if (hasChromaKey && currentClipMemo.chromaKey && chromaCanvasRef.current && videoRef.current) {
                          const processChromaKey = () => {
                            if (!videoRef.current || !chromaCanvasRef.current || !hasChromaKey) return;
                            
                            const canvas = chromaCanvasRef.current;
                            const video = videoRef.current;
                            const ctx = canvas.getContext('2d', { willReadFrequently: true });
                            
                            if (!ctx || video.paused || video.ended) return;
                            
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            
                              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                              const data = imageData.data;
                              
                              // Parse target color
                              const targetColor = currentClipMemo.chromaKey!.color;
                              const r = parseInt(targetColor.slice(1, 3), 16);
                              const g = parseInt(targetColor.slice(3, 5), 16);
                              const b = parseInt(targetColor.slice(5, 7), 16);
                              
                              const threshold = (currentClipMemo.chromaKey!.threshold || 30) / 100 * 255;
                              const smoothing = (currentClipMemo.chromaKey!.smoothing || 10) / 100;
                            
                            for (let i = 0; i < data.length; i += 4) {
                              const distance = Math.sqrt(
                                Math.pow(data[i] - r, 2) +
                                Math.pow(data[i + 1] - g, 2) +
                                Math.pow(data[i + 2] - b, 2)
                              );
                              
                              if (distance < threshold) {
                                // Make pixel transparent
                                const alpha = smoothing > 0 ? Math.max(0, (distance - threshold * (1 - smoothing)) / (threshold * smoothing)) : 0;
                                data[i + 3] = Math.floor(alpha * 255);
                              }
                            }
                            
                            ctx.putImageData(imageData, 0, 0);
                            
                            if (isPlaying) {
                              requestAnimationFrame(processChromaKey);
                            }
                          };
                          
                          processChromaKey();
                        }
                      }}
                      />
                        
                        {/* Chroma key canvas overlay */}
                        {hasChromaKey && currentClipMemo.chromaKey && (
                          <canvas
                            ref={chromaCanvasRef}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              objectFit: 'contain',
                              filter: finalFilter,
                              opacity: finalOpacity,
                              transform: transitionTransform,
                              cursor: chromaKeyPickerActive === currentClipMemo.id ? 'crosshair' : 'default',
                            }}
                            onClick={(e) => {
                              if (chromaKeyPickerActive === currentClipMemo.id && videoRef.current && chromaCanvasRef.current) {
                              const canvas = chromaCanvasRef.current;
                              const rect = canvas.getBoundingClientRect();
                              const x = (e.clientX - rect.left) * (canvas.width / rect.width);
                              const y = (e.clientY - rect.top) * (canvas.height / rect.height);
                              
                              const ctx = canvas.getContext('2d');
                              if (ctx) {
                                const pixel = ctx.getImageData(x, y, 1, 1).data;
                                  const pickedColor = `#${pixel[0].toString(16).padStart(2, '0')}${pixel[1].toString(16).padStart(2, '0')}${pixel[2].toString(16).padStart(2, '0')}`;
                                  
                                  setTimelineClips(prev => prev.map(c =>
                                    c.id === currentClipMemo.id
                                      ? {
                                          ...c,
                                          chromaKey: {
                                            ...c.chromaKey!,
                                            color: pickedColor,
                                          },
                                        }
                                      : c
                                  ));
                                
                                  setChromaKeyPickerActive(null);
                                  saveToHistory();
                                }
                              }
                            }}
                          />
                        )}
                      </>
                    );
                  })()}

                  {/* Text Overlays - Render all visible text clips */}
                  {timelineClips
                    .filter(clip => 
                      clip.isTextClip && 
                      playheadPosition >= clip.startTime && 
                      playheadPosition < clip.startTime + clip.duration
                    )
                    .map(textClip => {
                      // Calculate animation progress
                      const timeInClip = playheadPosition - textClip.startTime;
                      const animationDuration = 1; // 1 second animation
                      const animProgress = Math.min(1, timeInClip / animationDuration);
                      
                      // Animation styles
                      let animationOpacity = 1;
                      let animationTransform = 'translate(-50%, -50%)';
                      if (textClip.textAnimation === 'fadeIn') {
                        animationOpacity = animProgress;
                      } else if (textClip.textAnimation === 'slideIn') {
                        animationTransform = `translate(-50%, calc(-50% + ${(1 - animProgress) * 50}px))`;
                        animationOpacity = animProgress;
                      }
                      
                      // Text stroke style
                      let strokeStyle = '0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5)';
                      if (textClip.textStrokeWidth && textClip.textStrokeWidth > 0) {
                        const strokeColor = textClip.textStrokeColor || '#000000';
                        strokeStyle = Array(textClip.textStrokeWidth)
                          .fill(0)
                          .map((_, i) => `${i}px ${i}px 0 ${strokeColor}, -${i}px -${i}px 0 ${strokeColor}, ${i}px -${i}px 0 ${strokeColor}, -${i}px ${i}px 0 ${strokeColor}`)
                          .join(', ') + ', ' + strokeStyle;
                      }

                      return (
                        <div
                          key={textClip.id}
                          data-text-overlay="true"
                          draggable={!editingTextClipId}
                          onDragStart={(e) => {
                            if (!editingTextClipId) {
                              setDraggingTextClipId(textClip.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }
                          }}
                          onDragEnd={() => setDraggingTextClipId(null)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Right-click on text:', textClip.id);
                            setEditingTextClipId(textClip.id);
                          }}
                          onDoubleClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Double-click on text:', textClip.id);
                            setEditingTextContent({ clipId: textClip.id, text: textClip.text || '' });
                          }}
                          style={{
                            position: 'absolute',
                            left: `${textClip.textPositionX || 50}%`,
                            top: `${textClip.textPositionY || 50}%`,
                            transform: animationTransform,
                            fontSize: `${textClip.fontSize || 48}px`,
                            fontFamily: textClip.fontFamily || 'Arial',
                            color: textClip.textColor || '#FFFFFF',
                            textAlign: textClip.textAlign || 'center',
                            textShadow: strokeStyle,
                            fontWeight: 'bold',
                            padding: '10px 20px',
                            cursor: editingTextClipId === textClip.id ? 'default' : 'move',
                            userSelect: 'none',
                            maxWidth: '90%',
                            wordWrap: 'break-word',
                            whiteSpace: 'pre-wrap',
                            border: editingTextClipId === textClip.id ? '2px solid #FFB347' : (draggingTextClipId === textClip.id ? '2px dashed #FFB347' : 'none'),
                            background: editingTextClipId === textClip.id ? 'rgba(255,179,71,0.15)' : (draggingTextClipId === textClip.id ? 'rgba(255,179,71,0.1)' : 'transparent'),
                            opacity: (textClip.opacity ? textClip.opacity / 100 : 1) * animationOpacity,
                            zIndex: 100,
                            pointerEvents: 'auto',
                          }}
                          onMouseDown={(e) => {
                            if (previewContainerRef.current && !editingTextContent && !editingTextClipId) {
                              e.preventDefault();
                              const rect = previewContainerRef.current.getBoundingClientRect();
                              const startX = e.clientX;
                              const startY = e.clientY;
                              const startPosX = textClip.textPositionX || 50;
                              const startPosY = textClip.textPositionY || 50;

                              const handleMouseMove = (moveE: MouseEvent) => {
                                const deltaX = moveE.clientX - startX;
                                const deltaY = moveE.clientY - startY;
                                const newX = startPosX + (deltaX / rect.width) * 100;
                                const newY = startPosY + (deltaY / rect.height) * 100;

                                setTimelineClips(prev => prev.map(c =>
                                  c.id === textClip.id
                                    ? { ...c, textPositionX: Math.max(0, Math.min(100, newX)), textPositionY: Math.max(0, Math.min(100, newY)) }
                                    : c
                                ));
                              };

                              const handleMouseUp = () => {
                                document.removeEventListener('mousemove', handleMouseMove);
                                document.removeEventListener('mouseup', handleMouseUp);
                                saveToHistory();
                              };

                              document.addEventListener('mousemove', handleMouseMove);
                              document.addEventListener('mouseup', handleMouseUp);
                            }
                          }}
                          onTouchStart={(e) => {
                            if (previewContainerRef.current && !editingTextContent && !editingTextClipId && e.touches.length > 0) {
                              e.preventDefault();
                              const rect = previewContainerRef.current.getBoundingClientRect();
                              const touch = e.touches[0];
                              const startX = touch.clientX;
                              const startY = touch.clientY;
                              const startPosX = textClip.textPositionX || 50;
                              const startPosY = textClip.textPositionY || 50;

                              const handleTouchMove = (moveE: TouchEvent) => {
                                if (moveE.touches.length > 0) {
                                  const moveTouch = moveE.touches[0];
                                  const deltaX = moveTouch.clientX - startX;
                                  const deltaY = moveTouch.clientY - startY;
                                  const newX = startPosX + (deltaX / rect.width) * 100;
                                  const newY = startPosY + (deltaY / rect.height) * 100;

                                  setTimelineClips(prev => prev.map(c =>
                                    c.id === textClip.id
                                      ? { ...c, textPositionX: Math.max(0, Math.min(100, newX)), textPositionY: Math.max(0, Math.min(100, newY)) }
                                      : c
                                  ));
                                }
                              };

                              const handleTouchEnd = () => {
                                document.removeEventListener('touchmove', handleTouchMove);
                                document.removeEventListener('touchend', handleTouchEnd);
                                saveToHistory();
                              };

                              document.addEventListener('touchmove', handleTouchMove, { passive: false } as AddEventListenerOptions);
                              document.addEventListener('touchend', handleTouchEnd);
                            }
                          }}
                        >
                          {textClip.textAnimation === 'typewriter' 
                            ? textClip.text?.substring(0, Math.floor((textClip.text?.length || 0) * animProgress)) 
                            : textClip.text}
                          
                          {/* Edit Buttons - Always Visible */}
                          <div 
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            style={{
                              position: 'absolute',
                              top: '-38px',
                              right: '-5px',
                              display: 'flex',
                              gap: '4px',
                              opacity: 1,
                              zIndex: 101,
                              pointerEvents: 'auto',
                            }}>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Edit button clicked for:', textClip.id);
                                setEditingTextClipId(textClip.id);
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#FFB347',
                                color: '#000',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              }}
                              title="Right-click to edit properties"
                            >
                              ⚙️ Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Text edit button clicked for:', textClip.id);
                                setEditingTextContent({ clipId: textClip.id, text: textClip.text || '' });
                              }}
                              style={{
                                padding: '4px 8px',
                                background: '#4A90E2',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                              }}
                              title="Double-click text to edit content"
                            >
                              ✏️ Text
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {/* Text Editing Panel */}
                  {editingTextClipId && (() => {
                    const editingClip = timelineClips.find(c => c.id === editingTextClipId);
                    console.log('Editing panel rendering for clip:', editingTextClipId, editingClip);
                    if (!editingClip) {
                      console.warn('Editing clip not found!');
                      return null;
                    }

                    const updateTextProperty = (property: string, value: any) => {
                      setTimelineClips(prev => prev.map(c =>
                        c.id === editingTextClipId
                          ? { ...c, [property]: value }
                          : c
                      ));
                    };

                    return (
                      <div 
                        data-text-edit-panel="true"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: 'rgba(20,20,20,0.98)',
                          border: '2px solid #FFB347',
                          borderRadius: '8px',
                          padding: '12px 16px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px',
                          minWidth: '320px',
                          maxWidth: '400px',
                          zIndex: 10000,
                          boxShadow: '0 8px 32px rgba(255,179,71,0.5), 0 0 0 1px rgba(255,179,71,0.3)',
                          pointerEvents: 'auto',
                        }}
                      >
                        {/* Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          marginBottom: '6px',
                        }}>
                          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#FFB347' }}>
                            📝 Edit Text
                          </span>
                          <button
                            onClick={() => {
                              setEditingTextClipId(null);
                              saveToHistory();
                            }}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#999',
                              cursor: 'pointer',
                              fontSize: '16px',
                              padding: '0',
                              lineHeight: '1',
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        {/* Font Size Slider */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '11px', color: '#ccc' }}>Font Size</label>
                            <span style={{ fontSize: '11px', color: '#FFB347', fontWeight: 'bold' }}>
                              {editingClip.fontSize || 48}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="12"
                            max="120"
                            value={editingClip.fontSize || 48}
                            onChange={(e) => updateTextProperty('fontSize', parseInt(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>

                        {/* Font Family Dropdown */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: '#ccc' }}>Font Family</label>
                          <select
                            value={editingClip.fontFamily || 'Arial'}
                            onChange={(e) => updateTextProperty('fontFamily', e.target.value)}
                            style={{
                              padding: '6px 8px',
                              background: '#333',
                              color: '#fff',
                              border: '1px solid #555',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="Arial">Arial</option>
                            <option value="Helvetica">Helvetica</option>
                            <option value="Times New Roman">Times New Roman</option>
                            <option value="Courier New">Courier New</option>
                            <option value="Georgia">Georgia</option>
                            <option value="Verdana">Verdana</option>
                            <option value="Impact">Impact</option>
                            <option value="Comic Sans MS">Comic Sans MS</option>
                            <option value="Trebuchet MS">Trebuchet MS</option>
                            <option value="Arial Black">Arial Black</option>
                          </select>
                        </div>

                        {/* Text Color Picker */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: '#ccc' }}>Text Color</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="color"
                              value={editingClip.textColor || '#FFFFFF'}
                              onChange={(e) => updateTextProperty('textColor', e.target.value)}
                              style={{
                                width: '50px',
                                height: '32px',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            />
                            <input
                              type="text"
                              value={editingClip.textColor || '#FFFFFF'}
                              onChange={(e) => updateTextProperty('textColor', e.target.value)}
                              style={{
                                flex: 1,
                                padding: '6px 8px',
                                background: '#333',
                                color: '#fff',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                fontSize: '12px',
                                fontFamily: 'monospace',
                              }}
                            />
                          </div>
                        </div>

                        {/* Text Alignment */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: '#ccc' }}>Text Align</label>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            {(['left', 'center', 'right'] as const).map(align => (
                              <button
                                key={align}
                                onClick={() => updateTextProperty('textAlign', align)}
                                style={{
                                  flex: 1,
                                  padding: '6px',
                                  background: (editingClip.textAlign || 'center') === align ? '#FFB347' : '#444',
                                  color: (editingClip.textAlign || 'center') === align ? '#000' : '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  fontSize: '12px',
                                  fontWeight: (editingClip.textAlign || 'center') === align ? 'bold' : 'normal',
                                }}
                              >
                                {align === 'left' ? '⬅️' : align === 'center' ? '↔️' : '➡️'} {align.charAt(0).toUpperCase() + align.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Opacity Slider */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <label style={{ fontSize: '11px', color: '#ccc' }}>Opacity</label>
                            <span style={{ fontSize: '11px', color: '#FFB347', fontWeight: 'bold' }}>
                              {editingClip.opacity || 100}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={editingClip.opacity || 100}
                            onChange={(e) => updateTextProperty('opacity', parseInt(e.target.value))}
                            style={{ width: '100%' }}
                          />
                        </div>

                        {/* Text Animation */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: '#ccc' }}>Animation</label>
                          <select
                            value={editingClip.textAnimation || 'none'}
                            onChange={(e) => updateTextProperty('textAnimation', e.target.value)}
                            style={{
                              padding: '6px 8px',
                              background: '#333',
                              color: '#fff',
                              border: '1px solid #555',
                              borderRadius: '4px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            <option value="none">None</option>
                            <option value="fadeIn">Fade In</option>
                            <option value="slideIn">Slide In</option>
                            <option value="typewriter">Typewriter</option>
                          </select>
                        </div>

                        {/* Text Stroke */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <label style={{ fontSize: '11px', color: '#ccc' }}>Text Stroke</label>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input
                              type="color"
                              value={editingClip.textStrokeColor || '#000000'}
                              onChange={(e) => updateTextProperty('textStrokeColor', e.target.value)}
                              style={{
                                width: '40px',
                                height: '28px',
                                border: '1px solid #555',
                                borderRadius: '4px',
                                cursor: 'pointer',
                              }}
                            />
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={editingClip.textStrokeWidth || 0}
                              onChange={(e) => updateTextProperty('textStrokeWidth', parseInt(e.target.value))}
                              style={{ flex: 1 }}
                            />
                            <span style={{ fontSize: '11px', color: '#FFB347', minWidth: '30px' }}>
                              {editingClip.textStrokeWidth || 0}px
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Safe Margins Overlay */}
                  {showSafeMargins && (
                    <>
                      {/* Action Safe (90%) */}
                      <div style={{
                        position: 'absolute',
                        left: '5%',
                        top: '5%',
                        right: '5%',
                        bottom: '5%',
                        border: '2px dashed rgba(255, 179, 71, 0.6)',
                        pointerEvents: 'none',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '-20px',
                          left: '0',
                          fontSize: '11px',
                          color: '#FFB347',
                          background: 'rgba(0,0,0,0.7)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                        }}>
                          Action Safe (90%)
                        </div>
                      </div>
                      {/* Title Safe (80%) */}
                      <div style={{
                        position: 'absolute',
                        left: '10%',
                        top: '10%',
                        right: '10%',
                        bottom: '10%',
                        border: '2px dashed rgba(74, 144, 226, 0.6)',
                        pointerEvents: 'none',
                      }}>
                        <div style={{
                          position: 'absolute',
                          top: '-20px',
                          left: '0',
                          fontSize: '11px',
                          color: '#4A90E2',
                          background: 'rgba(0,0,0,0.7)',
                          padding: '2px 6px',
                          borderRadius: '3px',
                        }}>
                          Title Safe (80%)
                        </div>
                      </div>
                      {/* Center Crosshair */}
                      <div style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        width: '40px',
                        height: '40px',
                        transform: 'translate(-50%, -50%)',
                        border: '1px solid rgba(255, 255, 255, 0.4)',
                        borderRadius: '50%',
                        pointerEvents: 'none',
                      }}>
                        <div style={{
                          position: 'absolute',
                          left: '50%',
                          top: '0',
                          bottom: '0',
                          width: '1px',
                          background: 'rgba(255, 255, 255, 0.4)',
                          transform: 'translateX(-50%)',
                        }} />
                        <div style={{
                          position: 'absolute',
                          top: '50%',
                          left: '0',
                          right: '0',
                          height: '1px',
                          background: 'rgba(255, 255, 255, 0.4)',
                          transform: 'translateY(-50%)',
                        }} />
                      </div>
                    </>
                  )}

                  {/* Clip Info Overlay */}
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    padding: '6px 12px',
                    background: 'linear-gradient(135deg, rgba(0,0,0,0.8), rgba(0,0,0,0.6))',
                    borderRadius: '6px',
                    fontSize: '11px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    <div style={{ fontWeight: 'bold' }}>
                      {currentClipMemo.isTextClip ? '🅰️ Text: ' : '🎬 '}{currentClipMemo.mediaName}
                    </div>
                    <div style={{ color: '#888', fontSize: '10px' }}>
                      {playheadPosition.toFixed(2)}s / {currentClipMemo.duration.toFixed(2)}s
                      {currentClipMemo.speed && currentClipMemo.speed !== 1 && ` • ${currentClipMemo.speed}x speed`}
                    </div>
                  </div>

                  {/* Playback Speed Indicator */}
                  {previewPlaybackSpeed !== 1 && (
                    <div style={{
                      position: 'absolute',
                      top: '10px',
                      right: '10px',
                      padding: '6px 12px',
                      background: 'rgba(74, 144, 226, 0.9)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      ⚡ {previewPlaybackSpeed}x
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎬</div>
                  <div style={{ color: '#666', fontSize: '14px' }}>
                    {timelineClips.length === 0 ? 'Add clips to timeline to preview' : 'Move playhead over a clip'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Timeline */}
          <div 
            style={{ 
              flex: 1, 
              backgroundColor: '#2a2a2a', 
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Timeline Header Banner - Full Width */}
            <div style={{ 
              padding: '10px 16px', 
              fontWeight: 'bold', 
              borderBottom: '2px solid #1a1a1a',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#2a2a2a',
              zIndex: 100,
              flexShrink: 0,
            }}>
              <div>
                <span>Timeline ({timelineClips.length} clips)</span>
                {selectedClipIds.length > 0 && (
                  <span style={{ marginLeft: '12px', fontSize: '11px', color: '#888' }}>
                    {selectedClipIds.length} selected | DELETE to remove | S to split
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '11px' }}>
                <span style={{ color: '#999' }}>
                  Playhead: <strong style={{ color: '#4da6ff', fontFamily: 'monospace' }}>{playheadPosition.toFixed(3)}s</strong>
                </span>
                <span style={{ color: '#666' }}>|</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#999' }}>
                  <input
                    type="checkbox"
                    checked={snappingEnabled}
                    onChange={(e) => setSnappingEnabled(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  Snap to clips
                </label>
                <span style={{ color: '#666', fontSize: '10px' }}>
                  💡 Hold <strong>Shift</strong> for exact positioning
                </span>
              </div>
            </div>

            {/* Timeline Content Area - Ruler + Tracks + Clips */}
            <div 
              style={{ 
                flex: 1,
                position: 'relative',
                overflow: 'auto',
                backgroundColor: '#1e1e1e',
              }}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnter={(e) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = '#2a3540';
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.style.backgroundColor = '#1e1e1e';
              }}
            >
            
            {/* Playhead */}
            <div 
              style={{
                position: 'absolute',
                left: `${60 + playheadPosition * zoom}px`,
                top: '40px',
                bottom: 0,
                width: '2px',
                backgroundColor: '#ff4444',
                zIndex: 100,
                pointerEvents: 'none',
              }}
            >
              <div 
                style={{
                  position: 'absolute',
                  top: '-8px',
                  left: '-10px',
                  width: '20px',
                  height: '20px',
                  cursor: 'ew-resize',
                  pointerEvents: 'all',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDraggingPlayhead(true);
                  setDragStartX(e.clientX);
                  setDragStartTime(playheadPosition);
                }}
                title={`Playhead: ${playheadPosition.toFixed(3)}s (drag to move)`}
              >
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent',
                  borderTop: '8px solid #ff4444',
                  pointerEvents: 'none',
                }} />
              </div>
              {/* Time label */}
              <div style={{
                position: 'absolute',
                top: '5px',
                left: '5px',
                padding: '2px 6px',
                backgroundColor: 'rgba(255, 68, 68, 0.9)',
                color: '#fff',
                fontSize: '10px',
                fontWeight: 'bold',
                borderRadius: '3px',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}>
                {playheadPosition.toFixed(2)}s
              </div>
            </div>

            {/* Debug Click Marker - Enhanced Visual Feedback */}
            {debugClickTime !== null && (
              <div 
                style={{
                  position: 'absolute',
                  left: `${60 + debugClickTime * zoom}px`,
                  top: '40px',
                  bottom: 0,
                  width: '3px',
                  backgroundColor: '#00ff00',
                  zIndex: 99,
                  pointerEvents: 'none',
                  boxShadow: '0 0 8px rgba(0,255,0,0.8), 0 0 16px rgba(0,255,0,0.4)',
                  animation: 'pulse 2s ease-in-out',
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: '5px',
                  left: '5px',
                  padding: '2px 6px',
                  backgroundColor: 'rgba(0, 255, 0, 0.9)',
                  color: '#000',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  borderRadius: '3px',
                  whiteSpace: 'nowrap',
                }}>
                  CLICK: {debugClickTime.toFixed(3)}s
                </div>
              </div>
            )}

            {/* Timeline Ruler */}
            <div 
              style={{ 
                height: '30px', 
                backgroundColor: '#1a1a1a', 
                borderBottom: '1px solid #444',
                position: 'relative',
                marginLeft: '60px',
                cursor: 'pointer',
              }}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const exactTime = x / zoom;
                const clampedTime = Math.max(0, Math.min(totalDuration, exactTime));
                
                // Apply snapping only if not holding Shift
                const finalTime = e.shiftKey ? clampedTime : snapToNearby(clampedTime, 0.3);
                
                // Store debug marker
                setDebugClickTime(exactTime);
                setTimeout(() => setDebugClickTime(null), 2000);
                
                console.log('▶▶▶ [RULER CLICK] ◀◀◀');
                console.log('  Mouse X:', e.clientX);
                console.log('  Rect Left:', rect.left);
                console.log('  X offset:', x, 'pixels');
                console.log('  Zoom:', zoom, 'px/second');
                console.log('  EXACT time calculated:', exactTime.toFixed(6), 's');
                console.log('  FINAL time (after snap):', finalTime.toFixed(6), 's');
                console.log('  Snapping was:', e.shiftKey ? 'DISABLED (Shift held)' : 'ENABLED');
                console.log('  Setting playheadPosition to:', finalTime.toFixed(6));
                
                setPlayheadPosition(finalTime);
              }}
            >
              {Array.from({ length: Math.ceil(totalDuration * 2) + 1 }).map((_, i) => {
                const time = i * 0.5;
                const isSecond = i % 2 === 0;
                const isMajor = i % 10 === 0;
                const minutes = Math.floor(time / 60);
                const seconds = Math.floor(time % 60);
                const milliseconds = Math.floor((time % 1) * 100);
                const timecode = isMajor ? `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}` : '';
                
                return (
                  <div 
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${time * zoom}px`,
                      top: 0,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{
                      width: '1px',
                      height: isMajor ? '100%' : isSecond ? '70%' : '40%',
                      background: isMajor ? '#666' : isSecond ? '#444' : '#333',
                    }}></div>
                    {timecode && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '3px',
                        fontSize: '10px',
                        fontWeight: '600',
                        color: '#aaa',
                        fontFamily: 'monospace',
                        textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                      }}>
                        {timecode}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Track Labels */}
            <div 
              style={{
                position: 'absolute',
                left: 0,
                top: '30px',
                width: '60px',
                backgroundColor: '#252525',
                borderRight: '1px solid #444',
                minHeight: `${tracks.length * 70}px`,
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                
                // Smart positioning: flip menu if it would go off screen
                const menuHeight = 120; // Approximate height of track context menu
                const menuWidth = 200;
                const x = e.clientX + menuWidth > window.innerWidth ? e.clientX - menuWidth : e.clientX;
                const y = e.clientY + menuHeight > window.innerHeight ? e.clientY - menuHeight : e.clientY;
                
                setContextMenu({ x, y });
              }}
            >
              {tracks.map((track) => (
                <div 
                  key={track.index}
                  style={{
                    height: '70px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '10px',
                    color: '#fff',
                    borderBottom: '1px solid #2a2a2a',
                    background: `linear-gradient(135deg, ${track.color}33, ${track.color}11)`,
                    fontWeight: '600',
                    cursor: 'context-menu',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                  title="Right-click to add tracks"
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${track.color}55, ${track.color}22)`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${track.color}33, ${track.color}11)`;
                  }}
                >
                  <div style={{ 
                    fontSize: '16px', 
                    marginBottom: '2px',
                    filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))',
                  }}>
                    {track.type === 'video' ? '🎬' : track.type === 'audio' ? '🎵' : '📝'}
                  </div>
                  <div style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    color: track.color,
                    textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                  }}>
                    {track.label}
                  </div>
                  {track.locked && (
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      fontSize: '10px',
                    }}>
                      🔒
                    </div>
                  )}
                  {track.muted && (
                    <div style={{
                      position: 'absolute',
                      bottom: '4px',
                      right: '4px',
                      fontSize: '10px',
                    }}>
                      🔇
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Clips */}
            <div 
              style={{ 
                position: 'absolute', 
                left: '60px', 
                top: '30px', 
                right: 0, 
                bottom: 0, 
                minHeight: `${tracks.length * 70}px`,
                overflow: 'visible',
              }}
              onMouseDown={(e) => {
                // Start lasso selection with Alt+Click on empty space
                if (e.target === e.currentTarget && e.button === 0 && e.altKey) {
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setLassoStart({ x: e.clientX - rect.left, y: e.clientY - rect.top });
                  setLassoRect(null);
                }
              }}
              onMouseMove={(e) => {
                if (lassoStart) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const currentX = e.clientX - rect.left;
                  const currentY = e.clientY - rect.top;
                  
                  setLassoRect({
                    x: Math.min(lassoStart.x, currentX),
                    y: Math.min(lassoStart.y, currentY),
                    width: Math.abs(currentX - lassoStart.x),
                    height: Math.abs(currentY - lassoStart.y),
                  });
                }
              }}
              onMouseUp={(e) => {
                if (lassoStart && lassoRect) {
                  // Select clips within lasso rectangle
                  const selected: string[] = [];
                  timelineClips.forEach(clip => {
                    const clipX = clip.startTime * zoom;
                    const clipWidth = clip.duration * zoom;
                    const clipY = clip.trackIndex * 70;
                    const clipHeight = 60;
                    
                    // Check if clip intersects with lasso
                    if (
                      clipX < lassoRect.x + lassoRect.width &&
                      clipX + clipWidth > lassoRect.x &&
                      clipY < lassoRect.y + lassoRect.height &&
                      clipY + clipHeight > lassoRect.y
                    ) {
                      selected.push(clip.id);
                    }
                  });
                  
                  setSelectedClipIds(selected);
                  console.log('Lasso selected:', selected.length, 'clips');
                }
                
                setLassoStart(null);
                setLassoRect(null);
              }}
              onClick={(e) => {
                // Only handle clicks on the background, not on clips
                if (e.target === e.currentTarget) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const exactTime = Math.max(0, x / zoom); // Never negative
                  const clampedTime = Math.max(0, Math.min(totalDuration, exactTime));
                  
                  // Apply snapping only if not holding Shift
                  const finalTime = e.shiftKey ? clampedTime : snapToNearby(clampedTime, 0.3);
                  
                  // Store debug marker
                  setDebugClickTime(exactTime);
                  setTimeout(() => setDebugClickTime(null), 2000);
                  
                  console.log('▶▶▶ [TIMELINE CLICK] ◀◀◀');
                  console.log('  Mouse X:', e.clientX);
                  console.log('  Rect Left:', rect.left);
                  console.log('  X offset:', x, 'pixels');
                  console.log('  Zoom:', zoom, 'px/second');
                  console.log('  EXACT time calculated:', exactTime.toFixed(6), 's');
                  console.log('  FINAL time (after snap):', finalTime.toFixed(6), 's');
                  console.log('  Snapping was:', e.shiftKey ? 'DISABLED (Shift held)' : 'ENABLED');
                  console.log('  Setting playheadPosition to:', finalTime.toFixed(6));
                  
                  setPlayheadPosition(finalTime);
                }
              }}
            >
              {/* Track separation lines */}
              {tracks.map((track) => (
                <div
                  key={`track-line-${track.index}`}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: `${track.index * 70}px`,
                    right: 0,
                    height: '70px',
                    borderBottom: '1px solid #333',
                    pointerEvents: 'none',
                  }}
                />
              ))}
              
              {/* Magnetic snap line indicator */}
              {snapLineX !== null && (
                <div
                  style={{
                    position: 'absolute',
                    left: `${snapLineX}px`,
                    top: 0,
                    bottom: 0,
                    width: '2px',
                    background: 'linear-gradient(to bottom, #FF6B6B, #FF6B6B88, transparent)',
                    pointerEvents: 'none',
                    zIndex: 100,
                    boxShadow: '0 0 10px rgba(255, 107, 107, 0.6)',
                  }}
                />
              )}
              
              {timelineClips.length === 0 && (
                <div style={{ 
                  color: '#666', 
                  fontSize: '13px', 
                  padding: '40px', 
                  textAlign: 'center',
                  border: '2px dashed #444',
                  borderRadius: '8px',
                  margin: '20px',
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '10px' }}>⬇️</div>
                  <div>Drag videos from Media Library here</div>
                  <div style={{ fontSize: '11px', marginTop: '5px', color: '#555' }}>
                    or click on a media file to add it
                  </div>
                </div>
              )}
              {timelineClips.map((clip) => {
                const clipWidth = clip.duration * zoom;
                const clipLeft = clip.startTime * zoom;
                const isBeingDragged = isDraggingClip === clip.id;
                const isSelected = selectedClipIds.includes(clip.id);
                const isHovered = hoveredClip === clip.id;
                const track = tracks.find(t => t.index === clip.trackIndex);
                const trackColor = track?.type === 'video' ? '#4A90E2' : track?.type === 'audio' ? '#50C878' : '#9B59B6';
                
                return (
                  <div
                    key={clip.id}
                    draggable={!clip.locked}
                    onDragStart={(e) => {
                      if (clip.locked) return;
                      e.stopPropagation();
                      setIsDraggingClip(clip.id);
                      setDragStartX(e.clientX);
                      setDragStartTime(clip.startTime);
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDrag={(e) => {
                      if (e.clientX === 0 || clip.locked) return;
                      e.preventDefault();
                      const deltaX = e.clientX - dragStartX;
                      const deltaTime = deltaX / zoom;
                      const newStartTime = dragStartTime + deltaTime;
                      // CRITICAL: Prevent negative times at every step
                      const clampedTime = Math.max(0, newStartTime);
                      const snappedTime = snapToNearby(clampedTime, 0.1); // Use global snapping
                      const finalTime = Math.max(0, snappedTime); // Triple check
                      
                      // Show snap line if snapping occurred
                      if (Math.abs(snappedTime - clampedTime) < 0.001) {
                        setSnapLineX(null); // No snap
                      } else {
                        setSnapLineX(snappedTime * zoom);
                      }
                      
                      setTimelineClips(prev => 
                        prev.map(c => 
                          c.id === clip.id 
                            ? { ...c, startTime: finalTime }
                            : c
                        )
                      );
                    }}
                    onDragEnd={(e) => {
                      e.preventDefault();
                      setIsDraggingClip(null);
                      setSnapLineX(null); // Hide snap line
                      saveToHistory();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (e.ctrlKey) {
                        setSelectedClipIds(prev => 
                          prev.includes(clip.id) 
                            ? prev.filter(id => id !== clip.id)
                            : [...prev, clip.id]
                        );
                      } else {
                        setSelectedClipIds([clip.id]);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      console.log('🖱️ [RIGHT_CLICK] Context menu opened', {
                        clipId: clip.id,
                        currentPlayhead: playheadPosition,
                        clipStart: clip.startTime,
                        clipEnd: clip.startTime + clip.duration,
                        clipMediaPath: clip.mediaPath,
                        currentClipMemo: currentClipMemo ? {
                          id: currentClipMemo.id,
                          path: currentClipMemo.mediaPath,
                        } : null,
                      });
                      
                      if (!selectedClipIds.includes(clip.id)) {
                        setSelectedClipIds([clip.id]);
                      }
                      
                      // Smart positioning: flip menu if it would go off screen
                      const menuHeight = 450; // Approximate height of clip context menu
                      const menuWidth = 220;
                      const x = e.clientX + menuWidth > window.innerWidth ? e.clientX - menuWidth : e.clientX;
                      const y = e.clientY + menuHeight > window.innerHeight ? e.clientY - menuHeight : e.clientY;
                      
                      setClipContextMenu({ x, y, clipId: clip.id });
                      
                      console.log('📋 [CONTEXT_MENU] State set:', {
                        menuPosition: { x, y },
                        clipId: clip.id,
                      });
                    }}
                    onMouseEnter={() => setHoveredClip(clip.id)}
                    onMouseLeave={() => setHoveredClip(null)}
                    style={{
                      position: 'absolute',
                      left: `${clipLeft}px`,
                      top: `${clip.trackIndex * 70 + 5}px`,
                      width: `${clipWidth}px`,
                      height: '60px',
                      background: isSelected 
                        ? `linear-gradient(135deg, ${trackColor}dd 0%, ${trackColor}aa 100%)`
                        : `linear-gradient(135deg, ${trackColor} 0%, ${trackColor}cc 100%)`,
                      border: isSelected 
                        ? `2px solid ${trackColor}` 
                        : `1px solid ${trackColor}99`,
                      borderRadius: '6px',
                      cursor: clip.locked ? 'not-allowed' : (isBeingDragged ? 'grabbing' : 'grab'),
                      overflow: 'hidden',
                      boxSizing: 'border-box',
                      transition: isBeingDragged ? 'none' : 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: isSelected 
                        ? `0 4px 20px ${trackColor}80, 0 0 0 3px ${trackColor}40` 
                        : isHovered 
                        ? `0 4px 12px rgba(0,0,0,0.4)` 
                        : '0 2px 6px rgba(0,0,0,0.2)',
                      opacity: clip.locked ? 0.5 : (isBeingDragged ? 0.8 : (clip.opacity || 1)),
                      transform: isHovered && !isBeingDragged ? 'translateY(-1px)' : 'translateY(0)',
                      zIndex: isSelected ? 100 : isHovered ? 50 : 10,
                    }}
                  >
                    {/* Locked indicator */}
                    {clip.locked && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        right: '4px',
                        background: 'rgba(0,0,0,0.6)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        zIndex: 10,
                      }}>
                        🔒
                      </div>
                    )}

                    {/* Volume indicator */}
                    {clip.volume !== undefined && clip.volume !== 100 && (
                      <div style={{
                        position: 'absolute',
                        top: '4px',
                        left: '4px',
                        background: 'rgba(0,0,0,0.7)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        zIndex: 10,
                        color: clip.volume > 100 ? '#FFB347' : '#50C878',
                      }}>
                        🔊 {clip.volume}%
                      </div>
                    )}

                    {/* Text Clip Content */}
                    {clip.isTextClip && clip.text && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '8px',
                        background: 'linear-gradient(135deg, rgba(255,179,71,0.2), rgba(232,156,44,0.2))',
                        backdropFilter: 'blur(4px)',
                      }}>
                        <div style={{
                          fontSize: `${Math.min(clip.fontSize || 48, clipWidth / 4)}px`,
                          fontFamily: clip.fontFamily || 'Arial',
                          color: clip.textColor || '#FFFFFF',
                          textAlign: clip.textAlign || 'center',
                          textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                          fontWeight: 'bold',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          width: '100%',
                        }}>
                          🅰️ {clip.text.substring(0, 30)}{clip.text.length > 30 ? '...' : ''}
                        </div>
                      </div>
                    )}

                    {/* Thumbnail preview area */}
                    {!clip.isTextClip && showThumbnails && clipWidth > 80 && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '40px',
                        background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), transparent)',
                        display: 'flex',
                        overflow: 'hidden',
                      }}>
                        {Array.from({ length: Math.min(Math.floor(clipWidth / 60), 8) }).map((_, i) => {
                          const thumbnails = thumbnailCache.get(clip.mediaId);
                          const thumbnailIndex = Math.floor((i / Math.floor(clipWidth / 60)) * (thumbnails?.length || 1));
                          const thumbnail = thumbnails?.[thumbnailIndex];
                          
                          return (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                background: thumbnail 
                                  ? `url(${thumbnail}) center/cover` 
                                  : `linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))`,
                                borderRight: '1px solid rgba(255,255,255,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                opacity: thumbnail ? 0.8 : 0.3,
                              }}
                            >
                              {!thumbnail && '🎬'}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Waveform display for audio/video clips */}
                    {showWaveforms && (clip.trackIndex > 0 || track?.type === 'audio') && clipWidth > 40 && (
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        height: '20px',
                        background: 'rgba(0,0,0,0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        overflow: 'hidden',
                        padding: '0 2px',
                      }}>
                        {(() => {
                          const waveform = waveformCache.get(clip.mediaId);
                          if (!waveform || waveform.length === 0) {
                            return <div style={{ fontSize: '10px', color: '#888', margin: '0 auto' }}>🔊</div>;
                          }
                          
                          const samplesPerPixel = Math.max(1, Math.floor(waveform.length / clipWidth));
                          const samples = [];
                          for (let i = 0; i < clipWidth && i * samplesPerPixel < waveform.length; i++) {
                            const avgAmplitude = waveform.slice(i * samplesPerPixel, (i + 1) * samplesPerPixel)
                              .reduce((sum, val) => sum + val, 0) / samplesPerPixel;
                            samples.push(avgAmplitude);
                          }
                          
                          return (
                            <svg width="100%" height="100%" preserveAspectRatio="none" viewBox={`0 0 ${samples.length} 100`}>
                              <path
                                d={samples.map((amp, i) => {
                                  const x = i;
                                  const y = 50 - (amp * 40);
                                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(' ')}
                                stroke="rgba(80, 200, 120, 0.8)"
                                strokeWidth="1"
                                fill="none"
                              />
                              <path
                                d={samples.map((amp, i) => {
                                  const x = i;
                                  const y = 50 + (amp * 40);
                                  return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
                                }).join(' ')}
                                stroke="rgba(80, 200, 120, 0.8)"
                                strokeWidth="1"
                                fill="none"
                              />
                            </svg>
                          );
                        })()}
                      </div>
                    )}

                    {/* Clip info */}
                    {!clip.isTextClip && (
                      <div style={{ 
                        padding: '6px 10px', 
                        height: '100%', 
                        display: 'flex', 
                        flexDirection: 'column',
                        position: 'relative',
                        zIndex: 5,
                      }}>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '11px',
                          marginBottom: '2px', 
                          whiteSpace: 'nowrap', 
                          overflow: 'hidden', 
                          textOverflow: 'ellipsis',
                          color: '#fff',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}>
                          {clip.mediaName}
                        </div>
                        <div style={{ 
                          color: 'rgba(255,255,255,0.85)', 
                          fontSize: '10px',
                          textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                        }}>
                          {clip.duration.toFixed(2)}s
                          {clip.speed && clip.speed !== 1 && ` • ${clip.speed}x`}
                          {clip.muted && ' • 🔇'}
                        </div>
                      </div>
                    )}
                    
                    {/* Waveform visualization */}
                    {showWaveforms && track?.type === 'audio' && (
                      <div style={{
                        position: 'absolute',
                        bottom: '4px',
                        left: '4px',
                        right: '4px',
                        height: '24px',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '3px',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '0 4px',
                        gap: '1px',
                      }}>
                        {Array.from({ length: Math.floor(clipWidth / 3) }).map((_, i) => {
                          const height = Math.sin(i * 0.3) * 8 + Math.random() * 8 + 4;
                          return (
                            <div 
                              key={i} 
                              style={{
                                width: '2px',
                                height: `${height}px`,
                                background: `linear-gradient(to top, ${trackColor}, ${trackColor}aa)`,
                                borderRadius: '1px',
                              }}
                            />
                          );
                        })}
                      </div>
                    )}

                    {/* Trim handles - ALWAYS VISIBLE with better click area */}
                    {!clip.locked && clipWidth > 40 && (
                      <>
                        {/* Left trim handle - Larger, always visible */}
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: isSelected ? '24px' : '20px',
                            background: isSelected 
                              ? 'linear-gradient(to right, rgba(74,144,226,0.95), rgba(74,144,226,0.2))' 
                              : 'linear-gradient(to right, rgba(74,144,226,0.7), transparent)',
                            cursor: 'ew-resize',
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease-out',
                            borderRight: isSelected ? '2px solid rgba(74,144,226,0.4)' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(to right, rgba(74,144,226,1), rgba(74,144,226,0.4))';
                            e.currentTarget.style.width = '28px';
                            e.currentTarget.style.borderRight = '2px solid rgba(74,144,226,0.8)';
                          }}
                          onMouseLeave={(e) => {
                            const width = isSelected ? '24px' : '20px';
                            e.currentTarget.style.background = isSelected 
                              ? 'linear-gradient(to right, rgba(74,144,226,0.95), rgba(74,144,226,0.2))' 
                              : 'linear-gradient(to right, rgba(74,144,226,0.7), transparent)';
                            e.currentTarget.style.width = width;
                            e.currentTarget.style.borderRight = isSelected ? '2px solid rgba(74,144,226,0.4)' : 'none';
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setResizingClip({ id: clip.id, side: 'left' });
                            setDragStartX(e.clientX);
                            setDragStartTime(clip.startTime);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.touches.length > 0) {
                              setResizingClip({ id: clip.id, side: 'left' });
                              setDragStartX(e.touches[0].clientX);
                              setDragStartTime(clip.startTime);
                            }
                          }}
                          title="Drag to trim start"
                        >
                          <div style={{
                            width: '5px',
                            height: '45px',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))',
                            borderRadius: '4px',
                            boxShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 16px rgba(74,144,226,0.6)',
                            border: '1px solid rgba(74,144,226,0.8)',
                          }}>
                            <div style={{
                              width: '100%',
                              height: '33%',
                              borderBottom: '1px solid rgba(74,144,226,0.3)',
                            }}></div>
                            <div style={{
                              width: '100%',
                              height: '33%',
                              borderBottom: '1px solid rgba(74,144,226,0.3)',
                            }}></div>
                          </div>
                        </div>

                        {/* Right trim handle - Larger, always visible */}
                        <div
                          style={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: isSelected ? '24px' : '20px',
                            background: isSelected 
                              ? 'linear-gradient(to left, rgba(74,144,226,0.95), rgba(74,144,226,0.2))' 
                              : 'linear-gradient(to left, rgba(74,144,226,0.7), transparent)',
                            cursor: 'ew-resize',
                            zIndex: 20,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease-out',
                            borderLeft: isSelected ? '2px solid rgba(74,144,226,0.4)' : 'none',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'linear-gradient(to left, rgba(74,144,226,1), rgba(74,144,226,0.4))';
                            e.currentTarget.style.width = '28px';
                            e.currentTarget.style.borderLeft = '2px solid rgba(74,144,226,0.8)';
                          }}
                          onMouseLeave={(e) => {
                            const width = isSelected ? '24px' : '20px';
                            e.currentTarget.style.background = isSelected 
                              ? 'linear-gradient(to left, rgba(74,144,226,0.95), rgba(74,144,226,0.2))' 
                              : 'linear-gradient(to left, rgba(74,144,226,0.7), transparent)';
                            e.currentTarget.style.width = width;
                            e.currentTarget.style.borderLeft = isSelected ? '2px solid rgba(74,144,226,0.4)' : 'none';
                          }}
                          onMouseDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            setResizingClip({ id: clip.id, side: 'right' });
                            setDragStartX(e.clientX);
                            setDragStartTime(clip.duration);
                          }}
                          onTouchStart={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (e.touches.length > 0) {
                              setResizingClip({ id: clip.id, side: 'right' });
                              setDragStartX(e.touches[0].clientX);
                              setDragStartTime(clip.duration);
                            }
                          }}
                          title="Drag to trim end"
                        >
                          <div style={{
                            width: '5px',
                            height: '45px',
                            background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(255,255,255,0.8))',
                            borderRadius: '4px',
                            boxShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 16px rgba(74,144,226,0.6)',
                            border: '1px solid rgba(74,144,226,0.8)',
                          }}>
                            <div style={{
                              width: '100%',
                              height: '33%',
                              borderBottom: '1px solid rgba(74,144,226,0.3)',
                            }}></div>
                            <div style={{
                              width: '100%',
                              height: '33%',
                              borderBottom: '1px solid rgba(74,144,226,0.3)',
                            }}></div>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Transition indicator */}
                    {clip.transition && (
                      <div style={{
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        background: 'rgba(155, 89, 182, 0.9)',
                        padding: '2px 6px',
                        borderRadius: '3px',
                        fontSize: '9px',
                        fontWeight: '600',
                        color: '#fff',
                      }}>
                        ✨ {clip.transition.type}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            </div>
          </div>
        </div>

      {/* Clip Context Menu */}
      {clipContextMenu && (() => {
        // Calculate menu position with boundary detection
        const menuWidth = 220;
        const menuHeight = 450; // Estimated compact height
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        
        let menuX = clipContextMenu.x;
        let menuY = clipContextMenu.y;
        
        // Adjust if menu goes off right edge
        if (menuX + menuWidth > viewportWidth) {
          menuX = viewportWidth - menuWidth - 10;
        }
        
        // Adjust if menu goes off bottom edge
        if (menuY + menuHeight > viewportHeight) {
          menuY = viewportHeight - menuHeight - 10;
        }
        
        // Keep menu on screen (minimum margins)
        menuX = Math.max(10, menuX);
        menuY = Math.max(10, menuY);
        
        const currentClip = timelineClips.find(c => c.id === clipContextMenu.clipId);
        
        return (
          <div
            style={{
              position: 'fixed',
              left: menuX,
              top: menuY,
              backgroundColor: '#2a2a2a',
              border: '1px solid #4A90E2',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              zIndex: 10001,
              minWidth: '220px',
              maxHeight: 'calc(100vh - 20px)',
              overflow: 'auto',
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseLeave={() => setHoveredSubmenu(null)}
          >
            <div style={{ 
              padding: '8px 12px', 
              background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
              fontWeight: '600',
              fontSize: '12px',
              color: '#fff',
              borderBottom: '1px solid #555',
            }}>
              📋 Clip Properties
            </div>

            {/* Speed Control */}
            <div
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#fff',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a3a'; setHoveredSubmenu(null); }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => {
                const newSpeed = prompt('Enter playback speed (0.5 = half, 2 = double):', '1');
                if (newSpeed) {
                  setTimelineClips(prev => prev.map(c => 
                    c.id === clipContextMenu.clipId ? { ...c, speed: parseFloat(newSpeed) } : c
                  ));
                }
                setClipContextMenu(null);
              }}
            >
              ⚡ Change Speed
            </div>

            {/* Volume Control */}
            <div
              style={{
                padding: '10px 12px',
                fontSize: '13px',
                color: '#fff',
                borderBottom: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔊 Volume
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input 
                  type="range" 
                  min="0" 
                  max="200" 
                  value={currentClip?.volume || 100}
                  onChange={(e) => {
                    const newVolume = parseInt(e.target.value);
                    setTimelineClips(prev => prev.map(c => 
                      c.id === clipContextMenu.clipId ? { ...c, volume: newVolume } : c
                    ));
                  }}
                  style={{
                    flex: 1,
                    height: '4px',
                    background: '#555',
                    borderRadius: '2px',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: '11px', color: '#888', minWidth: '45px' }}>
                  {currentClip?.volume || 100}%
                </span>
              </div>
            </div>

            {/* Transitions Sub-menu */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredSubmenu('transitions')}
            >
              <div
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#FFB347',
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: hoveredSubmenu === 'transitions' ? '#3a3a3a' : 'transparent',
                }}
              >
                <span>🎬 Transitions</span>
                <span style={{ fontSize: '10px' }}>▶</span>
              </div>

              {/* Transitions Submenu */}
              {hoveredSubmenu === 'transitions' && (
                <div
                  style={{
                    position: 'fixed',
                    left: menuX + menuWidth,
                    top: menuY + 110,
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #FFB347',
                    borderRadius: '6px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    zIndex: 10002,
                    minWidth: '180px',
                    maxHeight: '300px',
                    overflow: 'auto',
                  }}
                  onMouseLeave={() => setHoveredSubmenu(null)}
                >
                  {['fade', 'dissolve', 'wipe', 'slide', 'zoom', 'crossfade', 'circlewipe', 'pixelate'].map((type) => {
                    const hasTransition = currentClip?.transition?.type === type;
                    return (
                      <div
                        key={type}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: hasTransition ? '#FFB347' : '#fff',
                          borderBottom: '1px solid #333',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimelineClips(prev => prev.map(c => 
                            c.id === clipContextMenu.clipId 
                              ? { ...c, transition: hasTransition ? undefined : { type: type as any, duration: 0.5 } } 
                              : c
                          ));
                          setClipContextMenu(null);
                        }}
                      >
                        <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        {hasTransition && <span style={{ color: '#FFB347' }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filters Sub-menu */}
            <div
              style={{ position: 'relative' }}
              onMouseEnter={() => setHoveredSubmenu('filters')}
            >
              <div
                style={{
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#50C878',
                  borderBottom: '1px solid #333',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: hoveredSubmenu === 'filters' ? '#3a3a3a' : 'transparent',
                }}
              >
                <span>✨ Filters</span>
                <span style={{ fontSize: '10px' }}>▶</span>
              </div>

              {/* Filters Submenu */}
              {hoveredSubmenu === 'filters' && (
                <div
                  style={{
                    position: 'fixed',
                    left: menuX + menuWidth,
                    top: menuY + 170,
                    backgroundColor: '#2a2a2a',
                    border: '1px solid #50C878',
                    borderRadius: '6px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    zIndex: 10002,
                    minWidth: '180px',
                  }}
                  onMouseLeave={() => setHoveredSubmenu(null)}
                >
                  {['blur', 'sharpen', 'vintage', 'sepia'].map((filterType) => {
                    const hasFilter = currentClip?.filter === filterType;
                    return (
                      <div
                        key={filterType}
                        style={{
                          padding: '10px 14px',
                          cursor: 'pointer',
                          fontSize: '12px',
                          color: hasFilter ? '#50C878' : '#fff',
                          borderBottom: '1px solid #333',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimelineClips(prev => prev.map(c => 
                            c.id === clipContextMenu.clipId 
                              ? { ...c, filter: hasFilter ? 'none' : filterType as any } 
                              : c
                          ));
                          setClipContextMenu(null);
                        }}
                      >
                        <span>{filterType.charAt(0).toUpperCase() + filterType.slice(1)}</span>
                        {hasFilter && <span style={{ color: '#50C878' }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Color Grading */}
            <div
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#fff',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a3a'; setHoveredSubmenu(null); }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => {
                setShowColorGrading(true);
                setColorGradingClipId(clipContextMenu.clipId);
                setClipContextMenu(null);
              }}
            >
              🎨 Color Grading
            </div>

            {/* Chroma Key Toggle */}
            <div
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: currentClip?.chromaKey?.enabled ? '#4ade80' : '#fff',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a3a'; setHoveredSubmenu(null); }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => {
                setTimelineClips(prev => prev.map(c =>
                  c.id === clipContextMenu.clipId
                    ? {
                        ...c,
                        chromaKey: c.chromaKey?.enabled
                          ? undefined
                          : { enabled: true, color: '#00ff00', threshold: 30, smoothing: 10 }
                      }
                    : c
                ));
                setClipContextMenu(null);
              }}
            >
              {currentClip?.chromaKey?.enabled ? '✓' : '○'} 🎬 Chroma Key
            </div>

            {/* Keyframe Animation */}
            <div
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#fff',
                borderBottom: '1px solid #333',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#3a3a3a'; setHoveredSubmenu(null); }}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => {
                setShowKeyframeEditor(true);
                setKeyframeClipId(clipContextMenu.clipId);
                setClipContextMenu(null);
              }}
            >
              🎯 Keyframe Animation
            </div>

            <div style={{ height: '1px', background: '#444', margin: '4px 0' }} />

            {/* Lock/Unlock & Mute in one row */}
            <div style={{ display: 'flex', borderBottom: '1px solid #333' }}>
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRight: '1px solid #333',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => {
                  setTimelineClips(prev => prev.map(c => 
                    c.id === clipContextMenu.clipId ? { ...c, locked: !c.locked } : c
                  ));
                  setClipContextMenu(null);
                }}
              >
                🔒 Lock
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => {
                  setTimelineClips(prev => prev.map(c => 
                    c.id === clipContextMenu.clipId ? { ...c, muted: !c.muted } : c
                  ));
                  setClipContextMenu(null);
                }}
              >
                🔇 Mute
              </div>
            </div>

            {/* Duplicate & Delete in one row */}
            <div style={{ display: 'flex' }}>
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  borderRight: '1px solid #333',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => {
                  const clip = timelineClips.find(c => c.id === clipContextMenu.clipId);
                  if (clip) {
                    const newClip = { 
                      ...clip, 
                      id: `clip-${Date.now()}-dup`,
                      startTime: Math.max(0, clip.startTime + clip.duration),
                    };
                    setTimelineClips(prev => [...prev, newClip]);
                    saveToHistory();
                  }
                  setClipContextMenu(null);
                }}
              >
                📄 Duplicate
              </div>
              <div
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  color: '#ff6b6b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                onClick={() => {
                  setTimelineClips(prev => prev.filter(c => c.id !== clipContextMenu.clipId));
                  setClipContextMenu(null);
                  saveToHistory();
                }}
              >
                🗑️ Delete
              </div>
            </div>
          </div>
        );
      })()}

      {/* Context Menu for Adding Tracks */}
      {contextMenu && (
        <div
          style={{
            position: 'fixed',
            left: contextMenu.x,
            top: contextMenu.y,
            backgroundColor: '#2a2a2a',
            border: '1px solid #444',
            borderRadius: '6px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            zIndex: 10000,
            minWidth: '200px',
            overflow: 'hidden',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ 
            padding: '8px 12px', 
            background: '#333',
            fontWeight: '600',
            fontSize: '11px',
            color: '#aaa',
            borderBottom: '1px solid #444',
          }}>
            ADD TRACK
          </div>
          <div
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#fff',
              borderBottom: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onClick={() => handleAddTrack('video')}
          >
            <span style={{ fontSize: '16px' }}>🎬</span>
            <span>Video Track</span>
          </div>
          <div
            style={{
              padding: '10px 14px',
              cursor: 'pointer',
              fontSize: '13px',
              color: '#fff',
              borderBottom: '1px solid #333',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            onClick={() => handleAddTrack('audio')}
          >
            <span style={{ fontSize: '16px' }}>🎵</span>
            <span>Audio Track</span>
          </div>
          
          {/* Delete Track */}
          {tracks.length > 1 && (
            <div
              style={{
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '13px',
                color: '#ff6b6b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              onClick={() => {
                // Find the track that was right-clicked (last track in array)
                const trackToDelete = tracks[tracks.length - 1];
                // Move clips from deleted track to previous track
                const prevTrackIndex = trackToDelete.index - 1;
                if (prevTrackIndex >= 0) {
                  setTimelineClips(prev => prev.map(clip => 
                    clip.trackIndex === trackToDelete.index 
                      ? { ...clip, trackIndex: prevTrackIndex }
                      : clip.trackIndex > trackToDelete.index
                      ? { ...clip, trackIndex: clip.trackIndex - 1 }
                      : clip
                  ));
                } else {
                  // Delete clips on this track if it's the first track
                  setTimelineClips(prev => prev.filter(clip => clip.trackIndex !== trackToDelete.index)
                    .map(clip => clip.trackIndex > trackToDelete.index
                      ? { ...clip, trackIndex: clip.trackIndex - 1 }
                      : clip
                    ));
                }
                // Remove track and reindex
                setTracks(prev => prev
                  .filter(t => t.index !== trackToDelete.index)
                  .map((t, idx) => ({ ...t, index: idx }))
                );
                setContextMenu(null);
                saveToHistory();
              }}
            >
              <span style={{ fontSize: '16px' }}>🗑️</span>
              <span>Delete This Track</span>
            </div>
          )}
        </div>
      )}

      {/* Text Content Edit Modal */}
      {editingTextContent && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setEditingTextContent(null)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)',
              borderRadius: '12px',
              padding: '24px',
              width: '500px',
              maxWidth: '90vw',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              border: '1px solid #FFB347',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 20px 0', color: '#FFB347', fontSize: '20px' }}>
              ✏️ Edit Text Content
            </h3>
            
            <textarea
              autoFocus
              value={editingTextContent.text}
              onChange={(e) => setEditingTextContent({ ...editingTextContent, text: e.target.value })}
              placeholder="Enter your text..."
              style={{
                width: '100%',
                minHeight: '150px',
                padding: '12px',
                background: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '16px',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingTextContent(null)}
                style={{
                  padding: '10px 20px',
                  background: '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setTimelineClips(prev => prev.map(c =>
                    c.id === editingTextContent.clipId
                      ? { ...c, text: editingTextContent.text }
                      : c
                  ));
                  saveToHistory();
                  setEditingTextContent(null);
                }}
                style={{
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #FFB347, #E89C2C)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Effects Panel */}
      {showEffectsPanel && (
        <div
          style={{
            position: 'fixed',
            right: 0,
            top: '58px',
            bottom: 0,
            width: '320px',
            background: 'linear-gradient(180deg, #2a2a2a, #1e1e1e)',
            borderLeft: '2px solid #4A90E2',
            boxShadow: '-4px 0 16px rgba(0,0,0,0.5)',
            padding: '16px',
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#4A90E2' }}>✨ Effects & Tools</h2>
            <button
              onClick={() => setShowEffectsPanel(false)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#fff',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px 8px',
              }}
            >
              ×
            </button>
          </div>
          
          {/* Quick Actions */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>QUICK ACTIONS</h3>
            
            <button
              onClick={async () => {
                try {
                  const result = await window.electronAPI.invoke('HARDWARE_ACCEL_DETECT');
                  if (result.success) {
                    const hw = result.data;
                    alert(`Hardware Acceleration:\n\nNVENC: ${hw.nvenc ? '✅' : '❌'}\nQSV: ${hw.qsv ? '✅' : '❌'}\nAMF: ${hw.amf ? '✅' : '❌'}\n\nBest: ${hw.best}`);
                  }
                } catch (error) {
                  console.error('HW detection failed:', error);
                }
              }}
              style={{
                ...buttonStyle,
                width: '100%',
                marginBottom: '8px',
                background: 'linear-gradient(135deg, #9B59B6, #7D3C98)',
              }}
            >
              ⚡ Detect Hardware Acceleration
            </button>
            
            <button
              onClick={() => {
                const selected = timelineClips.filter(c => selectedClipIds.includes(c.id));
                if (selected.length > 0) {
                  setShowKeyframeEditor(true);
                  setKeyframeClipId(selected[0].id);
                }
              }}
              style={{
                ...buttonStyle,
                width: '100%',
                marginBottom: '8px',
                background: 'linear-gradient(135deg, #FFB347, #E89C2C)',
                opacity: selectedClipIds.length === 0 ? 0.5 : 1,
                cursor: selectedClipIds.length === 0 ? 'not-allowed' : 'pointer',
              }}
              disabled={selectedClipIds.length === 0}
            >
              🎯 Keyframe Editor
            </button>
            
            <button
              onClick={() => {
                const info = `Timeline Clips: ${timelineClips.length}\nMedia Files: ${mediaFiles.length}\nSelected: ${selectedClipIds.length}\nDuration: ${totalDuration.toFixed(2)}s\nZoom: ${zoom}px/s`;
                alert(info);
              }}
              style={{
                ...buttonStyle,
                width: '100%',
                background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
              }}
            >
              📊 Project Info
            </button>
          </div>
          
          {/* Selection Tools */}
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>SELECTION</h3>
            
            <button
              onClick={() => {
                setSelectedClipIds(timelineClips.map(c => c.id));
              }}
              style={{
                ...buttonStyle,
                width: '100%',
                marginBottom: '8px',
                background: '#555',
              }}
            >
              Select All Clips
            </button>
            
            <button
              onClick={() => {
                setSelectedClipIds([]);
              }}
              style={{
                ...buttonStyle,
                width: '100%',
                background: '#555',
              }}
            >
              Deselect All
            </button>
          </div>
          
          {/* Current Selection Info */}
          {selectedClipIds.length > 0 && (
            <div style={{
              padding: '12px',
              background: 'rgba(74, 144, 226, 0.1)',
              borderRadius: '6px',
              border: '1px solid #4A90E2',
            }}>
              <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>SELECTED CLIPS</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{selectedClipIds.length} clip{selectedClipIds.length > 1 ? 's' : ''}</div>
            </div>
          )}
        </div>
      )}
      
      {/* Keyframe Editor Panel - Simplified version without useState */}
      {showKeyframeEditor && keyframeClipId && (() => {
        const clip = timelineClips.find(c => c.id === keyframeClipId);
        if (!clip) return null;
        
        const keyframes = clip.keyframes || [];
        
        return (
          <div
            style={{
              position: 'fixed',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '600px',
              height: '400px',
              background: 'linear-gradient(180deg, #2a2a2a, #1e1e1e)',
              border: '2px solid #FFB347',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
              padding: '20px',
              zIndex: 10001,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#FFB347' }}>🎯 Keyframe Editor</h2>
              <button
                onClick={() => {
                  setShowKeyframeEditor(false);
                  setKeyframeClipId(null);
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#fff',
                  fontSize: '24px',
                  cursor: 'pointer',
                  padding: '0',
                }}
              >
                ×
              </button>
            </div>
            
            <div style={{ marginBottom: '16px', padding: '12px', background: 'rgba(255, 179, 71, 0.1)', borderRadius: '6px' }}>
              <div style={{ fontSize: '11px', color: '#aaa' }}>CLIP</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{clip.mediaName}</div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                Keyframes: {keyframes.length}
              </div>
            </div>
            
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#888' }}>
              Keyframe animation editor coming soon...
              <br />
              <br />
              Use timeline handles to animate clips for now.
            </div>
            
            <button
              onClick={() => {
                setShowKeyframeEditor(false);
                setKeyframeClipId(null);
              }}
              style={{
                ...buttonStyle,
                width: '100%',
                marginTop: '16px',
                background: 'linear-gradient(135deg, #4A90E2, #357ABD)',
              }}
            >
              Close
            </button>
          </div>
        );
      })()}
      
      {/* Text Modal */}
      {showTextModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0,0,0,0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowTextModal(false)}
        >
          <div
            style={{
              background: 'linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%)',
              borderRadius: '12px',
              padding: '30px',
              width: '500px',
              maxWidth: '90vw',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              border: '1px solid #444',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 20px 0', fontSize: '24px', color: '#FFB347', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>🅰️ Add Text Overlay</span>
              <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal' }}>
                Text will be added at {playheadPosition.toFixed(2)}s
              </span>
            </h2>

            {/* Text Templates */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Templates
              </label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { name: 'Title', text: 'Your Title Here', fontSize: 72, fontFamily: 'Impact', textColor: '#FFFFFF' },
                  { name: 'Subtitle', text: 'Subtitle Text', fontSize: 48, fontFamily: 'Arial', textColor: '#CCCCCC' },
                  { name: 'Lower Third', text: 'Name • Title', fontSize: 36, fontFamily: 'Arial', textColor: '#FFB347' },
                  { name: 'Credits', text: 'Credits', fontSize: 32, fontFamily: 'Georgia', textColor: '#FFFFFF' },
                  { name: 'Quote', text: '"Inspiring Quote"', fontSize: 48, fontFamily: 'Georgia', textColor: '#FFD700' },
                ].map(template => (
                  <button
                    key={template.name}
                    onClick={() => setTextModalData({
                      ...textModalData,
                      text: template.text,
                      fontSize: template.fontSize,
                      fontFamily: template.fontFamily,
                      textColor: template.textColor,
                    })}
                    style={{
                      padding: '8px 12px',
                      background: '#3a3a3a',
                      border: '1px solid #555',
                      borderRadius: '4px',
                      color: '#fff',
                      fontSize: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#4a4a4a'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#3a3a3a'}
                  >
                    {template.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Text Input */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Text Content
              </label>
              <textarea
                value={textModalData?.text || ''}
                onChange={(e) => {
                  const newValue = e.target.value;
                  console.log('Text changed:', newValue);
                  setTextModalData({...textModalData, text: newValue});
                }}
                placeholder="Enter your text here..."
                style={{
                  width: '100%',
                  padding: '12px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  fontSize: '16px',
                  fontFamily: 'Arial',
                  minHeight: '100px',
                  resize: 'vertical',
                }}
              />
            </div>

            {/* Font Family - Expanded */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Font Family
              </label>
              <select
                value={textModalData?.fontFamily || 'Arial'}
                onChange={(e) => {
                  console.log('Font family changed:', e.target.value);
                  setTextModalData({...textModalData, fontFamily: e.target.value});
                }}
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  fontSize: '14px',
                }}
              >
                <optgroup label="Sans-Serif">
                  <option value="Arial">Arial</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Verdana">Verdana</option>
                  <option value="Tahoma">Tahoma</option>
                  <option value="Trebuchet MS">Trebuchet MS</option>
                  <option value="Impact">Impact</option>
                  <option value="Arial Black">Arial Black</option>
                </optgroup>
                <optgroup label="Serif">
                  <option value="Georgia">Georgia</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Palatino">Palatino</option>
                  <option value="Garamond">Garamond</option>
                </optgroup>
                <optgroup label="Monospace">
                  <option value="Courier New">Courier New</option>
                  <option value="Monaco">Monaco</option>
                  <option value="Consolas">Consolas</option>
                </optgroup>
              </select>
            </div>

            {/* Font Size */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Font Size: {textModalData.fontSize}px
              </label>
              <input
                type="range"
                min="12"
                max="120"
                value={textModalData.fontSize}
                onChange={(e) => setTextModalData({...textModalData, fontSize: parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  height: '4px',
                  background: '#555',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Text Color */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Text Color
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={textModalData?.textColor || '#FFFFFF'}
                  onChange={(e) => {
                    console.log('Color changed:', e.target.value);
                    setTextModalData({...textModalData, textColor: e.target.value});
                  }}
                  style={{
                    width: '50px',
                    height: '40px',
                    border: '1px solid #555',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ color: '#ccc', fontSize: '13px' }}>{textModalData.textColor}</span>
              </div>
            </div>

            {/* Text Align */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Text Alignment
              </label>
              <div style={{ display: 'flex', gap: '10px' }}>
                {(['left', 'center', 'right'] as const).map(align => (
                  <button
                    key={align}
                    onClick={() => setTextModalData({...textModalData, textAlign: align})}
                    style={{
                      flex: 1,
                      padding: '10px',
                      background: textModalData.textAlign === align ? '#FFB347' : '#444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '14px',
                      transition: 'all 0.2s',
                    }}
                  >
                    {align === 'left' && '⬅️'} {align === 'center' && '↔️'} {align === 'right' && '➡️'} {align.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#ccc' }}>
                Duration: {textModalData.duration}s
              </label>
              <input
                type="range"
                min="1"
                max="30"
                value={textModalData.duration}
                onChange={(e) => setTextModalData({...textModalData, duration: parseInt(e.target.value)})}
                style={{
                  width: '100%',
                  height: '4px',
                  background: '#555',
                  borderRadius: '2px',
                  cursor: 'pointer',
                }}
              />
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowTextModal(false)}
                style={{
                  padding: '10px 24px',
                  background: '#444',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!textModalData.text.trim()) {
                    alert('Please enter text content');
                    return;
                  }

                  // Find or create text track
                  let textTrack = tracks.find(t => t.type === 'text');
                  if (!textTrack) {
                    const newTrackIndex = tracks.length;
                    textTrack = { index: newTrackIndex, label: 'Text 1', type: 'text', color: '#FFB347' };
                    setTracks(prev => [...prev, textTrack!]);
                  }

                  // Create text clip
                  const newTextClip: TimelineClip = {
                    id: `text-clip-${Date.now()}`,
                    mediaId: `text-${Date.now()}`,
                    mediaPath: '',
                    mediaName: textModalData.text.substring(0, 20) + (textModalData.text.length > 20 ? '...' : ''),
                    startTime: playheadPosition,
                    duration: textModalData.duration,
                    trackIndex: textTrack.index,
                    isTextClip: true,
                    text: textModalData.text,
                    fontSize: textModalData.fontSize,
                    fontFamily: textModalData.fontFamily,
                    textColor: textModalData.textColor,
                    textAlign: textModalData.textAlign,
                    textPositionX: 0.5,
                    textPositionY: 0.5,
                    opacity: 100,
                  };

                  setTimelineClips(prev => [...prev, newTextClip]);
                  setShowTextModal(false);
                  saveToHistory();
                }}
                style={{
                  padding: '10px 24px',
                  background: 'linear-gradient(135deg, #FFB347, #E89C2C)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 2px 8px rgba(255, 179, 71, 0.4)',
                }}
              >
                Add to Timeline
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

const buttonStyle: React.CSSProperties = {
  padding: '4px 10px',
  backgroundColor: '#0066cc',
  color: '#fff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '12px',
  fontWeight: '600',
};

const smallButtonStyle: React.CSSProperties = {
  padding: '3px 8px',
  backgroundColor: '#444',
  color: '#fff',
  border: 'none',
  borderRadius: '3px',
  cursor: 'pointer',
  fontSize: '11px',
};

export default App;
