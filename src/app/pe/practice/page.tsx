import { PracticeQuiz } from "@/components/pe/practice-quiz";

export default async function PePracticePage({
  searchParams,
}: {
  searchParams: Promise<{ n?: string; seed?: string }>;
}) {
  const params = await searchParams;
  const n = Number(params.n) || 20;
  const seed = Number(params.seed) || Date.now();
  return <PracticeQuiz key={`${n}-${seed}`} n={n} seed={seed} />;
}
