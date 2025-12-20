
import React, { useState } from 'react';
import { Question, QuizResult, LeaderboardEntry } from '../types';
import { getExplanation } from '../services/geminiService';

interface ResultsViewProps {
  questions: Question[];
  results: QuizResult[];
  onRestart: () => void;
  leaderboard: LeaderboardEntry[];
}

const ResultsView: React.FC<ResultsViewProps> = ({ questions, results, onRestart, leaderboard }) => {
  const [explanations, setExplanations] = useState<Record<string, { text: string; loading: boolean }>>({});
  
  const score = results.filter(r => r.isCorrect).length;
  const percentage = Math.round((score / questions.length) * 100);

  const fetchExplanation = async (qId: string) => {
    if (explanations[qId]) return;

    const question = questions.find(q => q.id === qId);
    const result = results.find(r => r.questionId === qId);
    if (!question || !result) return;

    setExplanations(prev => ({ ...prev, [qId]: { text: '', loading: true } }));
    
    const text = await getExplanation(
      question.text,
      question.options,
      question.correctAnswer,
      result.userAnswer
    );

    setExplanations(prev => ({ ...prev, [qId]: { text, loading: false } }));
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="bg-[#064e3b]/40 backdrop-blur-xl rounded-[2.5rem] shadow-2xl overflow-hidden mb-10 border border-emerald-800/50">
        <div className="bg-gradient-to-br from-emerald-800 to-emerald-950 p-12 text-center relative">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
          <div className="relative z-10">
            <h1 className="text-4xl md:text-5xl font-black mb-4 text-emerald-50 tracking-tight">Quiz Results</h1>
            <p className="text-emerald-300 text-lg opacity-80 mb-10">Your journey to success continues with Successcribe.</p>
            
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-emerald-400 blur-2xl opacity-20 animate-pulse"></div>
              <div className="relative bg-emerald-950/80 rounded-full w-40 h-40 flex flex-col items-center justify-center border-4 border-emerald-500/30 backdrop-blur-xl mx-auto">
                <span className="text-5xl font-black text-emerald-400">{percentage}%</span>
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mt-1">Score</p>
              </div>
            </div>

            <div className="flex justify-center gap-12 mt-12">
              <div className="text-center group">
                <p className="text-3xl font-black text-emerald-400 group-hover:scale-110 transition-transform">{score}</p>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Correct</p>
              </div>
              <div className="text-center group">
                <p className="text-3xl font-black text-rose-500 group-hover:scale-110 transition-transform">{questions.length - score}</p>
                <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Mistakes</p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 md:p-12">
          {/* Internal Scoreboard */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-emerald-50 mb-6 flex items-center gap-3">
              <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
              Top Performers
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
               {leaderboard.map((entry, idx) => (
                 <div key={idx} className="bg-emerald-950/50 p-4 rounded-2xl border border-emerald-900/40 text-center">
                   <p className="text-[10px] font-black text-emerald-600 uppercase mb-1">Rank #{idx+1}</p>
                   <p className="text-emerald-50 font-bold truncate">{entry.playerName}</p>
                   <p className="text-lg font-black text-emerald-400">{entry.score}%</p>
                 </div>
               ))}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-emerald-50 mb-8 flex items-center gap-3">
            <span className="w-8 h-1 bg-emerald-500 rounded-full"></span>
            Performance Analysis
          </h2>
          
          <div className="space-y-8">
            {questions.map((q, idx) => {
              const result = results.find(r => r.questionId === q.id);
              const exp = explanations[q.id];

              return (
                <div key={q.id} className="bg-emerald-950/30 rounded-3xl p-6 border border-emerald-900/40 hover:border-emerald-700/50 transition-colors">
                  <div className="flex items-start gap-5">
                    <div className={`mt-1 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center font-bold text-lg ${result?.isCorrect ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                      {result?.isCorrect ? '✓' : '✕'}
                    </div>
                    <div className="flex-grow">
                      <p className="text-lg font-bold text-emerald-100 mb-4">{idx + 1}. {q.text}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-6">
                        <div className={`p-4 rounded-2xl border ${result?.isCorrect ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-200' : 'bg-rose-500/5 border-rose-500/20 text-rose-200'}`}>
                          <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Your Answer</p>
                          <span className="font-semibold">{result?.userAnswer || 'Timed Out'}</span>
                        </div>
                        {!result?.isCorrect && (
                          <div className="p-4 rounded-2xl border bg-emerald-500/10 border-emerald-400/30 text-emerald-100">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Correct Answer</p>
                            <span className="font-semibold">{q.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                      
                      <div>
                        {exp ? (
                          <div className="bg-[#022c22] p-5 rounded-2xl border border-emerald-800/60 shadow-inner">
                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-3 flex items-center">
                              <span className="mr-2 animate-pulse">⚡</span> AI Personal Insight
                            </h4>
                            {exp.loading ? (
                              <div className="flex gap-3 items-center text-emerald-500/60">
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-emerald-500 border-t-transparent"></div>
                                <span className="text-xs font-bold uppercase tracking-wider">Generating Feedback...</span>
                              </div>
                            ) : (
                              <p className="text-emerald-200/80 leading-relaxed italic text-sm">"{exp.text}"</p>
                            )}
                          </div>
                        ) : (
                          <button 
                            onClick={() => fetchExplanation(q.id)}
                            className="text-xs font-black text-emerald-400 hover:text-emerald-300 transition-all flex items-center gap-2 group px-4 py-2 bg-emerald-900/40 rounded-full border border-emerald-800/40 hover:bg-emerald-800/60"
                          >
                            <span className="group-hover:rotate-12 transition-transform">💡</span> LEARN WHY
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-16 text-center">
            <button
              onClick={onRestart}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black py-5 px-16 rounded-2xl shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-wider"
            >
              Take Another Challenge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;
