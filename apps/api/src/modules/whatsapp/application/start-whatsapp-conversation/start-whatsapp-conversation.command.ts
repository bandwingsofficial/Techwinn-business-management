import type { WhatsAppStartConversationRequest } from "#validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface StartWhatsAppConversationCommand {
  readonly actor: WhatsAppActor;
  readonly input: WhatsAppStartConversationRequest;
}
