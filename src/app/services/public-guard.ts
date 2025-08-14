import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase';

export const publicGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const { data } = await supabaseService.getSession();

  if (data.session) {
    // Si YA hay sesión, no lo dejes entrar al login, envíalo a la app.
    router.navigate(['/crear-cotizacion']);
    return false;
  } else {
    // Si NO hay sesión, déjalo pasar a la página de login.
    return true;
  }
};
