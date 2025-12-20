import React, { useEffect, useState, useRef } from 'react';
import { audioService } from '../services/audioService';

interface TimerProps {
  duration: number;
  onTimeUp: () => void;
  isActive: boolean;
  keyTrigger: number;
}

const Timer: React.FC<TimerProps> = ({ duration, onTimeUp, isActive, keyTrigger }) => {
  const [timeLeft, setTimeLeft] = useState(duration);
  const prevTimeLeft = useRef(timeLeft);

  useEffect(() => {
    setTimeLeft(duration);
  }, [keyTrigger, duration]);

  useEffect(() => {
    if (!isActive) return;

    if (timeLeft <= 0) {
      // audioService.play('timeout'); // Disabled timeout sound
      onTimeUp();
      return;
    }

    // audioService.play('tick'); // Disabled countdown tick sound
    prevTimeLeft.current = timeLeft;

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, isActive, onTimeUp]);

  const percentage = (timeLeft / duration) * 100;
  const color = timeLeft <= 3 ? 'bg-orange-500' : 'bg-emerald-400';

  return (
    <div className="w-full h-2 bg-emerald-950 rounded-full overflow-hidden mb-6 border border-emerald-900/50">
      <div 
        className={`h-full transition-all duration-1000 ease-linear ${color} shadow-[0_0_10px_rgba(16,185,129,0.5)]`}
        style={{ width: `${percentage}%` }}
      />
      <div className="flex justify-between mt-2 text-xs font-bold uppercase tracking-wider text-emerald-500/80">
        <span>Time Remaining</span>
        <span className={timeLeft <= 3 ? 'text-orange-400 animate-pulse' : ''}>{timeLeft}s</span>
      </div>
    </div>
  );
};

export default Timer;
