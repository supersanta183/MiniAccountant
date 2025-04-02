import { RowNames } from '../RowNames';

export interface BookkeepingRow {
  [RowNames.Date]: string;
  [RowNames.Amount]: number;
  [RowNames.Issuer]: string;
}
