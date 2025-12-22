import React, { useState } from 'react';
import { MotionTrack } from '../../shared/types';

interface MotionTrackingPanelProps {
  clipId: string;
  onAnalyze: (type: string, options: any) => Promise<void>;
  onCancel: () => void;
  trackingData?: MotionTrack;
  isAnalyzing: boolean;
  progress: number;
}

export const MotionTrackingPanel: React.FC<MotionTrackingPanelProps> = ({
  clipId,
  onAnalyze,
  onCancel,
  trackingData,
  isAnalyzing,
  progress,
}) => {
  const [selectedType, setSelectedType] = useState<'object' | 'face' | 'motion' | 'optical'>('object');
  const [sensitivity, setSensitivity] = useState(0.5);
  const [showPreview, setShowPreview] = useState(false);

  const trackingTypes = [
    { value: 'object', label: '🎯 Object Tracking', description: 'Track moving objects' },
    { value: 'face', label: '😊 Face Tracking', description: 'Track faces in video' },
    { value: 'motion', label: '💫 Motion Detection', description: 'Detect motion areas' },
    { value: 'optical', label: '🌊 Optical Flow', description: 'Dense motion field' },
  ];

  return (
    <div
      style={{
        backgroundColor: '#2a2a2a',
        borderRadius: '8px',
        padding: '16px',
        color: '#fff',
        fontFamily: 'monospace',
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: '12px', fontSize: '14px' }}>
        🎬 Motion Tracking
      </h3>

      {/* Tracking Type Selection */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '8px' }}>
          Tracking Type
        </label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {trackingTypes.map(type => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value as any)}
              style={{
                padding: '10px 12px',
                backgroundColor: selectedType === type.value ? '#0e639c' : '#3a3a3a',
                border: selectedType === type.value ? '1px solid #1177bb' : '1px solid #444',
                color: '#fff',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: selectedType === type.value ? 'bold' : 'normal',
              }}
              title={type.description}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sensitivity Control */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ fontSize: '12px', color: '#aaa', display: 'block', marginBottom: '8px' }}>
          Sensitivity: {(sensitivity * 100).toFixed(0)}%
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={sensitivity}
          onChange={e => setSensitivity(parseFloat(e.target.value))}
          disabled={isAnalyzing}
          style={{
            width: '100%',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
          }}
        />
      </div>

      {/* Progress Indicator */}
      {isAnalyzing && (
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              fontSize: '11px',
              color: '#aaa',
              marginBottom: '6px',
            }}
          >
            Analyzing... {progress.toFixed(0)}%
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: '#1e1e1e',
              borderRadius: '3px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: '100%',
                backgroundColor: '#4a90e2',
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      )}

      {/* Tracking Results */}
      {trackingData && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px',
            backgroundColor: '#1a1a1a',
            borderRadius: '4px',
            borderLeft: '3px solid #50c878',
          }}
        >
          <div style={{ fontSize: '11px', marginBottom: '6px' }}>
            ✅ Tracking Complete
          </div>
          <div style={{ fontSize: '10px', color: '#888' }}>
            Frames: {trackingData.startFrame} - {trackingData.endFrame}
            <br />
            Confidence: {(trackingData.confidence[0] * 100).toFixed(1)}%
          </div>
        </div>
      )}

      {/* Preview Toggle */}
      <div style={{ marginBottom: '16px' }}>
        <button
          onClick={() => setShowPreview(!showPreview)}
          style={{
            width: '100%',
            padding: '8px',
            backgroundColor: showPreview ? '#50c878' : '#3a3a3a',
            border: '1px solid #444',
            color: '#fff',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
          disabled={!trackingData}
        >
          {showPreview ? '👁️ Hide Preview' : '👁️ Show Preview'}
        </button>
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={() => onAnalyze(selectedType, { sensitivity })}
          disabled={isAnalyzing}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: isAnalyzing ? '#555' : '#0e639c',
            border: 'none',
            color: '#fff',
            borderRadius: '4px',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          {isAnalyzing ? '⏳ Analyzing...' : '▶️ Analyze'}
        </button>
        {isAnalyzing && (
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '10px',
              backgroundColor: '#e74c3c',
              border: 'none',
              color: '#fff',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
            }}
          >
            ⏹️ Cancel
          </button>
        )}
      </div>

      {/* Preview Display */}
      {showPreview && trackingData && (
        <div style={{ marginTop: '12px', padding: '10px', backgroundColor: '#1a1a1a', borderRadius: '4px' }}>
          <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '8px' }}>
            📍 Tracking Bounds (first 10 frames)
          </div>
          <div style={{ fontSize: '10px', fontFamily: 'monospace', color: '#888', maxHeight: '150px', overflow: 'auto' }}>
            {trackingData.bounds.slice(0, 10).map((bound, i) => (
              <div key={i}>
                F{bound.frameNumber}: ({bound.x.toFixed(0)}, {bound.y.toFixed(0)}) {bound.width.toFixed(0)}x{bound.height.toFixed(0)}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MotionTrackingPanel;
