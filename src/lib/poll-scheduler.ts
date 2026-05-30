type PollEntry = {
  intervalMs: number;
  timerId: number | null;
  inFlight: boolean;
  refCount: number;
  run: () => Promise<void>;
};

const polls = new Map<string, PollEntry>();

async function executePoll(key: string) {
  const entry = polls.get(key);
  if (!entry || entry.inFlight || document.visibilityState === "hidden") return;

  entry.inFlight = true;
  try {
    await entry.run();
  } finally {
    entry.inFlight = false;
  }
}

function startTimer(key: string) {
  const entry = polls.get(key);
  if (!entry || entry.timerId) return;

  entry.timerId = window.setInterval(() => {
    void executePoll(key);
  }, entry.intervalMs);
}

function stopTimer(key: string) {
  const entry = polls.get(key);
  if (!entry?.timerId) return;
  window.clearInterval(entry.timerId);
  entry.timerId = null;
}

export function subscribePoll(
  key: string,
  run: () => Promise<void>,
  intervalMs: number,
  skipInitial = false
): () => void {
  let entry = polls.get(key);

  if (!entry) {
    entry = {
      intervalMs,
      timerId: null,
      inFlight: false,
      refCount: 0,
      run,
    };
    polls.set(key, entry);
    startTimer(key);
    if (!skipInitial) void executePoll(key);
  } else {
    entry.run = run;
    entry.intervalMs = intervalMs;
  }

  entry.refCount += 1;

  return () => {
    const current = polls.get(key);
    if (!current) return;
    current.refCount -= 1;
    if (current.refCount <= 0) {
      stopTimer(key);
      polls.delete(key);
    }
  };
}

export function bumpPoll(key: string) {
  void executePoll(key);
}
