import { Injectable, signal } from '@angular/core';
import { SheetNames } from '../resources/SheetNames';
import { RowNames } from '../resources/RowNames';

import * as XLSX from 'xlsx';

interface BookkeepingRow {
  [RowNames.Date]: string;
  [RowNames.Amount]: number;
  [RowNames.Issuer]: string;
}

@Injectable({
  providedIn: 'root',
})
export class BookkeepingCheckerService {
  file: File | null = null;
  bookkeepingSheet = signal<BookkeepingRow[]>([]);
  bookkeepingDateMap = signal<Map<string, BookkeepingRow[]>>(new Map());
  bankSheet = signal<BookkeepingRow[]>([]);
  bankDateMap = signal<Map<string, BookkeepingRow[]>>(new Map());
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

      this.bookkeepingSheet.set(bookkeepingNormalizedRows[0]);
      this.bookkeepingDateMap.set(bookkeepingNormalizedRows[1]);
      this.bankSheet.set(bankNormalizedRows[0]);
      this.bankDateMap.set(bankNormalizedRows[1]);

      //this.findMatches(workBook);
      this.HandleSummation(workBook);

      console.log(this.bookkeepingSheet());
      console.log(this.bankSheet());

      this.CreateNewDocument(file);
    };

    reader.readAsArrayBuffer(file);
  }

  getSheetNormalizeRows(
    workbook: XLSX.WorkBook,
    sheetName: string
  ): [BookkeepingRow[], Map<string, BookkeepingRow[]>] {
    const sheet = workbook.Sheets[sheetName];

    const rawRows = XLSX.utils.sheet_to_json<BookkeepingRow>(sheet, {
      defval: '',
      raw: false,
    });

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

  HandleSummation(workBook: XLSX.WorkBook) {
    let bankDates = this.bankDateMap();
    let bookkeepingDates = this.bookkeepingDateMap();
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
        console.log('prevmatches');
        console.log(prevMatches);
        console.log(matches);
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
    this.bookkeepingSheet.set(remainingBookkeepingSheet);
    this.bankSheet.set(remainingBankSheet);
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
