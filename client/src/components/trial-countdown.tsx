import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { formatTrialRemaining, getTrialRemainingMs } from "@/lib/trial-countdown";

interface TrialCountdownProps {
  endsAt: string | null | undefined;
  className?: string;
  expiredLabel?: string;
  /** Prefix shown before the timer, e.g. "Trial ends in" */
  prefix?: string;
}

export function TrialCountdown({
  endsAt,
  className,
  expiredLabel = "Trial ended",
  prefix,
}: TrialCountdownProps) {
  const [remainingMs, setRemainingMs] = useState(() => getTrialRemainingMs(endsAt));

  useEffect(() => {
    const tick = () => setRemainingMs(getTrialRemainingMs(endsAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [endsAt]);

  if (!endsAt || remainingMs <= 0) {
    return <span className={className}>{expiredLabel}</span>;
  }

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      {prefix ? <span>{prefix}</span> : null}
      <span className="font-mono tabular-nums tracking-tight">{formatTrialRemaining(remainingMs)}</span>
    </span>
  );
}
