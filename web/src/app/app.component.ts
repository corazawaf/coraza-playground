import { Component } from '@angular/core';
import { MatCheckboxChange } from '@angular/material/checkbox';
// import { MatListOption } from '@angular/material/list';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'OWASP Coraza Playground';
  phases: Phase[] = [
    {
      label: 'Request Headers', 
      value: false
    },
    {
      label: 'Request Body', 
      value: false
    },
    {
      label: 'Response Headers', 
      value: false
    },
    {
      label: 'Response Body', 
      value: false
    },
    {
      label: 'Logging',
      value: false
    }
  ];
  coraza_versions = ["v2.0.1", "v3/latest", "v3-tinygo"];
  crs_versions = ["latest"];

  public updatePhases(option: MatCheckboxChange) {
    for (var i = 0; i < this.phases.length; i++) {
      this.phases[i].value = option.checked;
      if(this.phases[i].label === option.source.value) {
        break;
      }
    }
  }
}

export interface Phase {
  label: string;
  value: boolean;
}