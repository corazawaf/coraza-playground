import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CorazaResponseComponent } from './coraza-response.component';

describe('CorazaResponseComponent', () => {
  let component: CorazaResponseComponent;
  let fixture: ComponentFixture<CorazaResponseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CorazaResponseComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CorazaResponseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
