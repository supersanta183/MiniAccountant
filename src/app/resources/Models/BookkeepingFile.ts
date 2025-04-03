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

        //check if any transactions are available for date
        if (associatedBookkeepingTransactions === undefined) {
          const bankSum = this.bankSheet().GetSumForDate(date);
          const newRow = CreateBookkeepingRow(date, bankSum, 'System');
          remainingBookkeepingSheet.push(newRow);
        } else {
          // if transactions are available, check matches and then adjust sum difference in bookkeeping sheet
          this.FindAllMatchesForDate(date);
          this.bookkeepingSheet().RefreshRows();
          this.bankSheet().RefreshRows();

          const bankSum = this.bankSheet().GetSumForDate(date);
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
    console.log('hej');
    this.FindExactMatchesForDate(date);
    console.log('hej2');
    this.FindSubsetMatchesForDate(date);
    console.log('hej3');
  }

  public FindExactMatchesForDate(date: string) {
    let associatedBankTransactions = this.bankSheet().dateMap().get(date);
    let associateBankDateAmountMap = this.bankSheet().dateAmountMap().get(date);
    let associateBookkeepingDateAmountMap = this.bookkeepingSheet()
      .dateAmountMap()
      .get(date);
    let associatedBookkeepingTransactions = this.bookkeepingSheet()
      .dateMap()
      .get(date);

    if (
      associatedBankTransactions === undefined ||
      associatedBookkeepingTransactions === undefined ||
      associateBankDateAmountMap === undefined ||
      associateBookkeepingDateAmountMap === undefined
    ) {
      return;
    }
    associatedBankTransactions.forEach((bankRow, index) => {
      const matchIndex = associatedBookkeepingTransactions.findIndex(
        (bookRow) => bookRow[RowNames.Amount] === bankRow[RowNames.Amount]
      );

      if (matchIndex !== -1) {
        this.matches().PushRow(bankRow);
        associateBookkeepingDateAmountMap.splice(matchIndex, 1);
        associatedBookkeepingTransactions.splice(matchIndex, 1);
        associatedBankTransactions.splice(index, 1);
        associateBankDateAmountMap.splice(index, 1);
      }
    });
    this.bookkeepingSheet().SetDateMapValue(
      date,
      associatedBookkeepingTransactions
    );
    this.bookkeepingSheet().SetDateAmountMapValue(
      date,
      associateBookkeepingDateAmountMap
    );
    this.bankSheet().SetDateMapValue(date, associatedBankTransactions);
    this.bankSheet().SetDateAmountMapValue(date, associateBankDateAmountMap);
  }

  public FindSubsetMatchesForDate(date: string) {
    const bankSheet = this.bankSheet();
    const bookkeepingSheet = this.bookkeepingSheet();

    let associatedBankTransactions = bankSheet.dateMap().get(date);
    let associatedBookkeepingTransactions = bookkeepingSheet
      .dateMap()
      .get(date);
    let bookkeepingDateRows = bookkeepingSheet.dateAmountMap().get(date);
    let bankDateRows = bankSheet.dateAmountMap().get(date);

    if (
      bookkeepingDateRows === undefined ||
      bankDateRows === undefined ||
      associatedBankTransactions === undefined ||
      associatedBookkeepingTransactions === undefined
    ) {
      return;
    }

    // Continue until no further matches can be found.
    let modified = true;
    while (modified) {
      modified = false;
      // Iterate using an index to avoid re-searching via indexOf.
      for (let i = 0; i < bankDateRows.length; i++) {
        const target = bankDateRows[i];
        const subsetIndices = this.findSubsetSumOptimized(
          target,
          bookkeepingDateRows
        );
        if (subsetIndices !== null) {
          // Process the match.
          this.matches().PushRow(associatedBankTransactions[i]);
          // Remove the bank transaction using the current index.
          bankDateRows.splice(i, 1);
          associatedBankTransactions.splice(i, 1);

          // Remove bookkeeping transactions.
          // Sort indices in descending order to avoid index shifting during removal.
          subsetIndices.sort((a, b) => b - a);
          for (const idx of subsetIndices) {
            bookkeepingDateRows.splice(idx, 1);
            associatedBookkeepingTransactions.splice(idx, 1);
          }
          modified = true;
          // Restart since arrays have changed.
          break;
        }
      }
    }

    bookkeepingSheet.SetDateMapValue(date, associatedBookkeepingTransactions);
    bookkeepingSheet.SetDateAmountMapValue(date, bookkeepingDateRows);
    bankSheet.SetDateMapValue(date, associatedBankTransactions);
    bankSheet.SetDateAmountMapValue(date, bankDateRows);
  }

  // Optimized subset sum using memoization.
  findSubsetSumOptimized(target: number, numbers: number[]): number[] | null {
    const memo = new Map<string, number[] | null>();

    function backtrack(start: number, currentSum: number): number[] | null {
      if (currentSum === target) {
        return [];
      }
      // Use a key combining the starting index and current sum.
      const key = start + '-' + currentSum;
      if (memo.has(key)) {
        return memo.get(key) || null;
      }
      // Prune if the sum overshoots (assuming all numbers are positive;
      // adjust if negatives can occur).
      if (
        (target >= 0 && currentSum > target) ||
        (target < 0 && currentSum < target)
      ) {
        memo.set(key, null);
        return null;
      }
      for (let i = start; i < numbers.length; i++) {
        const result = backtrack(i + 1, currentSum + numbers[i]);
        if (result !== null) {
          const solution = [i, ...result];
          memo.set(key, solution);
          return solution;
        }
      }
      memo.set(key, null);
      return null;
    }

    return backtrack(0, 0);
  }

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
