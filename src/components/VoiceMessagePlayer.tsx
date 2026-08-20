import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Mic } from 'lucide-react';
import { triggerHaptic, hapticPatterns } from '../utils/haptics';

interface VoiceMessagePlayerProps {
  audioUrl: string;
  duration?: number;
  isMe?: boolean;
  senderAvatar?: string;
}

// Generate realistic looking WhatsApp waveform bar heights
const WAVEFORM_BARS = [
  35, 60, 40, 85, 55, 70, 90, 45, 65, 100,
  40, 75, 50, 95, 60, 80, 45, 70, 90, 55,
  65, 40, 80, 60, 50, 75, 40, 30
];

export const VoiceMessagePlayer: React.FC<VoiceMessagePlayerProps> = ({
  audioUrl,
  duration = 0,
  isMe = false,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(duration);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 1.5 | 2>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stop playback if another voice note plays
  useEffect(() => {
    const handleGlobalPlay = (e: Event) => {
      const customEvt = e as CustomEvent<{ playerId: string }>;
      if (audioRef.current && customEvt.detail?.playerId !== audioUrl) {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener('app-voice-play', handleGlobalPlay);
    return () => {
      window.removeEventListener('app-voice-play', handleGlobalPlay);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [audioUrl]);

  const togglePlay = () => {
    triggerHaptic(hapticPatterns.click);

    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.playbackRate = playbackSpeed;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setAudioDuration(Math.round(audio.duration));
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };

      audio.onerror = () => {
        setIsPlaying(false);
      };
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      // Notify other players to stop
      window.dispatchEvent(
        new CustomEvent('app-voice-play', { detail: { playerId: audioUrl } })
      );
      audioRef.current.playbackRate = playbackSpeed;
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleSeek = (index: number) => {
    triggerHaptic(hapticPatterns.click);
    const targetFraction = index / WAVEFORM_BARS.length;
    const targetTime = targetFraction * (audioDuration || 1);

    if (!audioRef.current) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.playbackRate = playbackSpeed;

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTime(0);
      };
    }

    audioRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);

    if (!isPlaying) {
      window.dispatchEvent(
        new CustomEvent('app-voice-play', { detail: { playerId: audioUrl } })
      );
      audioRef.current.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  };

  const handleSpeedToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerHaptic(hapticPatterns.click);
    const speeds: (1 | 1.5 | 2)[] = [1, 1.5, 2];
    const nextIndex = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (secs: number) => {
    const s = Math.floor(secs);
    const m = Math.floor(s / 60);
    const remainingS = s % 60;
    return `${m}:${remainingS < 10 ? '0' : ''}${remainingS}`;
  };

  const currentDisplayTime = isPlaying
    ? formatTime(currentTime)
    : formatTime(audioDuration || duration || 0);

  const progressFraction = (audioDuration && audioDuration > 0)
    ? Math.min(1, currentTime / audioDuration)
    : 0;

  return (
    <div className="flex items-center gap-2.5 py-1 select-none min-w-[210px] sm:min-w-[240px]">
      {/* Play / Pause Circular Button */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={isPlaying ? 'Pause voice message' : 'Play voice message'}
        className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs active:scale-95 ${
          isMe
            ? 'bg-[#0052FF] hover:bg-[#0043D1] text-white'
            : 'bg-[#0084FF] hover:bg-[#0070DB] text-white'
        }`}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-white" />
        ) : (
          <Play className="w-4 h-4 ml-0.5 fill-white" />
        )}
      </button>

      {/* Waveform and Time Info */}
      <div className="flex-1 flex flex-col justify-center space-y-1">
        {/* Seekable Waveform Bars */}
        <div
          className="flex items-center gap-[2.5px] h-6 cursor-pointer py-1"
          title="Click to seek"
        >
          {WAVEFORM_BARS.map((heightPercent, idx) => {
            const barFraction = idx / WAVEFORM_BARS.length;
            const isFilled = isPlaying || currentTime > 0 ? barFraction <= progressFraction : false;

            return (
              <div
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(idx);
                }}
                style={{ height: `${Math.max(20, heightPercent * 0.22)}px` }}
                className={`w-[3px] rounded-full transition-colors ${
                  isFilled
                    ? isMe
                      ? 'bg-[#0052FF]'
                      : 'bg-[#0084FF]'
                    : isMe
                    ? 'bg-[#A8D89C]'
                    : 'bg-slate-300'
                }`}
              />
            );
          })}
        </div>

        {/* Time and Speed Controls */}
        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-600 px-0.5">
          <div className="flex items-center gap-1">
            <Mic className="w-3 h-3 text-slate-400" />
            <span className="font-mono">{currentDisplayTime}</span>
          </div>

          <button
            type="button"
            onClick={handleSpeedToggle}
            className={`px-1.5 py-0.2 rounded-full text-[9px] font-black transition-all cursor-pointer ${
              playbackSpeed !== 1
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
            }`}
            title="Toggle playback speed"
          >
            {playbackSpeed}x
          </button>
        </div>
      </div>
    </div>
  );
};
