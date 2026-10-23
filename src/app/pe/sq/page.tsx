import { redirect } from "next/navigation";
import { SqQuiz } from "@/components/pe/sq-quiz";

function randomSeed() {
  return Math.floor(Math.random() * 1_000_000_000);
}

export default async function PeSqPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string; n?: string; seed?: string }>;
}) {
  const params = await searchParams;
  const unit = Number(params.unit) || 0;
  const n = Number(params.n) || 2;
  const seed = Number(params.seed);
  if (!Number.isFinite(seed) || seed <= 0) {
    const next = new URLSearchParams();
    next.set("unit", String(unit));
    next.set("n", String(n));
    next.set("seed", String(randomSeed()));
    redirect(`/pe/sq?${next.toString()}`);
  }
  return <SqQuiz key={`${unit}-${n}-${seed}`} unit={unit} n={n} seed={seed} />;
}
