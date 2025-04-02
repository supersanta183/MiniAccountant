import { signal } from '@angular/core';
import { RowNames } from '../RowNames';
import { BookkeepingRow } from './BookkeepingRow';

export class ExcelSheet {
  public rows = signal<BookkeepingRow[]>([]);
  public dateMap = signal<Map<string, BookkeepingRow[]>>(new Map());

  constructor(rows: BookkeepingRow[]) {
    this.rows.set(rows);
    this.dateMap.set(this.CreateDateMap());
  }

  public AppendRows(rows: BookkeepingRow[]) {
    this.rows.update((prev) => [...prev, ...rows]);
  }

  public SetRows(rows: BookkeepingRow[]) {
    this.rows.set(rows);
  }

  private CreateDateMap(): Map<string, BookkeepingRow[]> {
    let dateTransfers: Map<string, BookkeepingRow[]> = new Map();
    this.rows().forEach((row) => {
      const date = row[RowNames.Date];
      if (!dateTransfers.has(date)) {
        dateTransfers.set(date, []);
      }
      dateTransfers.get(date)!.push(row);
    });

    return dateTransfers;
  }
}
