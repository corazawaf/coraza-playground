import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-coraza-response',
  templateUrl: './coraza-response.component.html',
  styleUrls: ['./coraza-response.component.scss']
})
export class CorazaResponseComponent implements OnInit {

  displayedSummaryColumns: string[] = ['key', 'value']
  summary = [
    {
      "key": "Interrupted",
      "value": ""
    }
  ]
  constructor() { }

  ngOnInit(): void {
  }

}
