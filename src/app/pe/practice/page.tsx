import { redirect } from "next/navigation";
import { PracticeQuiz } from "@/components/pe/practice-quiz";

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}

export default async function PePracticePage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string; unit?: string; n?: string; seed?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "exam" ? "exam" : "practice";
  const unit = Number(params.unit) || 2;
  const n = Number(params.n) || 20;
  const seed = Number(params.seed);
  if (!Number.isFinite(seed) || seed <= 0) {
    const next = new URLSearchParams();
    if (mode === "exam") next.set("mode", "exam");
    else {
      next.set("unit", String(unit));
      next.set("n", String(n));
    }
    next.set("seed", String(randomSeed()));
    redirect(`/pe/practice?${next.toString()}`);
  }
  return <PracticeQuiz key={`${mode}-${unit}-${n}-${seed}`} mode={mode} unit={unit} n={n} seed={seed} />;
}
