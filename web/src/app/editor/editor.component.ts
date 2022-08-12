import { Component, OnInit, Input } from '@angular/core';
import { Editor, EditorChange, EditorFromTextArea, ScrollInfo, EditorConfiguration } from 'codemirror';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.scss']
})
export class EditorComponent implements OnInit {
  config: EditorConfiguration = {
    tabSize: 3,
    lineNumbers: true,
    mode: '',
    theme: 'neat',
    extraKeys: {
    }
  };
  @Input() name = 'codemirror';

  constructor() { 
    
  }
  ngOnInit(): void {
  }

}
