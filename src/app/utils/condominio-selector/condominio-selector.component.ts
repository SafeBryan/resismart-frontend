import { Component, OnInit, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';
import { CondominioContextService } from '../../core/services/condominio-context.service';
import { AuthService } from '../../core/services/auth.service';
import { normalizeRole } from '../../core/utils/role.util';

@Component({
  selector: 'app-condominio-selector',
  standalone: true,
  imports: [CommonModule, FormsModule, MatFormFieldModule, MatSelectModule, MatIconModule],
  templateUrl: './condominio-selector.component.html',
  styleUrl: './condominio-selector.component.scss',
})
export class CondominioSelectorComponent implements OnInit {
  private condCtx = inject(CondominioContextService);
  private auth = inject(AuthService);

  readonly state = this.condCtx.state;
  readonly condominios = computed(() => this.state().condominios ?? []);
  readonly seleccionado = computed(() => this.state().condominioActualId);
  readonly condominio = this.condCtx.condominioActual;
  readonly loading = computed(() => this.state().loading);
  readonly rol = computed(() => normalizeRole(this.auth.snapshot.role));
  readonly visible = computed(() => {
    const role = this.rol();
    return role === 'ADMIN' || role === 'OWNER';
  });

  ngOnInit(): void {
    if (!this.state().loading && this.condominios().length === 0) {
      this.condCtx.loadMisCondominios().subscribe();
    }
  }

  onChange(id: number | null) {
    this.condCtx.setCondominioActual(id ?? null);
  }
}
