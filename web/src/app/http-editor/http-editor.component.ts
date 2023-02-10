import { Component, EventEmitter, OnInit, Output, Input } from '@angular/core';

@Component({
  selector: 'app-http-editor',
  templateUrl: './http-editor.component.html',
  styleUrls: ['./http-editor.component.scss']
})
export class HttpEditorComponent implements OnInit {
  @Output() httpRequestValue = new EventEmitter<string>();
  @Input() httpRequest : string = "";
  constructor() { }

  ngOnInit(): void {
  }

}
