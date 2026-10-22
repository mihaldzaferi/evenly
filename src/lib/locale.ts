const EURO_AREA = new Set([
  'AT', 'BE', 'BG', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'HR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SI', 'SK',
])
const BY_REGION: Record<string, string> = {
  NO: 'NOK', SE: 'SEK', DK: 'DKK', IS: 'ISK', GB: 'GBP', CH: 'CHF', PL: 'PLN', CZ: 'CZK', HU: 'HUF', RO: 'RON',
  TR: 'TRY', US: 'USD', CA: 'CAD', MX: 'MXN', BR: 'BRL', AU: 'AUD', NZ: 'NZD', JP: 'JPY', CN: 'CNY', KR: 'KRW',
  IN: 'INR', SG: 'SGD', HK: 'HKD', ZA: 'ZAR', AE: 'AED', TH: 'THB',
}
/** Languages that usually imply a country when the browser gives no region ("nb" → Norway). */
const BY_LANGUAGE: Record<string, string> = { nb: 'NOK', nn: 'NOK', no: 'NOK', sv: 'SEK', da: 'DKK', is: 'ISK', ja: 'JPY', pl: 'PLN' }

/** A sensible default currency for new groups, from the browser's language settings. */
export function defaultCurrency(languages: readonly string[] = navigator.languages ?? [navigator.language]): string {
  for (const tag of languages) {
    try {
      const locale = new Intl.Locale(tag).maximize()
      if (locale.region && BY_REGION[locale.region]) return BY_REGION[locale.region]
      if (locale.region && EURO_AREA.has(locale.region)) return 'EUR'
      if (BY_LANGUAGE[locale.language]) return BY_LANGUAGE[locale.language]
    } catch {
      // Ignore malformed language tags.
    }
  }
  return 'EUR'
}
