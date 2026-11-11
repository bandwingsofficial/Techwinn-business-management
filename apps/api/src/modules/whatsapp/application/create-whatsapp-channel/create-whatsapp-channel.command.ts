import type { WhatsAppCreateChannelRequest } from "#validation";
import type { CrmRequestContext } from "../../../../platform/tenant-context/index.js";
export interface CreateWhatsAppChannelCommand {
  readonly ctx: CrmRequestContext;
  readonly input: WhatsAppCreateChannelRequest;
}
