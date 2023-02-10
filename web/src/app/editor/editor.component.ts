import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CodeModel } from '@ngstack/code-editor/lib/models/code.model';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent {
  public theme = 'vs';

  @Input() codeModel: CodeModel = {
    language: '',
    uri: '',
    value: 'testuru',
  };
  @Input() codeValue: string = '';
  @Output() codeValueChange = new EventEmitter<string>();

  public options = {
    contextmenu: false,
    minimap: {
      enabled: false,
    },
  };

  ngOnInit(): void {
    this.codeModel.value = this.codeValue;
  }

  public onCodeChanged(value: string) {
    this.codeValueChange.emit(value);
  }
}
