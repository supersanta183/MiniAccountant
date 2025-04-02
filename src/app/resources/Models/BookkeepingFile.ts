import { signal } from '@angular/core';
import { ExcelSheet } from './ExcelSheet';
import { BookkeepingRow, CreateBookkeepingRow } from './BookkeepingRow';
import { RowNames } from '../RowNames';
import { SheetNames } from '../SheetNames';

import * as XLSX from 'xlsx';

export class BookkeepingFile {
  public bookkeepingSheet = signal<ExcelSheet>(new ExcelSheet([]));
  public bankSheet = signal<ExcelSheet>(new ExcelSheet([]));
  public matches = signal<ExcelSheet>(new ExcelSheet([]));

  constructor(bookkeepingSheet: ExcelSheet, bankSheet: ExcelSheet) {
    this.bookkeepingSheet.set(bookkeepingSheet);
    this.bankSheet.set(bankSheet);
  }

  public Handle() {
    let remainingBookkeepingSheet: BookkeepingRow[] = [];

    this.bankSheet()
      .dateMap()
      .forEach((rows, date) => {
        let associatedBookkeepingTransactions = this.bookkeepingSheet()
          .dateMap()
          .get(date);

        const bankSum = this.bankSheet().GetSumForDate(date);
        const newRow = CreateBookkeepingRow(date, bankSum, 'System');

        //check if any transactions are available for date
        if (associatedBookkeepingTransactions === undefined) {
          remainingBookkeepingSheet.push(newRow);
        } else {
          // if transactions are available, check matches and then adjust sum difference in bookkeeping sheet
          this.FindAllMatchesForDate(date);

          const bookkeepingSum = this.bookkeepingSheet().GetSumForDate(date);
          const diff = bankSum - bookkeepingSum;
          if (diff === 0) {
            remainingBookkeepingSheet = [
              ...remainingBookkeepingSheet,
              ...associatedBookkeepingTransactions,
            ];
          } else if (diff !== 0) {
            const newRow = CreateBookkeepingRow(date, diff, 'System');
            remainingBookkeepingSheet.push(newRow);
          }

          associatedBookkeepingTransactions.forEach((row) =>
            remainingBookkeepingSheet.push(row)
          );
        }
      });

    this.bookkeepingSheet().SetRows(remainingBookkeepingSheet);
  }

  public FindAllMatchesForDate(date: string) {
    this.FindExactMatchesForDate(date);
    this.FindPartialMatchesForDate(date);
  }

  public FindExactMatchesForDate(date: string) {
    let associatedBankTransactions = this.bankSheet().dateMap().get(date);
    let associatedBookkeepingTransactions = this.bookkeepingSheet()
      .dateMap()
      .get(date);

    if (
      associatedBankTransactions === undefined ||
      associatedBookkeepingTransactions === undefined
    ) {
      return;
    }
    associatedBankTransactions.forEach((bankRow, index) => {
      const matchIndex = associatedBookkeepingTransactions.findIndex(
        (bookRow) => bookRow[RowNames.Amount] === bankRow[RowNames.Amount]
      );

      if (matchIndex !== -1) {
        this.matches().PushRow(bankRow);
        associatedBookkeepingTransactions.splice(matchIndex, 1);
        associatedBankTransactions.splice(index, 1);
      }
    });
    this.bookkeepingSheet().SetDateMapValue(
      date,
      associatedBookkeepingTransactions
    );
    this.bankSheet().SetDateMapValue(date, associatedBankTransactions);
  }

  public FindPartialMatchesForDate(date: string) {}

  public CheckBookkeepingSums() {}

  public TryGetFile(file: File) {
    const matchesSheet = XLSX.utils.json_to_sheet(this.matches().rows());
    const bookkeepingSheet = XLSX.utils.json_to_sheet(
      this.bookkeepingSheet().rows()
    );
    const bankSheet = XLSX.utils.json_to_sheet(this.bankSheet().rows());

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

  public UpdateBookkeepingSheet(sheet: ExcelSheet) {
    this.bookkeepingSheet.set(sheet);
  }

  public UpdateBankSheet(sheet: ExcelSheet) {
    this.bankSheet.set(sheet);
  }
}
