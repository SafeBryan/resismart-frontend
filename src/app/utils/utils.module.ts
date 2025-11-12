import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonComponent } from './button/button.component';
import { IconComponent } from './icon/icon.component';
import { InputComponent } from './input/input.component';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SidebarComponent } from './sidebar/sidebar.component';
import { AvisosBellComponent } from './avisos-bell/avisos-bell.component';

@NgModule({
  imports: [
    CommonModule,
    // Standalone components grouped via NgModule imports
    ButtonComponent,
    IconComponent,
    InputComponent,
    SidebarComponent,
    AvisosBellComponent,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
  exports: [
    ButtonComponent,
    IconComponent,
    InputComponent,
    SidebarComponent,
    AvisosBellComponent,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
  ],
})
export class UtilsModule {}
