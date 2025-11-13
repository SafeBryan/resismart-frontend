// button.component.ts
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { CommonModule, NgClass } from "@angular/common";
import { RouterModule } from "@angular/router";
import { MatButtonModule } from "@angular/material/button";
import { IconComponent } from "../icon";

@Component({
  selector: "app-button",
  standalone: true,
  imports: [
    NgClass,
    IconComponent,
    MatButtonModule,
    CommonModule,
    RouterModule,
  ],
  templateUrl: "./button.component.html",
  styleUrl: "./button.component.css",
})
export class ButtonComponent {
  @Input() label = "Botón";
  @Input() variant: "primary" | "secondary" | "sky" = "primary";
  @Input() fullWidth = false;
  @Input() iconLeft?: "user" | "lock" | "logout" | "eye" | "eye-off";
  @Input() iconRight?: "user" | "lock" | "logout" | "eye" | "eye-off";
  @Input() pill = false;
  @Input() routerLink?: string | any[];

  @Input() disabled = false;

  @Output() clicked = new EventEmitter<Event>();
}
