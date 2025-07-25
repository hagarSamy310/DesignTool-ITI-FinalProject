import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DesignToolComponent } from './design-tool.component';


@Component({
  selector: 'app-root',
  imports: [RouterOutlet, DesignToolComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'design-tool';
}
