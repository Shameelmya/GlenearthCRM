export async function fetchN8n(endpoint: string, options: RequestInit = {}) {
  const baseUrl = process.env.N8N_BASE_URL;
  const user = process.env.N8N_USER;
  const pass = process.env.N8N_PASSWORD;

  if (!baseUrl || !user || !pass) {
    throw new Error('Missing n8n configuration in environment variables.');
  }

  const authHeader = 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64');
  const url = new URL(endpoint, baseUrl).toString();

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: authHeader,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`n8n request failed: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`n8n backend returned ${response.status}`);
  }

  return response.json();
}
