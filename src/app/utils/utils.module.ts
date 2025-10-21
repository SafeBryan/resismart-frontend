import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from './button/button.component';
import { IconComponent } from './icon/icon.component';
import { InputTextComponent } from './input-text/input-text.component';
import { InputPasswordComponent } from './input-password/input-password.component';

@NgModule({
  imports: [
    CommonModule,
    // Standalone components grouped via NgModule imports
    ButtonComponent,
    IconComponent,
    InputTextComponent,
    InputPasswordComponent,
  ],
  exports: [
    ButtonComponent,
    IconComponent,
    InputTextComponent,
    InputPasswordComponent,
  ],
})
export class UtilsModule {}

