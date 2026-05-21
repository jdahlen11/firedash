// FireDash v22 Design Tokens — Light Theme

export const colors = {
  void:       '#EEF2F9',
  bg:         '#F4F7FD',
  card:       '#FFFFFF',
  cardHover:  '#EAF0FB',
  border:     '#C5D0E6',
  text:       '#13223D',
  textSec:    '#3B5280',
  textDim:    '#7A8DAA',
  cyan:       '#0078A0',
  red:        '#C92020',
  amber:      '#B05A00',
  green:      '#1A7A52',
  indigo:     '#4338CA',
} as const;

export const fonts = {
  sans: '"Inter", system-ui, sans-serif',
  mono: '"JetBrains Mono", "SF Mono", monospace',
} as const;

export type ColorKey = keyof typeof colors;
