"use client";
import { useState } from "react";
import type { TriviaQuestion } from "@/lib/trivia/question-bank";
import type { TriviaAnswer } from "@/lib/trivia/types";
import { QUESTIONS_PER_GAME } from "@/lib/trivia/puzzle-generator";

function ProgressDots({ answers, currentQuestion }: { answers: TriviaAnswer[]; currentQuestion: number }) {
  return (
    <div className="flex gap-1.5 justify-center mb-4">
      {Array.from({ length: QUESTIONS_PER_GAME }).map((_, i) => {
        const answer = answers[i];
        let color = "bg-fab-border";
        if (answer?.correct) color = "bg-fab-win";
        else if (answer && !answer.correct) color = "bg-fab-loss";
        else if (i === currentQuestion) color = "bg-fab-gold";
        return <div key={i} className={`w-6 h-2 rounded-full ${color} transition-colors`} />;
      })}
    </div>
  );
}

export function TriviaBoard({
  questions,
  answers,
  currentQuestion,
  completed,
  onAnswer,
}: {
  questions: TriviaQuestion[];
  answers: TriviaAnswer[];
  currentQuestion: number;
  completed: boolean;
  onAnswer: (questionId: number, selectedIndex: number) => void;
}) {
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<TriviaAnswer | null>(null);

  const question = questions[currentQuestion];
  if (!question || completed) {
    return (
      <div>
        <ProgressDots answers={answers} currentQuestion={currentQuestion} />
      </div>
    );
  }

  function handlePick(idx: number) {
    if (showFeedback) return;
    const correct = idx === question.correctIndex;
    const answer: TriviaAnswer = { questionId: question.id, selectedIndex: idx, correct };
    setLastAnswer(answer);
    setShowFeedback(true);

    // Show feedback for 1 second, then advance
    setTimeout(() => {
      onAnswer(question.id, idx);
      setShowFeedback(false);
      setLastAnswer(null);
    }, 1200);
  }

  return (
    <div>
      <ProgressDots answers={answers} currentQuestion={currentQuestion} />

      <div className="mb-2 text-center">
        <span className="text-[10px] text-fab-dim uppercase tracking-wider">{question.category}</span>
        <p className="text-[10px] text-fab-dim">Question {currentQuestion + 1}/{QUESTIONS_PER_GAME}</p>
      </div>

      <p className="text-sm font-medium text-fab-text text-center mb-4 leading-relaxed">{question.question}</p>

      <div className="space-y-2">
        {question.options.map((option, idx) => {
          let btnClass = "border-fab-border bg-fab-surface hover:border-fab-gold/30 hover:bg-fab-gold/5 cursor-pointer";
          if (showFeedback) {
            if (idx === question.correctIndex) {
              btnClass = "border-fab-win/50 bg-fab-win/10";
            } else if (idx === lastAnswer?.selectedIndex && !lastAnswer.correct) {
              btnClass = "border-fab-loss/50 bg-fab-loss/10";
            } else {
              btnClass = "border-fab-border bg-fab-surface/50 opacity-50";
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handlePick(idx)}
              disabled={showFeedback}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm text-fab-text transition-all ${btnClass}`}
            >
              <span className="text-fab-dim mr-2 font-mono text-xs">{String.fromCharCode(65 + idx)}</span>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
