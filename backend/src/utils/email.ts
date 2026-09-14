interface DnsAnswer {
  type?: number;
  data?: string;
}

interface DnsResponse {
  Status?: number;
  Answer?: DnsAnswer[];
}

export type EmailValidationResult =
  | { valid: true; email: string }
  | { valid: false; error: "format" | "domain" | "unavailable" };

/**
 * Проверяет адрес, который можно безопасно передавать DNS-резолверу.
 * Проверка существования конкретного почтового ящика невозможна без письма
 * с подтверждением, но MX-запись доказывает, что домен умеет принимать почту.
 */
export async function validateRegistrationEmail(
  rawEmail: string
): Promise<EmailValidationResult> {
  const email = rawEmail.trim().toLowerCase();

  if (email.length > 254 || (email.match(/@/g)?.length ?? 0) !== 1) {
    return { valid: false, error: "format" };
  }

  const [localPart, rawDomain] = email.split("@");
  if (
    !localPart ||
    !rawDomain ||
    localPart.length > 64 ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..") ||
    !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+$/i.test(localPart)
  ) {
    return { valid: false, error: "format" };
  }

  let domain: string;
  try {
    // URL нормализует международные домены в punycode и отбрасывает
    // некорректные символы в доменной части.
    const url = new URL(`https://${rawDomain}`);
    if (
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      return { valid: false, error: "format" };
    }
    domain = url.hostname.toLowerCase();
  } catch {
    return { valid: false, error: "format" };
  }

  const labels = domain.split(".");
  if (
    labels.length < 2 ||
    domain.length > 253 ||
    labels.some(
      (label) =>
        !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)
    )
  ) {
    return { valid: false, error: "format" };
  }

  try {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
      { headers: { Accept: "application/dns-json" } }
    );

    if (!response.ok) {
      return { valid: false, error: "unavailable" };
    }

    const dns = (await response.json()) as DnsResponse;
    const hasMailServer =
      dns.Status === 0 &&
      (dns.Answer ?? []).some(
        (answer) => {
          const data = answer.data?.trim() ?? "";
          return answer.type === 15 && Boolean(data) && !/\s\.$/.test(data);
        }
      );

    return hasMailServer
      ? { valid: true, email: `${localPart}@${domain}` }
      : { valid: false, error: "domain" };
  } catch {
    return { valid: false, error: "unavailable" };
  }
}
