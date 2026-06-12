import { useAppStore, Currency } from "@/store/useAppStore"
import { useMemo } from "react"

const EXCHANGE_RATES: Record<Currency, number> = {
  USD: 1,
  INR: 83.5,
  EUR: 0.92,
  GBP: 0.79,
  AED: 3.67,
  SAR: 3.75,
}

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  INR: '₹',
  EUR: '€',
  GBP: '£',
  AED: 'د.إ',
  SAR: '﷼',
}

export function useCurrencyFormatter() {
  const { currency } = useAppStore()

  const formatCurrency = useMemo(() => {
    return (usdValue: number, compact = false) => {
      const rate = EXCHANGE_RATES[currency] || 1
      const converted = usdValue * rate
      
      if (compact) {
        if (converted >= 1_000_000) {
          return `${CURRENCY_SYMBOLS[currency]}${(converted / 1_000_000).toFixed(1)}M`
        }
        if (converted >= 1_000) {
          return `${CURRENCY_SYMBOLS[currency]}${(converted / 1_000).toFixed(1)}K`
        }
        return `${CURRENCY_SYMBOLS[currency]}${converted.toFixed(0)}`
      }

      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 0,
      }).format(converted)
    }
  }, [currency])

  return { formatCurrency, currency, rate: EXCHANGE_RATES[currency] }
}
