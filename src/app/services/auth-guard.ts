import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SupabaseService } from './supabase';

export const authGuard: CanActivateFn = async (route, state) => {
  const supabaseService = inject(SupabaseService);
  const router = inject(Router);

  const { data } = await supabaseService.getSession();

  if (data.session) {
    return true; // Si hay sesión, déjalo pasar
  } else {
    // Si no hay sesión, redirígelo a la página de login
    router.navigate(['/login']);
    return false;
  }
};
