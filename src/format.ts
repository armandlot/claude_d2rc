export function formatIst(value: number): string {
  if (value === 0) return "0";
  if (Math.abs(value) < 0.01) return value.toFixed(4);
  if (Math.abs(value) < 1) return value.toFixed(2);
  return value.toFixed(value < 10 ? 2 : 1);
}

export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(h ? 2 : 1, "0");
  const ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)} %`;
}
