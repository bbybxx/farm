// Format numbers with spaces for thousands separator and dot for decimals
export function formatNumber(num) {
  if (num === null || num === undefined || num === '') return ''

  if (typeof num === 'string') {
    const trimmed = num.trim()
    if (!trimmed) return ''
    if (/[^\d\s.-]/.test(trimmed)) {
      return num
    }
    const normalized = trimmed.replace(/\s+/g, '')
    if (normalized === '' || normalized === '-' || normalized === '.') {
      return num
    }
    const numericFromString = Number(normalized)
    if (!Number.isFinite(numericFromString)) {
      return num
    }
    num = numericFromString
  }

  if (typeof num !== 'number' || Number.isNaN(num)) {
    return ''
  }
  if (num === 0) return '0'
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = num.toString().split('.')
  
  // Format integer part with spaces
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  
  // Return with dot as decimal separator if there's a decimal part
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
}

export const roundToTwo = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return null
  return Math.round(Number(n) * 100) / 100
}

// Format number with thousand separators (spaces) and dot for decimals, rounded to 2 decimals
export const formatNumberRounded = (n) => {
  if (n === null || n === undefined || n === '') return ''
  const num = Number(n)
  if (Number.isNaN(num)) return n
  // Round to 2 decimals
  const rounded = roundToTwo(num)
  if (rounded === null) return ''
  
  // Split into integer and decimal parts
  const [integerPart, decimalPart] = rounded.toString().split('.')
  
  // Format integer part with spaces
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  
  // Return with dot as decimal separator if there's a decimal part
  return decimalPart ? `${formattedInteger}.${decimalPart}` : formattedInteger
}
