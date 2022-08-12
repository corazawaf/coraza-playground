import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HttpEditorComponent } from './http-editor.component';

describe('HttpEditorComponent', () => {
  let component: HttpEditorComponent;
  let fixture: ComponentFixture<HttpEditorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HttpEditorComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HttpEditorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
