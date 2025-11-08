import { useState, useEffect, useRef } from 'react';
import type { TimelineEntry } from '../api';

interface JourneyReplayProps {
  timeline: TimelineEntry[];
  sessionId: string;
}

export default function JourneyReplay({ timeline }: JourneyReplayProps) {
  const [currentTurn, setCurrentTurn] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentEntry = timeline[currentTurn] || null;

  useEffect(() => {
    if (isPlaying && currentTurn < timeline.length - 1) {
      intervalRef.current = setInterval(() => {
        setCurrentTurn(prev => {
          if (prev >= timeline.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000 / playbackSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentTurn, timeline.length, playbackSpeed]);

  const handlePlayPause = () => {
    if (currentTurn >= timeline.length - 1) {
      setCurrentTurn(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleScrub = (turn: number) => {
    setCurrentTurn(turn);
    setIsPlaying(false);
  };

  const getQuestionTypeColor = (questionType: string) => {
    const colors: Record<string, string> = {
      clarification: 'bg-blue-100 text-blue-800',
      assumptions: 'bg-purple-100 text-purple-800',
      evidence: 'bg-green-100 text-green-800',
      perspective: 'bg-yellow-100 text-yellow-800',
      implications: 'bg-orange-100 text-orange-800',
      meta_questioning: 'bg-pink-100 text-pink-800',
    };
    return colors[questionType] || 'bg-gray-100 text-gray-800';
  };

  const getDepthColor = (depth: number) => {
    if (depth >= 4) return 'bg-green-500';
    if (depth >= 3) return 'bg-blue-500';
    if (depth >= 2) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  if (timeline.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No journey data available for this session.</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePlayPause}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button
            onClick={() => setCurrentTurn(0)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ⏮ Reset
          </button>
          <select
            value={playbackSpeed}
            onChange={(e) => setPlaybackSpeed(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg"
          >
            <option value="0.5">0.5x</option>
            <option value="1">1x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
        <div className="text-sm text-gray-600">
          Turn {currentTurn + 1} of {timeline.length}
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute top-6 left-0 right-0 h-1 bg-gray-200" />
          
          {/* Turn Markers */}
          <div className="relative flex justify-between">
            {timeline.map((entry, index) => (
              <button
                key={index}
                onClick={() => handleScrub(index)}
                className={`relative z-10 w-4 h-4 rounded-full transition-all ${
                  index === currentTurn
                    ? 'bg-blue-600 scale-125 ring-4 ring-blue-200'
                    : index < currentTurn
                    ? getDepthColor(entry.depth)
                    : 'bg-gray-300'
                } ${entry.breakthrough ? 'ring-2 ring-yellow-400' : ''}`}
                title={`Turn ${entry.turn}: ${entry.questionType}`}
              />
            ))}
          </div>

          {/* Turn Labels */}
          <div className="flex justify-between mt-8">
            {timeline.map((entry, index) => (
              <div
                key={index}
                className={`text-xs text-center ${index === currentTurn ? 'font-bold text-blue-600' : 'text-gray-500'}`}
                style={{ width: `${100 / timeline.length}%` }}
              >
                {entry.turn}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Current Turn Details */}
      {currentEntry && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Turn {currentEntry.turn} Details</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Question Type</div>
              <span className={`px-2 py-1 rounded text-sm ${getQuestionTypeColor(currentEntry.questionType)}`}>
                {currentEntry.questionType}
              </span>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Depth Level</div>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm ${getDepthColor(currentEntry.depth)}`}>
                  {currentEntry.depth}
                </div>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-gray-600 mb-1">Confidence</div>
              <div className="text-lg font-semibold">
                {(currentEntry.confidence * 100).toFixed(0)}%
              </div>
            </div>
            
            {currentEntry.breakthrough && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Breakthrough</div>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm">
                  ⭐ Moment
                </span>
              </div>
            )}
          </div>

          {/* Additional Metrics */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {currentEntry.confidenceDelta !== undefined && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Confidence Δ</div>
                <div className={`text-sm font-semibold ${currentEntry.confidenceDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {currentEntry.confidenceDelta >= 0 ? '+' : ''}{(currentEntry.confidenceDelta * 100).toFixed(1)}%
                </div>
              </div>
            )}
            
            {currentEntry.teachBackScore !== undefined && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Teach-Back Score</div>
                <div className="text-sm font-semibold">{currentEntry.teachBackScore}/4</div>
              </div>
            )}
            
            {currentEntry.reasoningScore !== undefined && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Reasoning Score</div>
                <div className="text-sm font-semibold">{currentEntry.reasoningScore}/4</div>
              </div>
            )}
            
            {currentEntry.transferSuccess !== undefined && (
              <div>
                <div className="text-sm text-gray-600 mb-1">Transfer</div>
                <span className={`px-2 py-1 rounded text-sm ${
                  currentEntry.transferSuccess ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {currentEntry.transferSuccess ? '✓ Success' : '✗ Failed'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

