import { env } from 'cloudflare:workers';
import { resolveServiceUrl, type CommerceService } from './service-config';

const buildUrls = {
  MS1: import.meta.env.PUBLIC_MS1_URL,
  MS2: import.meta.env.PUBLIC_MS2_URL,
  MS3: import.meta.env.PUBLIC_MS3_URL,
  MS4: import.meta.env.PUBLIC_MS4_URL,
  MS6: import.meta.env.PUBLIC_MS6_URL,
};
/** Los bindings del Worker prevalecen sobre los valores incorporados al build. */
export function serviceUrl(service: CommerceService, requestUrl: URL): string {
  return resolveServiceUrl(service, requestUrl, env as Record<string, unknown>, buildUrls);
}
