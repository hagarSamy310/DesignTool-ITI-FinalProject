import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  getToken(): string | null {
    const raw = localStorage.getItem('token');
    if (!raw) return null;

    return raw.replace(/^"|"$/g, '');
  }

  isLoggedIn(): boolean {
    return !!this.getToken(); 
  }

  getUserRole(): string | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      
      const msRoleClaim = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
      
      // Trying different possible role claim names
      const role = payload.role || 
                   payload.roles || 
                   payload[msRoleClaim] ||  
                   payload.authorities;

      if (Array.isArray(role)) {
        return role[0] || null;
      }

      return typeof role === 'string' ? role : null;
    } catch (e) {
      console.error('JWT decode error:', e);
      return null;
    }
  }

  isUser(): boolean {
    return this.getUserRole()?.toLowerCase() === 'user';
  }

  isSeller(): boolean {
    return this.getUserRole()?.toLowerCase() === 'seller';
  }
}