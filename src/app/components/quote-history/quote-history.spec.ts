import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuoteHistory } from './quote-history';

describe('QuoteHistory', () => {
  let component: QuoteHistory;
  let fixture: ComponentFixture<QuoteHistory>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteHistory]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuoteHistory);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
