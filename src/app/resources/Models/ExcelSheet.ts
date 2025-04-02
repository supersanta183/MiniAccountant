import { RowNames } from '../RowNames';

export class ExcelSheet {
  public rows: BookkeepingRow[];
  public dateMap: Map<string, BookkeepingRow[]>;

  constructor(rows: BookkeepingRow[]) {
    this.rows = rows;
    this.dateMap = this.CreateDateMap();
  }

  private CreateDateMap(): Map<string, BookkeepingRow[]> {
    let dateTransfers: Map<string, BookkeepingRow[]> = new Map();
    this.rows.forEach((row) => {
      const date = row[RowNames.Date];
      if (!dateTransfers.has(date)) {
        dateTransfers.set(date, []);
      }
      dateTransfers.get(date)!.push(row);
    });

    return dateTransfers;
  }
}

export interface BookkeepingRow {
  [RowNames.Date]: string;
  [RowNames.Amount]: number;
  [RowNames.Issuer]: string;
}

class TestSheet {
  private bookkeepingSheet: ExcelSheet;
  private bankSheet: ExcelSheet;

  constructor(bookkeepingSheet: ExcelSheet, bankSheet: ExcelSheet) {
    this.bookkeepingSheet = bookkeepingSheet;
    this.bankSheet = bankSheet;
  }
}
