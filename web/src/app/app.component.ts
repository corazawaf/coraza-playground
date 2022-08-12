import { Component } from '@angular/core';
import { MatListOption } from '@angular/material/list';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  title = 'OWASP Coraza Playground';
  phases: any[] = [
    {
      label: 'Request Headers', 
      value: true,
      index: 1,
    },
    {
      label: 'Request Body', 
      value: true,
      index: 2,
    },
    {
      label: 'Response Headers', 
      value: true,
      index: 3,
    },
    {
      label: 'Response Body', 
      value: true,
      index: 4,
    },
    {
      label: 'Logging',
      value: true,
      index: 5,
    }
  ];
  coraza_versions = ["v2.0.1"];
  crs_versions = ["latest"];
  public updatePhases(option: any, event: any) {
    console.log(event);
    this.phases.forEach(phase => {
      if (phase.index <= option.index) {
        phase.value = true;
      } else {
        phase.value = false;
      }
    });
  }
}
