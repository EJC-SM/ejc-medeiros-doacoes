import { onCLS, onINP, onLCP } from 'web-vitals';

function report(name: string, value: number): void {
  const rounded = Math.round(value * 100) / 100;
  console.info(`[web-vitals] ${name}: ${rounded}`);
}

export function initWebVitals(): void {
  onCLS((metric) => report(metric.name, metric.value));
  onLCP((metric) => report(metric.name, metric.value));
  onINP((metric) => report(metric.name, metric.value));
}
