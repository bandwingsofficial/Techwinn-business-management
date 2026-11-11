import type { WhatsAppConversationListQuery } from "#validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface ListWhatsAppConversationsQuery {
  readonly actor: WhatsAppActor;
  readonly query: WhatsAppConversationListQuery;
}
