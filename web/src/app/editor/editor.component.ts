import { Component } from '@angular/core';
import { CodeModel } from '@ngstack/code-editor/lib/models/code.model';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent {
  
  public theme = 'vs';

  public codeModel: CodeModel = {
    language: 'json',
    uri: 'main.json',
    value: '{}',
  };

  public options = {
    contextmenu: true,
    minimap: {
      enabled: true,
    },
  };

  public onCodeChanged(value: any) {
    console.log('CODE', value);
  }
}
