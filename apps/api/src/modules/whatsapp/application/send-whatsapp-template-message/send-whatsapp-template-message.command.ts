import type { WhatsAppSendTemplateRequest } from "#validation";
import type { WhatsAppActor } from "../shared/whatsapp-actor.js";
export interface SendWhatsAppTemplateMessageCommand {
  readonly actor: WhatsAppActor;
  readonly conversationId: string;
  readonly input: WhatsAppSendTemplateRequest;
}
