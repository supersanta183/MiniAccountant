import { RowNames } from '../RowNames';

export interface ExcelSheet {
  rows: BookkeepingRow[];
  dateMap: Map<string, BookkeepingRow[]>;
}

export interface BookkeepingRow {
  [RowNames.Date]: string;
  [RowNames.Amount]: number;
  [RowNames.Issuer]: string;
}
