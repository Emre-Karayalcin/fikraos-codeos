// CSRF token management
let csrfToken: string | null = null;

export async function fetchCsrfToken(): Promise<string> {
  const response = await fetch('/api/csrf-token', {
    credentials: 'include'
  });
  const data = await response.json();
  csrfToken = data.csrfToken;
  return csrfToken;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

export function setCsrfToken(token: string): void {
  csrfToken = token;
}
