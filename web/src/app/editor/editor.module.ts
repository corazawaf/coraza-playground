import { NgModule } from '@angular/core';
import { EditorComponent } from './editor.component';
import { CodeEditorModule } from '@ngstack/code-editor';

@NgModule({
  declarations: [
    EditorComponent
  ],
  imports: [
    CodeEditorModule.forChild()
  ],
  exports: [
    EditorComponent
  ]
})
export class EditorModule { }