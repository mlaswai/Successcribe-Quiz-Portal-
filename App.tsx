
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Question, QuizResult, QuizState, LeaderboardEntry } from './types';
import QuizCard from './components/QuizCard';
import Timer from './components/Timer';
import ResultsView from './components/ResultsView';
import { audioService } from './services/audioService';

const App: React.FC = () => {
  const [state, setState] = useState<QuizState>(QuizState.IDLE);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [quizStartTime, setQuizStartTime] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('successcribe_leaderboard');
    if (saved) {
      try {
        setLeaderboard(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse leaderboard", e);
      }
    }
  }, []);

  useEffect(() => {
    audioService.setMuted(isMuted);
  }, [isMuted]);

  const shuffleArray = <T,>(array: T[]): T[] => {
    return [...array].sort(() => Math.random() - 0.5);
  };

  /**
   * Enhanced text sanitizer to remove encoding artifacts like '?' 
   * in place of apostrophes and quotes.
   */
  const cleanText = (text: string): string => {
    if (!text) return '';
    let t = text
      // 1. Normalize actual Unicode smart characters first
      .replace(/[\u201C\u201D\u201E\u201F\u2033\u2036]/g, '"')
      .replace(/[\u2018\u2019\u201A\u201B\u2032\u2035]/g, "'")
      .replace(/\u00A0/g, ' ')
      .replace(/\u2013|\u2014/g, '-')
      .replace(/\uFFFD/g, '');

    // 2. Fix literal '?' artifacts common in Excel/Word to CSV exports
    // Fix apostrophes: bachelor?s -> bachelor's, don?t -> don't
    t = t.replace(/(\w)\?([stmd]|re|ve|ll)\b/gi, "$1'$2");
    
    // Fix middle-of-word artifacts: O?Reilly -> O'Reilly
    t = t.replace(/([a-zA-Z])\?([a-zA-Z])/g, "$1'$2");

    // Fix opening quote artifacts: ?Three-year -> "Three-year
    t = t.replace(/(^|\s)\?(\w)/g, '$1"$2');

    // Fix closing quote artifacts: degrees? commonly -> degrees" commonly
    // Only replaces if '?' is followed by a space and another word
    t = t.replace(/(\w)\?(\s+[a-z0-9])/gi, '$1"$2');

    // Remove any triple dots or strange question mark sequences
    t = t.replace(/\?\?\+/g, '?');

    return t.trim();
  };

  const parseCSV = (text: string): Question[] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
    const data: Question[] = [];
    const letterMap: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };

    for (let i = 1; i < lines.length; i++) {
      const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
      const columns = lines[i].split(regex).map(col => {
        let cleaned = col.trim();
        if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
          cleaned = cleaned.substring(1, cleaned.length - 1);
        }
        return cleanText(cleaned);
      });
      
      if (columns.length >= 6) {
        const options = [columns[1], columns[2], columns[3], columns[4]];
        let correctAnswerText = columns[5];
        
        const upperAns = correctAnswerText.toUpperCase();
        if (letterMap[upperAns] !== undefined) {
          correctAnswerText = options[letterMap[upperAns]];
        }

        data.push({
          id: `q-${i}`,
          text: columns[0],
          options,
          correctAnswer: correctAnswerText,
        });
      }
    }
    return data;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!playerName.trim()) {
      alert("Please enter your name first!");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    audioService.play('click');
    setState(QuizState.LOADING);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const parsed = parseCSV(text);
      if (parsed.length > 0) {
        setQuestions(shuffleArray(parsed).slice(0, 10));
        setState(QuizState.RUNNING);
        setCurrentIndex(0);
        setResults([]);
        setSelectedAnswer(null);
        setQuizStartTime(Date.now());
      } else {
        alert("Could not parse CSV. Ensure it follows format: Question, A, B, C, D, Correct Answer");
        setState(QuizState.IDLE);
      }
    };
    reader.readAsText(file);
  };

  const saveScore = useCallback((finalResults: QuizResult[]) => {
    const score = finalResults.filter(r => r.isCorrect).length;
    const percentage = Math.round((score / (questions.length || 10)) * 100);
    const totalTime = Math.round((Date.now() - quizStartTime) / 1000);

    const newEntry: LeaderboardEntry = {
      playerName: playerName.trim() || 'Anonymous',
      score: percentage,
      totalTime,
      date: Date.now()
    };

    const updatedLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.totalTime - b.totalTime;
      })
      .slice(0, 5);

    setLeaderboard(updatedLeaderboard);
    localStorage.setItem('successcribe_leaderboard', JSON.stringify(updatedLeaderboard));
  }, [leaderboard, playerName, quizStartTime, questions.length]);

  const handleNext = useCallback((answer: string | null) => {
    if (isAnswering) return;
    setIsAnswering(true);

    const currentQuestion = questions[currentIndex];
    const normalizedSelected = (answer || '').trim().toLowerCase();
    const normalizedCorrect = (currentQuestion.correctAnswer || '').trim().toLowerCase();
    const isCorrect = answer !== null && normalizedSelected === normalizedCorrect;
    
    // Only correct sound plays
    if (answer !== null && isCorrect) {
      audioService.play('correct');
    }

    const newResult: QuizResult = {
      questionId: currentQuestion.id,
      userAnswer: answer || 'TIME OUT',
      isCorrect,
      timeSpent: 10
    };

    const updatedResults = [...results, newResult];
    setResults(updatedResults);
    setSelectedAnswer(answer);

    setTimeout(() => {
      if (currentIndex < questions.length - 1) {
        setCurrentIndex(prev => prev + 1);
        setSelectedAnswer(null);
        setIsAnswering(false);
      } else {
        audioService.play('victory');
        saveScore(updatedResults);
        setState(QuizState.FINISHED);
        setIsAnswering(false);
      }
    }, 1500);
  }, [currentIndex, questions, isAnswering, results, saveScore]);

  const handleTimeUp = useCallback(() => {
    if (!isAnswering) {
      handleNext(null);
    }
  }, [handleNext, isAnswering]);

  const restart = () => {
    audioService.play('click');
    setState(QuizState.IDLE);
    setQuestions([]);
    setCurrentIndex(0);
    setResults([]);
    setSelectedAnswer(null);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    if (isMuted) {
      setTimeout(() => audioService.play('click'), 50);
    }
  };

  const ScoreboardUI = () => (
    <div className="w-full mt-12 text-left">
      <h3 className="text-emerald-500 font-black text-sm tracking-[0.3em] uppercase mb-6 flex items-center gap-2">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
        Hall of Fame
      </h3>
      <div className="space-y-3">
        {leaderboard.length === 0 ? (
          <p className="text-emerald-200/40 italic text-sm">No records yet. Be the first!</p>
        ) : (
          leaderboard.map((entry, i) => (
            <div key={i} className="bg-emerald-950/40 border border-emerald-900/50 p-4 rounded-2xl flex items-center justify-between group hover:border-emerald-500/30 transition-colors">
              <div className="flex items-center gap-4">
                <span className="text-emerald-500/50 font-black text-lg">#{i + 1}</span>
                <div>
                  <p className="text-emerald-50 font-bold">{entry.playerName}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">{new Date(entry.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-emerald-400">{entry.score}%</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">{entry.totalTime}s</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const VolumeControl = () => (
    <button 
      onClick={toggleMute}
      className="p-3 bg-emerald-950/80 rounded-2xl shadow-xl hover:shadow-emerald-500/10 transition-all border border-emerald-800/40 flex items-center justify-center text-emerald-500 hover:text-emerald-300 hover:border-emerald-600 active:scale-95"
      title={isMuted ? "Unmute" : "Mute"}
    >
      {isMuted ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </svg>
      )}
    </button>
  );

  if (state === QuizState.IDLE) {
    return (
      <div className="min-h-screen bg-[#022c22] flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-900/20 rounded-full filter blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-green-950/30 rounded-full filter blur-[120px] animate-pulse delay-1000"></div>

        <div className="absolute top-8 right-8 z-20">
          <VolumeControl />
        </div>
        
        <div className="max-w-3xl w-full text-center space-y-12 relative z-10 py-12">
          <div className="flex justify-center items-center gap-4 mb-8">
             <div className="bg-emerald-500 text-emerald-950 p-6 rounded-[2rem] shadow-[0_0_50px_rgba(16,185,129,0.2)] font-black text-4xl rotate-6 transition-transform hover:rotate-0 cursor-default">S</div>
             <div className="bg-emerald-950 text-emerald-500 p-6 rounded-[2rem] shadow-xl font-black text-4xl -rotate-6 transition-transform hover:rotate-0 cursor-default border-4 border-emerald-500/40">Q</div>
          </div>

          <div className="space-y-4">
            <h1 className="text-6xl md:text-7xl font-black text-emerald-50 tracking-tighter leading-none">
              Successcribe<br/>
              <span className="text-emerald-500 drop-shadow-[0_0_15px_rgba(16,185,129,0.3)]">Quiz Portal</span>
            </h1>
            <p className="text-2xl md:text-3xl text-emerald-200/80 font-bold max-w-2xl mx-auto leading-relaxed uppercase tracking-tight">
              Test your Study Abroad Knowledge
            </p>
          </div>
          
          <div className="bg-emerald-900/20 backdrop-blur-3xl p-10 md:p-14 rounded-[3rem] shadow-2xl border border-emerald-800/40 flex flex-col items-center">
            <div className="w-full mb-8">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 block mb-3 text-left">Candidate Name</label>
              <input 
                type="text" 
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name to compete..."
                className="w-full bg-emerald-950/50 border border-emerald-800/40 rounded-2xl px-6 py-5 text-emerald-50 placeholder-emerald-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all font-bold text-lg"
              />
            </div>

            <div className="mb-10 p-6 bg-emerald-950/50 rounded-2xl border-2 border-dashed border-emerald-700/50 text-emerald-400 w-full text-center">
              <p className="text-xs font-black uppercase tracking-[0.3em] mb-3 opacity-60">System Ready</p>
              <p className="text-sm font-bold text-emerald-50/80 leading-relaxed">
                Standard Input: CSV Bank (Question, A, B, C, D, Answer)
              </p>
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="group bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black py-6 px-12 rounded-[1.5rem] shadow-[0_20px_50px_rgba(16,185,129,0.2)] hover:shadow-[0_25px_60px_rgba(16,185,129,0.4)] transition-all transform hover:-translate-y-2 w-full text-xl flex items-center justify-center gap-4 overflow-hidden relative"
            >
              <span className="relative z-10 flex items-center gap-3 uppercase tracking-tighter">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                Initialize Quiz Session
              </span>
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />

            <ScoreboardUI />
          </div>
          
          <div className="flex items-center justify-center gap-6 opacity-60">
            <p className="text-emerald-500 font-black text-xs tracking-widest flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span> GEMINI 3 FLASH ENGINE
            </p>
            <span className="w-1 h-1 bg-emerald-800 rounded-full"></span>
            <p className="text-emerald-500 font-black text-xs tracking-widest">10s TIMED ROUNDS</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === QuizState.RUNNING) {
    return (
      <div className="min-h-screen bg-[#022c22] py-16 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent"></div>
        <div className="absolute top-8 right-8 z-20">
          <VolumeControl />
        </div>
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-end mb-16">
            <div className="space-y-2">
              <span className="px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400 bg-emerald-950/80 border border-emerald-500/20">
                Live Session
              </span>
              <h3 className="text-emerald-50/40 font-bold text-sm tracking-widest uppercase">Successcribe Intel</h3>
            </div>
            <div className="flex gap-10">
              <div className="text-right">
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest mb-1">Progress</p>
                <p className="text-4xl font-black text-emerald-50 tabular-nums">
                  {currentIndex + 1}<span className="text-emerald-800 mx-1">/</span>{questions.length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-emerald-900/10 backdrop-blur-3xl rounded-[3rem] shadow-2xl p-10 md:p-16 border border-emerald-800/40 relative">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl"></div>
            
            <Timer 
              duration={10} 
              onTimeUp={handleTimeUp} 
              isActive={state === QuizState.RUNNING && !isAnswering} 
              keyTrigger={currentIndex}
            />
            
            <QuizCard 
              question={questions[currentIndex]} 
              onAnswer={handleNext}
              selectedAnswer={selectedAnswer}
              disabled={isAnswering}
            />
          </div>

          <div className="mt-12 flex justify-center items-center gap-3">
            {questions.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-500 ${
                  idx === currentIndex 
                    ? 'w-12 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.5)]' 
                    : idx < currentIndex 
                      ? 'w-3 bg-emerald-800' 
                      : 'w-3 bg-emerald-950 border border-emerald-900/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (state === QuizState.FINISHED) {
    return (
      <div className="min-h-screen bg-[#022c22] relative">
        <div className="absolute top-8 right-8 z-20">
          <VolumeControl />
        </div>
        <ResultsView questions={questions} results={results} onRestart={restart} leaderboard={leaderboard} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#022c22] flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-ping"></div>
        <div className="animate-spin rounded-3xl h-16 w-16 border-4 border-emerald-500 border-t-transparent shadow-2xl relative z-10"></div>
      </div>
      <p className="text-emerald-500 font-black text-xs tracking-[0.4em] uppercase animate-pulse">Initializing Interface</p>
    </div>
  );
};

export default App;
