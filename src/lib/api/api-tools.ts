export function isBetterAuthRoute(path: string): boolean {
  return path.startsWith('/api/auth');
}

export function getBetterAuthUrl(): string {
  const environment = process.env.NODE_ENV || 'development';
  return (
    process.env.BETTER_AUTH_URL ||
    (environment === 'production'
      ? 'https://tetontracker.com'
      : 'http://localhost:3000')
  );
}

export function initJSONResponse(
  data: any,
  status: number = 200,
  headersAdditional?: Record<string, string> | Headers
) {
  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      ...headersAdditional,
    },
    status,
  });
}
