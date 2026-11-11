import type { WhatsAppBroadcastAudiencePreviewRequest } from "#validation";
export interface PreviewWhatsAppBroadcastAudienceCommand {
  readonly organizationId: string;
  readonly input: WhatsAppBroadcastAudiencePreviewRequest;
}
