import { signal } from '@angular/core';
import { RowNames } from '../RowNames';
import { BookkeepingRow } from './BookkeepingRow';

export class ExcelSheet {
  public rows = signal<BookkeepingRow[]>([]);
  public dateMap = signal<Map<string, BookkeepingRow[]>>(new Map());
  public dateAmountMap = signal<Map<string, number[]>>(new Map());

  constructor(rows: BookkeepingRow[]) {
    this.rows.set(rows);
    this.CreateDateMap();
  }

  public AppendRows(rows: BookkeepingRow[]) {
    this.rows.update((prev) => [...prev, ...rows]);
  }

  public PushRow(row: BookkeepingRow) {
    this.rows.update((prev) => [...prev, row]);
  }

  public SetRows(rows: BookkeepingRow[]) {
    this.rows.set(rows);
  }

  public SetDateMapValue(date: string, value: BookkeepingRow[]) {
    const map = this.dateMap();
    map.set(date, value);
    this.dateMap.set(map);
  }

  public SetDateAmountMapValue(date: string, value: number[]) {
    const map = this.dateAmountMap();
    map.set(date, value);
    this.dateAmountMap.set(map);
  }

  public GetSumForDate(date: string) {
    const rows = this.dateMap().get(date);

    if (rows === undefined) {
      return 0;
    }

    let sum: number = 0;
    rows.forEach((row) => {
      sum = sum + row[RowNames.Amount];
    });

    return sum;
  }

  public RefreshRows() {
    const dateMap = this.dateMap();
    let rows: BookkeepingRow[] = [];
    dateMap.forEach((date) => {
      date.forEach((row) => rows.push(row));
    });
    this.SetRows(rows);
  }

  private CreateDateMap() {
    let dateTransfers: Map<string, BookkeepingRow[]> = new Map();
    let dateAmountMap: Map<string, number[]> = new Map();
    this.rows().forEach((row) => {
      const date = row[RowNames.Date];
      if (!dateTransfers.has(date)) {
        dateTransfers.set(date, []);
      }
      if (!dateAmountMap.has(date)) {
        dateAmountMap.set(date, []);
      }
      dateTransfers.get(date)!.push(row);
      dateAmountMap.get(date)!.push(row[RowNames.Amount]);
    });

    this.dateMap.set(dateTransfers);
    this.dateAmountMap.set(dateAmountMap);
  }
}
