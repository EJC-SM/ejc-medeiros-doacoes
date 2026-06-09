import { getCategorias } from '../state/store';
import type { CategoriaCatalogo, Doacao, Etapa, ItemCatalogo } from '../state/types';

function escapeCsvCell(value: unknown): string {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }
  text = text.replace(/"/g, '""');
  if (/[;,"\n\r]/.test(text)) {
    return `"${text}"`;
  }
  return text;
}

function rowsToCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
}

export function exportEtapaCsv(etapa: Etapa, doacoes: Doacao[]): void {
  const header = [
    'Nome',
    'Equipe',
    'Telefone',
    'Data do Registro',
    'Item Doado',
    'Quantidade',
    'Unidade',
    'Status Entrega',
    'Data de Entrega',
    'Ocasiao da Entrega',
  ];
  const rows: unknown[][] = [header];

  for (const d of doacoes) {
    const status = d.entregue ? 'Entregue' : 'Pendente';
    const dataEnt = d.entregue?.data || '';
    const ocasiao = d.entregue?.ocasiao || '';
    for (const item of d.itens) {
      rows.push([
        d.nome,
        d.equipe,
        d.telefone || '',
        d.data,
        item.nome,
        item.quantidade,
        item.unidade,
        status,
        dataEnt,
        ocasiao,
      ]);
    }
  }

  downloadCsv(`EJC_Doacoes_Etapa${etapa}_${dateStamp()}.csv`, rows);
}

export function exportBackupCsv(doacoesByEtapa: Record<Etapa, Doacao[]>, itens: ItemCatalogo[]): void {
  const cats = getCategorias();

  const dataHeader = [
    'Etapa',
    'Nome',
    'Equipe',
    'Telefone',
    'Data do Registro',
    'Item Doado',
    'Quantidade',
    'Unidade',
    'Status Entrega',
    'Data de Entrega',
    'Ocasiao da Entrega',
  ];
  const dataRows: unknown[][] = [dataHeader];

  for (const etapa of [1, 2] as Etapa[]) {
    for (const d of doacoesByEtapa[etapa]) {
      const status = d.entregue ? 'Entregue' : 'Pendente';
      const dataEnt = d.entregue?.data || '';
      const ocasiao = d.entregue?.ocasiao || '';
      for (const item of d.itens) {
        dataRows.push([
          `${etapa}a Etapa`,
          d.nome,
          d.equipe,
          d.telefone || '',
          d.data,
          item.nome,
          item.quantidade,
          item.unidade,
          status,
          dataEnt,
          ocasiao,
        ]);
      }
    }
  }

  const equipeRows: unknown[][] = [
    ['=== RESUMO POR EQUIPE ==='],
    [
      '',
      'Etapa',
      'Equipe',
      'Total de Registros',
      'Total de Itens',
      'Itens Entregues',
      'Itens Pendentes',
      '% do Total',
    ],
  ];

  for (const etapa of [1, 2] as Etapa[]) {
    const dados = doacoesByEtapa[etapa];
    const totalItensGeral = dados.reduce((acc, d) => acc + d.itens.length, 0);
    const porEquipe = new Map<string, { registros: number; itens: number; entregues: number }>();

    for (const d of dados) {
      const eq = d.equipe || 'Sem equipe';
      const current = porEquipe.get(eq) || { registros: 0, itens: 0, entregues: 0 };
      current.registros += 1;
      current.itens += d.itens.length;
      if (d.entregue) current.entregues += d.itens.length;
      porEquipe.set(eq, current);
    }

    const equipes = [...porEquipe.entries()].sort((a, b) => b[1].itens - a[1].itens);
    for (const [eq, stats] of equipes) {
      const pct = totalItensGeral > 0 ? `${Math.round((stats.itens / totalItensGeral) * 100)}%` : '0%';
      equipeRows.push([
        '',
        `${etapa}a Etapa`,
        eq,
        stats.registros,
        stats.itens,
        stats.entregues,
        stats.itens - stats.entregues,
        pct,
      ]);
    }
    equipeRows.push(['']);
  }

  const itemRows: unknown[][] = [
    ['=== RESUMO POR ITEM ==='],
    ['', 'Etapa', 'Item', 'Unidade', 'Categoria', 'Total Prometido', 'Meta', '% da Meta'],
  ];

  for (const etapa of [1, 2] as Etapa[]) {
    const dados = doacoesByEtapa[etapa];
    const porItem = new Map<string, number>();
    for (const d of dados) {
      for (const item of d.itens) {
        porItem.set(item.nome, (porItem.get(item.nome) || 0) + item.quantidade);
      }
    }

    for (const [nome, total] of [...porItem.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      const catalog = itens.find((i) => i.nome === nome);
      const cat = cats.find((c: CategoriaCatalogo) => c.id === catalog?.cat);
      const meta = catalog?.meta || 0;
      const pctMeta = meta > 0 ? `${Math.round((total / meta) * 100)}%` : '-';
      itemRows.push([
        '',
        `${etapa}a Etapa`,
        nome,
        catalog?.unidade || '',
        cat ? cat.nome : '',
        total,
        meta || '',
        pctMeta,
      ]);
    }
    itemRows.push(['']);
  }

  const csv = `\uFEFF${rowsToCsv(dataRows)}\r\n\r\n${rowsToCsv(equipeRows)}\r\n\r\n${rowsToCsv(itemRows)}`;
  triggerDownload(`EJC_Backup_Completo_${dateStamp()}.csv`, csv);
}

function dateStamp(): string {
  return new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
}

function downloadCsv(filename: string, rows: unknown[][]): void {
  triggerDownload(filename, `\uFEFF${rowsToCsv(rows)}`);
}

function triggerDownload(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
