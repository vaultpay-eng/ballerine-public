export const THREE_DAYS = 3;
export const SEVEN_DAYS = 7;
export const TWENTY_ONE_DAYS = 21;

export const daysToMinutesConverter = (days: number) => days * 24 * 60;

export const ALERT_DEDUPE_STRATEGY_DEFAULT = {
  mute: false,
  cooldownTimeframeInMinutes: daysToMinutesConverter(SEVEN_DAYS),
};

export const AlertExecutionStatus = {
  SUCCEEDED: 'SUCCEEDED',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED',
} as const;

export const MerchantAlertLabel = {
  MERCHANT_ONGOING_RISK_ALERT_THRESHOLD: 'MERCHANT_ONGOING_RISK_ALERT_THRESHOLD',
  MERCHANT_ONGOING_RISK_ALERT_PERCENTAGE: 'MERCHANT_ONGOING_RISK_ALERT_PERCENTAGE',
  MERCHANT_ONGOING_RISK_ALERT_RISK_INCREASE: 'MERCHANT_ONGOING_RISK_ALERT_RISK_INCREASE',
} as const;
