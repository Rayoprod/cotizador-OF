import { ComponentFixture, TestBed } from '@angular/core/testing';

import { QuoteCreator } from './quote-creator';

describe('QuoteCreator', () => {
  let component: QuoteCreator;
  let fixture: ComponentFixture<QuoteCreator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [QuoteCreator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(QuoteCreator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
