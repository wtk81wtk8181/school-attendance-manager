"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { McFigureView } from "@/components/pe/mc-figure";
import {
  minutesForCount,
  QUIZ_COUNTS,
  shufflePick,
  type BodyMcQuestion,
  type McKey,
  type QuizCount,
} from "@/data/pe-body-mc";

function parseCount(n: number): QuizCount {
  return (QUIZ_COUNTS as readonly number[]).includes(n) ? (n as QuizCount) : 20;
}

function formatTime(seconds: number) {
  const m = Math.floor(Math.max(0, seconds) / 60);
  const s = Math.max(0, seconds) % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function PracticeQuiz({ n, seed }: { n: number; seed: number }) {
  const router = useRouter();
  const count = parseCount(n);
  const questions = useMemo(() => shufflePick(count, seed), [count, seed]);
  const minutes = minutesForCount(count);
  const totalSeconds = minutes * 60;

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, McKey>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const current = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const unanswered = questions.filter((q) => !answers[q.id]).length;

  useEffect(() => {
    if (submitted) return;
    const started = Date.now();
    const tick = () => {
      const left = totalSeconds - Math.floor((Date.now() - started) / 1000);
      if (left <= 0) {
        setRemaining(0);
        setSubmitted(true);
        setConfirmOpen(false);
        return;
      }
      setRemaining(left);
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [submitted, totalSeconds, seed]);

  function choose(key: McKey) {
    if (!current || submitted) return;
    setAnswers((prev) => ({ ...prev, [current.id]: key }));
  }

  function requestSubmit() {
    if (unanswered > 0) {
      setConfirmOpen(true);
      return;
    }
    setSubmitted(true);
  }

  function retry() {
    const nextSeed = Math.floor(Math.random() * 1_000_000_000);
    router.push(`/pe/practice?n=${count}&seed=${nextSeed}`);
  }

  if (!current) {
    return (
      <p className="text-sm text-slate-600">
        未能載入題目。
        <Link href="/pe" className="ml-2 text-violet-700 underline">
          返回
        </Link>
      </p>
    );
  }

  if (submitted) {
    return (
      <ResultView
        questions={questions}
        answers={answers}
        minutes={minutes}
        remaining={remaining}
        onRetry={retry}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="font-medium text-violet-800">
          第 {index + 1} / {questions.length} 題
        </p>
        <p className={`font-mono tabular-nums ${remaining <= 120 ? "font-semibold text-rose-600" : "text-slate-600"}`}>
          {formatTime(remaining)}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-violet-100">
        <div
          className="h-full rounded-full bg-violet-600 transition-[width] duration-200"
          style={{ width: `${((index + 1) / questions.length) * 100}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-slate-400">已答 {answeredCount} 題</p>

      <QuestionBody question={current} />

      <div className="mt-5 grid gap-2">
        {current.options.map((option) => {
          const selected = answers[current.id] === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => choose(option.key)}
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm leading-6 transition ${
                selected
                  ? "border-violet-600 bg-violet-50 text-violet-950"
                  : "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/50"
              }`}
            >
              <span
                className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${
                  selected ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-700"
                }`}
              >
                {option.key}
              </span>
              <span>{option.text}</span>
            </button>
          );
        })}
      </div>

      {reviewOpen ? (
        <ReviewGrid
          questions={questions}
          answers={answers}
          currentIndex={index}
          onJump={(i) => {
            setIndex(i);
            setReviewOpen(false);
          }}
        />
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={index === 0}
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 disabled:opacity-40"
        >
          上一題
        </button>
        <button
          type="button"
          onClick={() => setReviewOpen((open) => !open)}
          className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800"
        >
          {reviewOpen ? "收起覆覽" : "覆覽欄"}
        </button>
        {index < questions.length - 1 ? (
          <button
            type="button"
            onClick={() => setIndex((i) => Math.min(questions.length - 1, i + 1))}
            className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
          >
            下一題
          </button>
        ) : (
          <button
            type="button"
            onClick={requestSubmit}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            交卷
          </button>
        )}
        {index < questions.length - 1 ? (
          <button
            type="button"
            onClick={requestSubmit}
            className="ml-auto rounded-lg border border-teal-600 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
          >
            交卷
          </button>
        ) : null}
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
            <p className="text-base font-semibold text-slate-900">尚未全部作答</p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              仍有 {unanswered} 題未答。未答會當錯。確定交卷？
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                繼續作答
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmOpen(false);
                  setSubmitted(true);
                }}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white"
              >
                確定交卷
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function QuestionBody({ question }: { question: BodyMcQuestion }) {
  return (
    <div className="mt-6">
      <p className="text-xs font-medium tracking-wide text-violet-600">{question.source}</p>
      <p className="mt-2 text-base leading-7 font-medium text-slate-900">{question.stem}</p>
      {question.figure ? (
        <div className="mt-4">
          <McFigureView figure={question.figure} />
        </div>
      ) : null}
      {question.statements ? (
        <ol className="mt-4 space-y-1 text-sm leading-6 text-slate-700">
          {question.statements.map((item, i) => (
            <li key={i}>
              ({i + 1}) {item}
            </li>
          ))}
        </ol>
      ) : null}
    </div>
  );
}

function ReviewGrid({
  questions,
  answers,
  currentIndex,
  onJump,
}: {
  questions: BodyMcQuestion[];
  answers: Record<string, McKey>;
  currentIndex: number;
  onJump: (index: number) => void;
}) {
  return (
    <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/60 p-4">
      <p className="text-xs font-medium text-violet-700">覆覽欄 · 點題號跳轉</p>
      <div className="mt-3 grid grid-cols-5 gap-2 sm:grid-cols-8">
        {questions.map((q, i) => {
          const answered = Boolean(answers[q.id]);
          const current = i === currentIndex;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onJump(i)}
              className={`h-9 rounded-lg text-sm font-medium ${
                current
                  ? "bg-violet-700 text-white"
                  : answered
                    ? "bg-teal-100 text-teal-800"
                    : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ResultView({
  questions,
  answers,
  minutes,
  remaining,
  onRetry,
}: {
  questions: BodyMcQuestion[];
  answers: Record<string, McKey>;
  minutes: number;
  remaining: number;
  onRetry: () => void;
}) {
  const correct = questions.filter((q) => answers[q.id] === q.answer).length;
  const used = minutes * 60 - remaining;
  const percent = Math.round((correct / questions.length) * 100);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-violet-800">練習結果</h2>
      <div className="mt-2 h-1 w-16 rounded-full bg-violet-700" />
      <div className="mt-6 rounded-2xl bg-teal-500 px-6 py-6 text-white">
        <p className="text-sm text-teal-50">人體選擇題</p>
        <p className="mt-1 text-4xl font-semibold">
          {correct} / {questions.length}
        </p>
        <p className="mt-2 text-sm text-teal-50">
          正確率 {percent}% · 用時 {formatTime(used)}
        </p>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800"
        >
          再做一次（重新打亂）
        </button>
        <Link
          href="/pe"
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          返回選題
        </Link>
      </div>

      <ol className="mt-8 space-y-6">
        {questions.map((question, i) => {
          const picked = answers[question.id];
          const ok = picked === question.answer;
          return (
            <li key={question.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium text-violet-600">
                  第 {i + 1} 題 · {question.source}
                </p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    ok ? "bg-teal-50 text-teal-700" : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {ok ? "正確" : picked ? "錯誤" : "未答"}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 font-medium text-slate-900">{question.stem}</p>
              {question.figure ? (
                <div className="mt-3">
                  <McFigureView figure={question.figure} />
                </div>
              ) : null}
              {question.statements ? (
                <ol className="mt-3 space-y-1 text-sm text-slate-700">
                  {question.statements.map((item, si) => (
                    <li key={si}>
                      ({si + 1}) {item}
                    </li>
                  ))}
                </ol>
              ) : null}
              <ul className="mt-3 space-y-1.5 text-sm">
                {question.options.map((option) => {
                  const isAnswer = option.key === question.answer;
                  const isPicked = option.key === picked;
                  return (
                    <li
                      key={option.key}
                      className={`rounded-lg px-3 py-2 ${
                        isAnswer
                          ? "bg-teal-50 text-teal-900"
                          : isPicked
                            ? "bg-rose-50 text-rose-900"
                            : "text-slate-600"
                      }`}
                    >
                      <span className="font-semibold">{option.key}.</span> {option.text}
                      {isAnswer ? "（正確）" : isPicked ? "（你的選擇）" : ""}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950">
                <span className="font-semibold">解釋：</span>
                {question.explain}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
