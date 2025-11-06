import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { UsuarioPerfilRequest } from '../../../../core/models/usuario.model';
import { UtilsModule } from '../../../../utils/utils.module';
import { SidebarComponent } from '../../../../utils/sidebar/sidebar.component';

type Feedback = { type: 'success' | 'error'; text: string };

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [CommonModule, FormsModule, UtilsModule, SidebarComponent],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.css',
})
export class ConfiguracionComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private usuarios = inject(UsuariosService);
  private subscriptions = new Subscription();

  profileForm = {
    nombre: '',
    apellido: '',
    email: '',
    telefono: '',
  };

  credentialsForm = {
    email: '',
    password: '',
    confirmPassword: '',
  };

  savingProfile = signal(false);
  savingCredentials = signal(false);
  profileFeedback = signal<Feedback | null>(null);
  credentialsFeedback = signal<Feedback | null>(null);

  ngOnInit(): void {
    this.hydrateForms(this.auth.snapshot.profile);

    this.subscriptions.add(
      this.auth.auth$.subscribe((state) => {
        this.hydrateForms(state?.profile);
      })
    );

    if (!this.auth.snapshot.profile) {
      this.subscriptions.add(
        this.auth.refreshProfile().subscribe({
          next: (profile) => this.hydrateForms(profile),
          error: () => {},
        })
      );
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onSubmitProfile(): void {
    this.profileFeedback.set(null);
    const payload: UsuarioPerfilRequest = {
      nombre: this.profileForm.nombre?.trim() || undefined,
      apellido: this.profileForm.apellido?.trim() || undefined,
      email: this.profileForm.email?.trim() || undefined,
      telefono: this.profileForm.telefono?.trim() || undefined,
    };

    this.savingProfile.set(true);
    this.subscriptions.add(
      this.usuarios
        .updateOwnProfile(payload)
        .pipe(finalize(() => this.savingProfile.set(false)))
        .subscribe({
          next: (updated) => {
            this.auth.mergeProfile(updated);
            this.hydrateForms(updated);
            this.profileFeedback.set({
              type: 'success',
              text: 'Datos personales actualizados correctamente.',
            });
          },
          error: (err) => {
            console.error('[Config] updateOwnProfile error', err);
            this.profileFeedback.set({
              type: 'error',
              text: 'No se pudo actualizar la informaci\u00F3n personal.',
            });
          },
        })
    );
  }

  onSubmitCredentials(): void {
    this.credentialsFeedback.set(null);

    const idUsuarioRaw =
      this.auth.snapshot.idUsuario ??
      (this.auth.snapshot.profile as any)?.idUsuario ??
      (this.auth.snapshot.profile as any)?.id_usuario ??
      (this.auth.snapshot.profile as any)?.id;
    const idUsuario = Number(idUsuarioRaw);
    if (!idUsuario) {
      this.credentialsFeedback.set({
        type: 'error',
        text: 'No fue posible identificar al usuario autenticado.',
      });
      return;
    }

    const currentEmail = this.profileForm.email?.trim() ?? '';
    const email = this.credentialsForm.email?.trim() ?? '';
    const password = this.credentialsForm.password?.trim() ?? '';
    const confirm = this.credentialsForm.confirmPassword?.trim() ?? '';

    const emailChanged = !!email && email !== currentEmail;
    const passwordChanged = !!password;

    if (!emailChanged && !passwordChanged) {
      this.credentialsFeedback.set({
        type: 'error',
        text: 'Ingresa un correo distinto o una nueva contrase\u00F1a para continuar.',
      });
      return;
    }

    if (passwordChanged && password !== confirm) {
      this.credentialsFeedback.set({
        type: 'error',
        text: 'La confirmaci\u00F3n de contrase\u00F1a no coincide.',
      });
      return;
    }

    if (!passwordChanged && confirm) {
      this.credentialsFeedback.set({
        type: 'error',
        text: 'Debes ingresar la nueva contrase\u00F1a en ambos campos.',
      });
      return;
    }

    this.savingCredentials.set(true);
    this.subscriptions.add(
      this.usuarios
        .updateCredencialesCliente({
          idUsuario,
          email: emailChanged ? email : currentEmail || undefined,
          password: passwordChanged ? password : undefined,
        })
        .pipe(finalize(() => this.savingCredentials.set(false)))
        .subscribe({
          next: () => {
            const effectiveEmail = emailChanged ? email : currentEmail;
            if (effectiveEmail) {
              this.auth.mergeProfile({ email: effectiveEmail, correo: effectiveEmail });
              this.profileForm.email = effectiveEmail;
              this.credentialsForm.email = effectiveEmail;
            }
            this.credentialsForm.password = '';
            this.credentialsForm.confirmPassword = '';
            this.credentialsFeedback.set({
              type: 'success',
              text: 'Credenciales actualizadas correctamente.',
            });
          },
          error: (err) => {
            console.error('[Config] updateCredencialesCliente error', err);
            this.credentialsFeedback.set({
              type: 'error',
              text: 'No se pudieron actualizar las credenciales.',
            });
          },
        })
    );
  }

  private hydrateForms(profile: any | null | undefined): void {
    if (!profile) {
      return;
    }
    this.profileForm = {
      nombre: profile?.nombres ?? profile?.nombre ?? this.profileForm.nombre ?? '',
      apellido: profile?.apellidos ?? profile?.apellido ?? this.profileForm.apellido ?? '',
      email: profile?.email ?? profile?.correo ?? this.profileForm.email ?? '',
      telefono: profile?.telefono ?? this.profileForm.telefono ?? '',
    };

    if (!this.credentialsForm.email) {
      this.credentialsForm.email = this.profileForm.email;
    }
  }
}
