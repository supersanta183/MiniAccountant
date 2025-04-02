import { signal } from '@angular/core';
import { ExcelSheet } from './ExcelSheet';

export class BookkeepingFile {
  public bookkeepingSheet = signal<ExcelSheet>(new ExcelSheet([]));
  public bankSheet = signal<ExcelSheet>(new ExcelSheet([]));

  constructor(bookkeepingSheet: ExcelSheet, bankSheet: ExcelSheet) {
    this.bookkeepingSheet.set(bookkeepingSheet);
    this.bankSheet.set(bankSheet);
  }

  public updateBookkeepingSheet(sheet: ExcelSheet) {
    this.bookkeepingSheet.set(sheet);
  }

  public updateBankSheet(sheet: ExcelSheet) {
    this.bankSheet.set(sheet);
  }
}
