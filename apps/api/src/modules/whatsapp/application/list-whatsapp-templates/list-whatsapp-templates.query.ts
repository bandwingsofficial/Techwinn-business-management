import type { WhatsAppTemplateListQuery } from "#validation";
export interface ListWhatsAppTemplatesQuery {
  readonly organizationId: string;
  readonly query: WhatsAppTemplateListQuery;
}
