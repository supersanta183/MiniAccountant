import { RowNames } from '../RowNames';

export interface BookkeepingRow {
  [RowNames.Date]: string;
  [RowNames.Amount]: number;
  [RowNames.Issuer]: string;
}

export function CreateBookkeepingRow(
  date: string,
  amount: number,
  issuer: string
): BookkeepingRow {
  const res: BookkeepingRow = {
    [RowNames.Date]: date,
    [RowNames.Amount]: amount,
    [RowNames.Issuer]: issuer,
  };
  return res;
}
