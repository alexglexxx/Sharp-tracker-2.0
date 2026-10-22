export function hasCronSecret(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const value = req.headers.authorization || '';
  return value === `Bearer ${secret}`;
}
