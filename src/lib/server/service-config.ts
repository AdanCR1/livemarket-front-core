export type CommerceService = 'MS1' | 'MS2' | 'MS3' | 'MS4' | 'MS6';

export function resolveServiceUrl(service: CommerceService, requestUrl: URL,
  bindings: Record<string, unknown>, buildUrls: Partial<Record<CommerceService, string>>) {
  const raw = bindings[service + '_URL'] ?? bindings['PUBLIC_' + service + '_URL'] ?? buildUrls[service];
  if (typeof raw !== 'string' || !raw.trim()) throw new Error('SERVICE_NOT_CONFIGURED');
  const url = new URL(raw.trim());
  const local = ['localhost', '127.0.0.1', '[::1]'];
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      (url.protocol !== 'https:' && !(url.protocol === 'http:' && local.includes(url.hostname))) ||
      (!local.includes(requestUrl.hostname) && local.includes(url.hostname))) {
    throw new Error('SERVICE_INVALID_URL');
  }
  return url.origin;
}
