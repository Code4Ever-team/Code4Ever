export interface InstantPush {
  messageId: string;
  senderUsername: string;
}

const pendingByUser = new Map<string, InstantPush[]>();

export function enqueueInstantPush(receiverId: string, payload: InstantPush): void {
  const list = pendingByUser.get(receiverId) ?? [];
  list.push(payload);
  pendingByUser.set(receiverId, list);
}

export function drainInstantPushes(receiverId: string): InstantPush[] {
  const list = pendingByUser.get(receiverId) ?? [];
  pendingByUser.delete(receiverId);
  return list;
}
