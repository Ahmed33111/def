export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8082').replace(/\/$/, '');

export const apiUrl = (path: string) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export const fetchAccounts = async () => {
  const credentials = localStorage.getItem('credentials');
  const response = await fetch(apiUrl('/api/accounts'), {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json'
    },
    credentials: 'include'
  });
  return response.json();
}; 