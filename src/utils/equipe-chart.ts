import type { Doacao } from '../state/types';

const CHART_COLORS = [
  '#C8963E',
  '#4A7C59',
  '#3D2B1F',
  '#E8B96A',
  '#6AAF82',
  '#8B5A2B',
  '#A3C4A8',
  '#D4A96A',
  '#2D6A4F',
  '#B5838D',
  '#6D6875',
  '#E07A5F',
  '#81B29A',
  '#F2CC8F',
  '#3D405B',
];

export interface EquipeChartSlice {
  equipe: string;
  value: number;
  color: string;
  percent: number;
}

export function buildEquipeChartData(doacoes: Doacao[]): EquipeChartSlice[] {
  const porEquipe = new Map<string, number>();

  for (const doacao of doacoes) {
    const equipe = doacao.equipe?.trim() || 'Sem equipe';
    porEquipe.set(equipe, (porEquipe.get(equipe) || 0) + doacao.itens.length);
  }

  const entries = [...porEquipe.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((acc, [, value]) => acc + value, 0);
  if (total === 0) return [];

  return entries.map(([equipe, value], index) => ({
    equipe,
    value,
    color: CHART_COLORS[index % CHART_COLORS.length],
    percent: Math.round((value / total) * 100),
  }));
}

function createSlicePath(
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
): string {
  const x1 = cx + radius * Math.cos(startAngle);
  const y1 = cy + radius * Math.sin(startAngle);
  const x2 = cx + radius * Math.cos(endAngle);
  const y2 = cy + radius * Math.sin(endAngle);
  const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`;
}

function appendSlice(
  svg: SVGSVGElement,
  cx: number,
  cy: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  color: string,
): void {
  const angle = endAngle - startAngle;
  const fullCircle = angle >= 2 * Math.PI - 1e-6;

  if (fullCircle) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', String(cx));
    circle.setAttribute('cy', String(cy));
    circle.setAttribute('r', String(radius));
    circle.setAttribute('fill', color);
    circle.setAttribute('stroke', '#ffffff');
    circle.setAttribute('stroke-width', '2.5');
    svg.appendChild(circle);
    return;
  }

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('d', createSlicePath(cx, cy, radius, startAngle, endAngle));
  path.setAttribute('fill', color);
  path.setAttribute('stroke', '#ffffff');
  path.setAttribute('stroke-width', '2.5');
  svg.appendChild(path);
}

export function renderEquipePieChart(
  chartHost: HTMLElement,
  legendHost: HTMLElement,
  doacoes: Doacao[],
  emptyMessage = 'Nenhuma doacao ainda.',
): void {
  chartHost.replaceChildren();
  legendHost.replaceChildren();

  const slices = buildEquipeChartData(doacoes);
  if (!slices.length) {
    const empty = document.createElement('p');
    empty.className = 'equipe-chart-empty';
    empty.textContent = emptyMessage;
    chartHost.appendChild(empty);
    return;
  }

  const total = slices.reduce((acc, slice) => acc + slice.value, 0);
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 240 240');
  svg.classList.add('equipe-chart-svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Grafico de doacoes por equipe');

  const cx = 120;
  const cy = 120;
  const radius = 108;
  let startAngle = -Math.PI / 2;

  for (const slice of slices) {
    const angle = (slice.value / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;

    appendSlice(svg, cx, cy, radius, startAngle, endAngle, slice.color);

    if (slice.percent >= 5) {
      const midAngle = startAngle + angle / 2;
      const labelX = cx + radius * 0.62 * Math.cos(midAngle);
      const labelY = cy + radius * 0.62 * Math.sin(midAngle) + 4;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', String(labelX));
      text.setAttribute('y', String(labelY));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '11');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', '#ffffff');
      text.textContent = `${slice.percent}%`;
      svg.appendChild(text);
    }

    startAngle = endAngle;
  }

  chartHost.appendChild(svg);

  for (const slice of slices) {
    const item = document.createElement('div');
    item.className = 'equipe-chart-legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'equipe-chart-swatch';
    swatch.style.backgroundColor = slice.color;

    const label = document.createElement('span');
    const strong = document.createElement('strong');
    strong.textContent = slice.equipe;
    label.appendChild(strong);
    label.append(` — ${slice.value} itens (${slice.percent}%)`);

    item.appendChild(swatch);
    item.appendChild(label);
    legendHost.appendChild(item);
  }
}
