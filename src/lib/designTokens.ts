// FireDash v22 Design Tokens

export const colors = {
  void:       '#0B1120',
  bg:         '#101828',
  card:       '#151F32',
  cardHover:  '#192843',
  border:     '#1C2B48',
  text:       '#E8ECF4',
  textSec:    '#9EAEC7',
  textDim:    '#5A6D8A',
  cyan:       '#00C2E0',
  red:        '#EF4444',
  amber:      '#F59E0B',
  green:      '#10B981',
  indigo:     '#818CF8',
} as const;

export const fonts = {
  sans: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", monospace',
} as const;

export type ColorKey = keyof typeof colors;
