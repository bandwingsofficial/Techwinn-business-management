/** Widget keys for modules that are not implemented in the product yet. */
const UNIMPLEMENTED_WIDGET_PREFIXES = ['finance.'] as const;

export function isShippedDashboardWidget(widgetKey: string): boolean {
  return !UNIMPLEMENTED_WIDGET_PREFIXES.some((prefix) => widgetKey.startsWith(prefix));
}