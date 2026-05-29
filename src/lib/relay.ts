import { enqueueInstantPush } from "@/lib/relay-bus";

export interface RelayPushPayload {
  receiverId: string;
  senderUsername: string;
  messageId: string;
}

/**
 * Yeni mesaj sonrası anlık bildirim kuyruğuna ekler (aynı süreç).
 */
export async function pushMessageToRelay(payload: RelayPushPayload): Promise<void> {
  enqueueInstantPush(payload.receiverId, {
    messageId: payload.messageId,
    senderUsername: payload.senderUsername,
  });
}
