import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BookkeepingCheckerComponent } from './bookkeeping-checker.component';

describe('BookkeepingCheckerComponent', () => {
  let component: BookkeepingCheckerComponent;
  let fixture: ComponentFixture<BookkeepingCheckerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookkeepingCheckerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BookkeepingCheckerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
