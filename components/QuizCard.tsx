
import React from 'react';
import { Question } from '../types';

interface QuizCardProps {
  question: Question;
  onAnswer: (answer: string) => void;
  selectedAnswer: string | null;
  disabled: boolean;
}

const QuizCard: React.FC<QuizCardProps> = ({ question, onAnswer, selectedAnswer, disabled }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <h2 className="text-xl md:text-3xl font-bold text-emerald-50 mb-10 leading-snug">
        {question.text}
      </h2>
      
      <div className="grid grid-cols-1 gap-5">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === option;
          const isCorrect = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
          
          let stateStyles = 'border-emerald-800/40 bg-emerald-900/20 hover:border-emerald-500 hover:bg-emerald-800/40';
          
          if (disabled) {
            if (isCorrect) {
              // Reveal correct answer in Emerald Green
              stateStyles = 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.3)] ring-2 ring-emerald-500/50';
            } else if (isSelected) {
              // Reveal wrong selection in Rose Red
              stateStyles = 'border-rose-500 bg-rose-500/20 opacity-100 ring-2 ring-rose-500/50';
            } else {
              stateStyles = 'border-emerald-900/20 bg-emerald-950/10 opacity-30';
            }
          } else if (isSelected) {
            stateStyles = 'border-emerald-400 bg-emerald-900/40 ring-4 ring-emerald-500/10';
          }

          return (
            <button
              key={index}
              onClick={() => !disabled && onAnswer(option)}
              disabled={disabled}
              className={`
                text-left p-6 rounded-2xl border-2 transition-all duration-300 group relative overflow-hidden
                ${stateStyles}
              `}
            >
              <div className="flex items-center relative z-10">
                <span className={`
                  w-10 h-10 flex items-center justify-center rounded-xl text-sm font-black mr-5 transition-colors
                  ${isSelected || (disabled && isCorrect) 
                    ? (isCorrect ? 'bg-emerald-400 text-emerald-950' : 'bg-rose-500 text-white') 
                    : 'bg-emerald-950 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-emerald-950'}
                `}>
                  {String.fromCharCode(65 + index)}
                </span>
                <span className={`text-lg md:text-xl ${isSelected || (disabled && isCorrect) ? 'text-emerald-50 font-bold' : 'text-emerald-100/80 group-hover:text-emerald-50'}`}>
                  {option}
                  {disabled && isCorrect && <span className="ml-3 text-xs uppercase tracking-widest text-emerald-400 opacity-80">(Correct)</span>}
                </span>
              </div>
              {isSelected && !disabled && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-400/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuizCard;
