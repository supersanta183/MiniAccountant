import { Injectable, signal } from '@angular/core';
import { SheetNames } from '../resources/SheetNames';
import { RowNames } from '../resources/RowNames';
import { ExcelSheet } from '../resources/Models/ExcelSheet';
import { BookkeepingRow } from '../resources/Models/BookkeepingRow';
import { BookkeepingFile } from '../resources/Models/BookkeepingFile';

import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root',
})
export class BookkeepingCheckerService {
  file: File | null = null;

  // A list of all bookkeeping entries
  bookkeepingSheet = signal<ExcelSheet>(new ExcelSheet([]));
  bankSheet = signal<ExcelSheet>(new ExcelSheet([]));
  bookkeepingFile = signal<BookkeepingFile>(
    new BookkeepingFile(new ExcelSheet([]), new ExcelSheet([]))
  );

  // A list of exact matches in the bookkeeping sheet and the bank sheet
  matchedRows = signal<BookkeepingRow[]>([]);

  HandleBookkeeping(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workBook = XLSX.read(data, { type: 'array' });

      const bookkeepingNormalizedRows = this.NormalizeRows(
        workBook,
        SheetNames.BookKeeping
      );
      const bankNormalizedRows = this.NormalizeRows(workBook, SheetNames.Bank);

      this.bookkeepingSheet.set(new ExcelSheet(bookkeepingNormalizedRows));
      this.bankSheet.set(new ExcelSheet(bankNormalizedRows));

      const bookkeepingFile = new BookkeepingFile(
        this.bookkeepingSheet(),
        this.bankSheet()
      );
      this.bookkeepingFile.set(bookkeepingFile);

      //performs all operations on the file
      this.bookkeepingFile().Handle();

      //create the new excel file and download it
      this.bookkeepingFile().TryGetFile(file);
    };

    reader.readAsArrayBuffer(file);
  }

  // normalizes all rows with lower case names
  NormalizeRows(workbook: XLSX.WorkBook, sheetName: string): BookkeepingRow[] {
    const sheet = workbook.Sheets[sheetName];

    // A list of all rows in the sheet
    const rawRows = XLSX.utils.sheet_to_json<BookkeepingRow>(sheet, {
      defval: '',
      raw: false,
    });

    // A list of all rows in the sheet with normalized keys
    const rows = rawRows.map((row) => {
      const normalizedRow: any = {};

      Object.entries(row).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase().trim();

        if (lowerKey === RowNames.Amount) {
          normalizedRow[lowerKey] = parseFloat(value.replace(/,/g, ''));
        } else {
          normalizedRow[lowerKey] = value;
        }
      });

      return normalizedRow as BookkeepingRow;
    });

    return rows;
  }
}
