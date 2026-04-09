import Link from "next/link";
import { FitbSessionGate } from "@/components/fitb/FitbSessionGate";
import { FITB_DIFFICULTIES, FITB_SET_COUNT } from "@/lib/fitb-constants";
import type { FitbDifficulty, FitbRoundNum } from "@/types/fitb";

function parseRound(s: string): FitbRoundNum | undefined {
  const n = Number(s);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

function isDifficulty(s: string): s is FitbDifficulty {
  return (FITB_DIFFICULTIES as readonly string[]).includes(s);
}

export default async function FitbSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ round: string; difficulty: string; setNumber: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { round: r, difficulty: dRaw, setNumber: sRaw } = await params;
  const sp = await searchParams;
  const redeemRaw = sp.redeem;
  const redeem = redeemRaw === "1" || redeemRaw === "true";

  const round = parseRound(r);
  const difficulty = dRaw.toLowerCase();
  const setNumber = Number.parseInt(sRaw, 10);

  if (!round || !isDifficulty(difficulty) || !Number.isFinite(setNumber)) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Invalid URL.</p>
      </main>
    );
  }

  if (setNumber < 1 || setNumber > FITB_SET_COUNT) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-8">
        <p className="font-bold text-red-700">Set must be 1–{FITB_SET_COUNT}.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-4xl flex-col px-4 py-8">
      <FitbSessionGate
        round={round}
        difficulty={difficulty}
        setNumber={setNumber}
        startWithRedeem={redeem}
      />
    </main>
  );
}
