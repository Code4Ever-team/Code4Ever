"use client";

import { useEffect } from "react";
import { saveChatPublicKeyAction } from "@/lib/actions/chat.actions";
import {
  exportPublicKeyJwk,
  getOrCreateChatKeyPair,
} from "@/lib/crypto/e2ee-chat";

export function ChatKeySetup() {
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const pair = await getOrCreateChatKeyPair();
        const jwk = await exportPublicKeyJwk(pair.publicKey);
        if (!cancelled) await saveChatPublicKeyAction(jwk);
      } catch {
      }
    }

    void setup();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
