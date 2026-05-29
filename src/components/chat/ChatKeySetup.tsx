"use client";

import { useEffect } from "react";
import { saveChatPublicKeyAction } from "@/lib/actions/chat.actions";
import {
  exportPublicKeyJwk,
  getOrCreateChatKeyPair,
} from "@/lib/crypto/e2ee-chat";

/** İlk mesajlaşmada cihaz anahtarını üretir ve açık anahtarı sunucuya yazar. */
export function ChatKeySetup() {
  useEffect(() => {
    let cancelled = false;

    async function setup() {
      try {
        const pair = await getOrCreateChatKeyPair();
        const jwk = await exportPublicKeyJwk(pair.publicKey);
        if (!cancelled) await saveChatPublicKeyAction(jwk);
      } catch {
        // Tarayıcı Web Crypto desteklemiyorsa sessiz kal
      }
    }

    void setup();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
