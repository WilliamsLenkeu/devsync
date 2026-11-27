/** Milk Desk v5 — scoped board/task surfaces (chrome owns global tokens). */
export const MILK = {
  canvas: '#F8F9FA',
  surface: '#FFFFFF',
  hairline: '#DEE2E6',
  ink: '#212529',
  muted: '#8F8F8F',
  primary: '#017E84',
  primaryFg: '#FFFFFF',
  secondaryBg: '#E9ECEF',
  secondaryBorder: '#6C757D',
  danger: '#DC3545',
  warn: '#F0AD4E',
  success: '#28A745',
  info: '#17A2B8',
  shadow: '0 1px 3px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.04)',
  shadowLift: '0 4px 12px rgba(0,0,0,.1)',
} as const;

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined'
    ? (window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false)
    : false;
}

/** Odoo Milk–style status chips (readable, not color-only — pair with text). */
export const STATUS_CHIP: Record<string, string> = {
  BACKLOG: 'bg-[#E9ECEF] text-[#495057]',
  TODO: 'bg-[#D1ECF1] text-[#0C5460]',
  IN_PROGRESS: 'bg-[#017E84]/15 text-[#017E84]',
  IN_REVIEW: 'bg-[#FFF3CD] text-[#856404]',
  DONE: 'bg-[#D4EDDA] text-[#155724]',
};

/** Column top rail + segmented progress fills (hex for inline styles). */
export const STATUS_ACCENT: Record<string, string> = {
  BACKLOG: '#6C757D',
  TODO: '#17A2B8',
  IN_PROGRESS: '#017E84',
  IN_REVIEW: '#F0AD4E',
  DONE: '#28A745',
};

export const PRIORITY_CHIP: Record<string, string> = {
  URGENT: 'bg-[#F8D7DA] text-[#721C24]',
  HIGH: 'bg-[#FFF3CD] text-[#856404]',
  MEDIUM: 'bg-[#D1ECF1] text-[#0C5460]',
  LOW: 'bg-[#E9ECEF] text-[#6C757D]',
};

export const PRIORITY_RAIL: Record<string, string> = {
  URGENT: '#DC3545',
  HIGH: '#F0AD4E',
  MEDIUM: '#17A2B8',
  LOW: '#ADB5BD',
};
