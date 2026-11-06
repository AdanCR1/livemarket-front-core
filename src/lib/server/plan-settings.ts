export const proCheckoutEnabled = import.meta.env.PRO_CHECKOUT_VERIFIED === "true";

const configuredEmail = import.meta.env.ENTERPRISE_CONTACT_EMAIL?.trim();
export const enterpriseContactEmail = configuredEmail &&
  /^[a-z0-9._+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i.test(configuredEmail)
  ? configuredEmail
  : null;
