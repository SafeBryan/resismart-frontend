import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { finalize, Subscription } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { UsuariosService } from '../../../../core/services/usuarios.service';
import { UsuarioPerfilRequest } from '../../../../core/models/usuario.model';
import { UtilsModule } from '../../../../utils/utils.module';
import { RESIDENT_NAV } from '../../resident-nav';
import { environment } from '../../../../../environments/environment';

type Feedback = { type: 'success' | 'error'; text: string };

@Component({
  selector: 'app-resident-perfil',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, UtilsModule],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.css',
})
export class ResidentPerfilComponent implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private usuarios = inject(UsuariosService);
  private subscriptions = new Subscription();

  residentNav = RESIDENT_NAV;

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
  isUploadingAvatar = signal(false);

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
            console.error('[Resident Perfil] updateOwnProfile error', err);
            this.profileFeedback.set({
              type: 'error',
              text: 'No pudimos guardar tus datos. Int\u00E9ntalo nuevamente.',
            });
          },
        })
    );
  }

  get avatarUrl(): string {
    const profile: any = this.auth.snapshot.profile;
    const url = profile?.avatarUrl ?? profile?.avatar_url ?? null;
    if (!url || typeof url !== 'string') {
        return 'assets/img/default-user.png';
    }
    if (url.startsWith('http')) {
      return url;
    }
    const base = environment.apiUrl || '';
    if (url.startsWith('/files')) {
      return `${base}${url}`;
    }
    if (url.startsWith('/')) {
      return `${base}${url}`;
    }
    return `${base}/files/${url}`;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || !input.files.length) return;
    const file = input.files[0];
    this.isUploadingAvatar.set(true);
    this.auth.updateAvatar(file).pipe(finalize(() => this.isUploadingAvatar.set(false))).subscribe({
      next: () => {
        this.profileFeedback.set({ type: 'success', text: 'Avatar actualizado.' });
      },
      error: () => {
        this.profileFeedback.set({ type: 'error', text: 'No se pudo actualizar el avatar.' });
      },
    });
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
        text: 'No pudimos identificar tu usuario para actualizar las credenciales.',
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
              text: 'Actualizamos tus credenciales correctamente.',
            });
          },
          error: (err) => {
            console.error('[Resident Perfil] updateCredencialesCliente error', err);
            this.credentialsFeedback.set({
              type: 'error',
              text: 'No fue posible actualizar la contrase\u00F1a. Int\u00E9ntalo de nuevo.',
            });
          },
        })
    );
  }

  private hydrateForms(profile: any | null | undefined): void {
    if (!profile) {
      return;
    }

    const nombre = profile?.nombres ?? profile?.nombre ?? this.profileForm.nombre ?? '';
    const apellido = profile?.apellidos ?? profile?.apellido ?? this.profileForm.apellido ?? '';
    const email = profile?.email ?? profile?.correo ?? this.profileForm.email ?? '';
    const telefono = profile?.telefono ?? this.profileForm.telefono ?? '';

    this.profileForm = { nombre, apellido, email, telefono };

    if (!this.credentialsForm.email) {
      this.credentialsForm.email = email;
    }
  }
}
