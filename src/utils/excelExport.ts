import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';

type ExcelCell = string | number | boolean | null;
type ExcelRow = Record<string, ExcelCell>;

export async function exportRowsToExcel(
  rows: readonly ExcelRow[],
  fileName = 'rapor.xlsx',
): Promise<string> {
  const worksheet = XLSX.utils.json_to_sheet([...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Rapor');

  const bytes = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const safeFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  const file = new File(Paths.cache, safeFileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(new Uint8Array(bytes));

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      dialogTitle: 'Excel raporunu paylaş',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
  }

  return file.uri;
}
