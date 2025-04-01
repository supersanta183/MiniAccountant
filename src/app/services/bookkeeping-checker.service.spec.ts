import { TestBed } from '@angular/core/testing';

import { BookkeepingCheckerService } from './bookkeeping-checker.service';

describe('BookkeepingCheckerService', () => {
  let service: BookkeepingCheckerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BookkeepingCheckerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
