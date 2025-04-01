import { Routes } from '@angular/router';
import { TestcomponentComponent } from './testcomponent/testcomponent.component';
import { BookkeepingCheckerComponent } from './bookkeeping-checker/bookkeeping-checker.component';

export const routes: Routes = [
  { path: 'test', component: TestcomponentComponent },
  { path: 'check-bookkeeping', component: BookkeepingCheckerComponent },
];
