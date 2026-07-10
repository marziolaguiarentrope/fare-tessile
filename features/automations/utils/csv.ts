import type { CsvRow, ParsedCsv } from './types';

function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        cell += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== '')) rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== '')) rows.push(row);

  return rows;
}

export function parseCsv(fileName: string, text: string): ParsedCsv {
  const matrix = parseCsvText(text.replace(/^\uFEFF/, ''));
  if (matrix.length === 0) {
    throw new Error('No rows found in the CSV.');
  }

  const headers = matrix[0].map((header, index) => {
    const trimmed = header.trim();
    return trimmed || `Column ${index + 1}`;
  });

  if (headers.length === 0) {
    throw new Error('No headers found in the CSV.');
  }

  const rows: CsvRow[] = matrix.slice(1).map((values) => {
    return headers.reduce<CsvRow>((record, header, index) => {
      record[header] = values[index]?.trim() ?? '';
      return record;
    }, {});
  });

  if (rows.length === 0) {
    throw new Error('No data rows found in the CSV.');
  }

  return { headers, rows, fileName };
}

export async function parseCsvFile(file: File): Promise<ParsedCsv> {
  if (!file.name.toLowerCase().endsWith('.csv')) {
    throw new Error('Please upload a .csv file.');
  }

  return parseCsv(file.name, await file.text());
}

export function escapeCsvCell(value: unknown): string {
  const text = String(value ?? '');
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

export function exportRowsToCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';

  const headers = Array.from(rows.reduce<Set<string>>((set, row) => {
    Object.keys(row).forEach((key) => set.add(key));
    return set;
  }, new Set<string>()));

  return [
    headers.map(escapeCsvCell).join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ].join('\n');
}

export function downloadCsv(fileName: string, rows: Record<string, unknown>[]) {
  const csv = exportRowsToCsv(rows);
  const blob = new Blob([csv || 'No rows\n'], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

