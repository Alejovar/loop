/**
 * Masks an email address for privacy display.
 * e.g. "john.doe@gmail.com" → "jo***@gm***.com"
 */
export const maskEmail = (email: string): string => {
  if (!email || !email.includes("@")) return "***";
  const [local, domain] = email.split("@");
  const [domainName, ...tldParts] = domain.split(".");
  const tld = tldParts.join(".");

  const maskedLocal = local.length <= 2
    ? local[0] + "***"
    : local.slice(0, 2) + "***";

  const maskedDomain = domainName.length <= 2
    ? domainName[0] + "***"
    : domainName.slice(0, 2) + "***";

  return `${maskedLocal}@${maskedDomain}.${tld}`;
};
