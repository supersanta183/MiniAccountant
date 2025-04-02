import { Injectable, signal } from '@angular/core';
import { SheetNames } from '../resources/SheetNames';
import { RowNames } from '../resources/RowNames';
import { ExcelSheet, BookkeepingRow } from '../resources/Models/ExcelSheet';

import * as XLSX from 'xlsx';

@Injectable({
  providedIn: 'root',
})
export class BookkeepingCheckerService {
  file: File | null = null;

  // A list of all bookkeeping entries
  bookkeepingSheet = signal<ExcelSheet>({
    rows: [],
    dateMap: new Map(),
  });
  bankSheet = signal<ExcelSheet>({
    rows: [],
    dateMap: new Map(),
  });

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

      const bookkeepingSheet = this.bookkeepingSheet();
      const bankSheet = this.bankSheet();
      bookkeepingSheet.rows = bookkeepingNormalizedRows[0];
      bankSheet.rows = bankNormalizedRows[0];

      const bookkeepingDateMap = this.CreateDateMap(bookkeepingSheet);
      const bankDateMap = this.CreateDateMap(bankSheet);

      bookkeepingSheet.dateMap = bookkeepingDateMap;
      bankSheet.dateMap = bankDateMap;

      this.bookkeepingSheet.set(bookkeepingSheet);
      this.bankSheet.set(bankSheet);

      this.HandleSummation(workBook);

      this.CreateNewDocument(file);
    };

    reader.readAsArrayBuffer(file);
  }

  // normalizes all rows with lower case names
  NormalizeRows(
    workbook: XLSX.WorkBook,
    sheetName: string
  ): [BookkeepingRow[], Map<string, BookkeepingRow[]>] {
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

    let dateTransfers: Map<string, BookkeepingRow[]> = new Map();
    rows.forEach((row) => {
      const date = row[RowNames.Date];
      if (!dateTransfers.has(date)) {
        dateTransfers.set(date, []);
      }
      dateTransfers.get(date)!.push(row);
    });

    return [rows, dateTransfers];
  }

  CreateDateMap(sheet: ExcelSheet): Map<string, BookkeepingRow[]> {
    let dateTransfers: Map<string, BookkeepingRow[]> = new Map();
    sheet.rows.forEach((row) => {
      const date = row[RowNames.Date];
      if (!dateTransfers.has(date)) {
        dateTransfers.set(date, []);
      }
      dateTransfers.get(date)!.push(row);
    });

    return dateTransfers;
  }

  CreateNewDocument(file: File) {
    const matchesSheet = XLSX.utils.json_to_sheet(this.matchedRows());
    const bookkeepingSheet = XLSX.utils.json_to_sheet(
      this.bookkeepingSheet().rows
    );
    const bankSheet = XLSX.utils.json_to_sheet(this.bankSheet().rows);

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

  HandleSummation(workBook: XLSX.WorkBook) {
    let bankDates = this.bankSheet().dateMap;
    let bookkeepingDates = this.bookkeepingSheet().dateMap;
    let remainingBookkeepingSheet: BookkeepingRow[] = [];
    let remainingBankSheet: BookkeepingRow[] = [];
    let matches: BookkeepingRow[] = [];
    let associatedBookkeeping: BookkeepingRow[] | undefined = [];
    let associatedBanking: BookkeepingRow[] = [];

    bankDates.forEach((value, key) => {
      associatedBookkeeping = bookkeepingDates.get(key);
      associatedBanking = value;

      //get total amount for date
      let bankCount: number = 0;
      value.forEach((row) => {
        bankCount = bankCount + row[RowNames.Amount];
      });

      const newRow: BookkeepingRow = {
        [RowNames.Date]: key,
        [RowNames.Amount]: bankCount,
        [RowNames.Issuer]: 'System',
      };

      if (associatedBookkeeping === undefined) {
        remainingBookkeepingSheet.push(newRow);
      } else {
        // find matches
        const result = this.handleFindMatches(
          associatedBookkeeping,
          associatedBanking
        );
        const prevMatches = matches;
        matches = [...prevMatches, ...result[0]];

        //sum up bookkeeping results
        associatedBookkeeping = result[1];
        let bookkeepingCount: number = 0;
        associatedBookkeeping.forEach((row) => {
          bookkeepingCount = bookkeepingCount + row[RowNames.Amount];
        });

        const diff = bankCount - bookkeepingCount;
        if (bookkeepingCount === bankCount) {
          remainingBookkeepingSheet = [
            ...remainingBookkeepingSheet,
            ...associatedBookkeeping,
          ];
        } else if (diff !== 0) {
          const amount = bankCount - bookkeepingCount;
          const newRow: BookkeepingRow = {
            [RowNames.Date]: key,
            [RowNames.Amount]: diff,
            [RowNames.Issuer]: 'System',
          };

          remainingBookkeepingSheet.push(newRow);
        }

        associatedBookkeeping.forEach((row) => {
          remainingBookkeepingSheet.push(row);
        });
      }
      remainingBankSheet.push(newRow);
    });

    const prev = this.bookkeepingSheet();
    this.bookkeepingSheet.set({
      ...prev,
      rows: remainingBookkeepingSheet,
    });

    this.matchedRows.set(matches);
  }

  handleFindMatches(
    associatedBookkeepingSheet: BookkeepingRow[],
    associatedBankSheet: BookkeepingRow[]
  ): [BookkeepingRow[], BookkeepingRow[]] {
    let matches: BookkeepingRow[] = [];
    associatedBankSheet.forEach((bankRow, index) => {
      const matchIndex = associatedBookkeepingSheet.findIndex(
        (bookRow) => bookRow[RowNames.Amount] === bankRow[RowNames.Amount]
      );

      if (matchIndex !== -1) {
        console.log('match');
        // Found a match
        matches.push(bankRow);

        console.log(matches);

        // Remove matched bookkeeping row so it doesn't get reused
        associatedBookkeepingSheet.splice(matchIndex, 1);
      }
    });

    return [matches, associatedBookkeepingSheet];
  }
}
