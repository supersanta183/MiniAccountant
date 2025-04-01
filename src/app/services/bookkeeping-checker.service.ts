import { Injectable, signal } from '@angular/core';
import { SheetNames } from '../resources/sheetNames';
import { RowNames } from '../resources/RowNames';

import * as XLSX from 'xlsx';

interface BookkeepingRow {
  [RowNames.Date]: string;
  [RowNames.Amount]: number;
}

@Injectable({
  providedIn: 'root',
})
export class BookkeepingCheckerService {
  file: File | null = null;
  bookkeepingSheet = signal<BookkeepingRow[]>([]);
  bankSheet = signal<BookkeepingRow[]>([]);
  matchedRows = signal<BookkeepingRow[]>([]);

  CheckBookKeeping(file: File) {
    const reader = new FileReader();
    reader.onload = (e: any) => {
      const data = new Uint8Array(e.target.result);
      const workBook = XLSX.read(data, { type: 'array' });

      var bookkeepingNormalizedRows = this.getSheetNormalizeRows(
        workBook,
        SheetNames.BookKeeping
      );

      var bankNormalizedRows = this.getSheetNormalizeRows(
        workBook,
        SheetNames.Bank
      );

      this.bookkeepingSheet.set(bookkeepingNormalizedRows);
      this.bankSheet.set(bankNormalizedRows);

      this.findMatches(workBook);

      this.CreateNewDocument(file);
    };

    reader.readAsArrayBuffer(file);
  }

  getSheetNormalizeRows(
    workbook: XLSX.WorkBook,
    sheetName: string
  ): BookkeepingRow[] {
    const sheet = workbook.Sheets[sheetName];

    const rawRows = XLSX.utils.sheet_to_json<BookkeepingRow>(sheet, {
      defval: '',
      raw: false,
    });

    const rows = rawRows.map((row) => {
      const normalizedRow: any = {};

      Object.entries(row).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase().trim();
        normalizedRow[lowerKey] = value;
      });

      return normalizedRow as BookkeepingRow;
    });

    return rows;
  }

  findMatches(workBook: XLSX.WorkBook) {
    let remainingBookkeepingSheet: BookkeepingRow[] = this.bookkeepingSheet();
    let remainingBankSheet: BookkeepingRow[] = [];
    let matches: BookkeepingRow[] = [];

    this.bankSheet().forEach((bankRow) => {
      const matchIndex = remainingBookkeepingSheet.findIndex(
        (b) =>
          b[RowNames.Amount] === bankRow[RowNames.Amount] &&
          b[RowNames.Date] === bankRow[RowNames.Date]
      );

      if (!(matchIndex === -1)) {
        matches.push(bankRow);
        remainingBookkeepingSheet.splice(matchIndex, 1);
      } else {
        remainingBankSheet.push(bankRow);
      }
    });

    this.bookkeepingSheet.set(remainingBookkeepingSheet);
    this.bankSheet.set(remainingBankSheet);
    this.matchedRows.set(matches);
  }

  CreateNewDocument(file: File) {
    const matchesSheet = XLSX.utils.json_to_sheet(this.matchedRows());
    const bookkeepingSheet = XLSX.utils.json_to_sheet(this.bookkeepingSheet());
    const bankSheet = XLSX.utils.json_to_sheet(this.bankSheet());

    let newWorkbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(newWorkbook, matchesSheet, SheetNames.Matches);
    XLSX.utils.book_append_sheet(
      newWorkbook,
      bookkeepingSheet,
      SheetNames.BookKeeping
    );
    XLSX.utils.book_append_sheet(newWorkbook, bankSheet, SheetNames.Bank);

    XLSX.writeFile(newWorkbook, file.name);
  }
}
