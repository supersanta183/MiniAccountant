import { Component } from '@angular/core';
import { BookkeepingCheckerService } from '../services/bookkeeping-checker.service';
import { SheetNames } from '../resources/SheetNames';

import * as XLSX from 'xlsx';

@Component({
  selector: 'app-bookkeeping-checker',
  imports: [],
  templateUrl: './bookkeeping-checker.component.html',
  styleUrl: './bookkeeping-checker.component.css',
})
export class BookkeepingCheckerComponent {
  excelData: any[] = [];

  constructor(private bookkeepingCheckerService: BookkeepingCheckerService) {}

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (!input.files?.length) return;

    const file = input.files[0];

    if (
      file &&
      (file.name.endsWith('.xlsx') ||
        file.name.endsWith('.xls') ||
        file.name.endsWith('.xlsm'))
    ) {
      console.log('Selected file:', file.name);
      this.bookkeepingCheckerService.HandleBookkeeping(file);
      // Here you can process the file (e.g., using xlsx library)
    } else {
      console.warn('Invalid file type');
    }
  }
}
