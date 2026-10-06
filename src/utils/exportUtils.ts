// Helper to export tabular data to UTF-8 CSV compatible with Excel

export function exportToCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const processCell = (val: string | number | undefined | null): string => {
    if (val === undefined || val === null) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows: string[] = [];
  csvRows.push(headers.map(processCell).join(','));

  for (const row of rows) {
    csvRows.push(row.map(processCell).join(','));
  }

  // Prepend \uFEFF BOM for Excel Arabic character support
  const csvString = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
