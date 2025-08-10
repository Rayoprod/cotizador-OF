import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Administradorgeneral } from './administradorgeneral';

describe('Administradorgeneral', () => {
  let component: Administradorgeneral;
  let fixture: ComponentFixture<Administradorgeneral>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Administradorgeneral]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Administradorgeneral);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
