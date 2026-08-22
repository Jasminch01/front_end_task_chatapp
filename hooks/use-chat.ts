"use client";

/**
 * Everything the chat panel needs: history, older pages, sending, and live updates.
 *
 * The query cache is the single source of truth. Socket events and optimistic sends
 * both write into it through mergeMessages, so REST responses and socket events can
 * never race each other into two different lists.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { conversations, messages as messagesApi } from "@/lib/api/endpoints";
import { mergeMessages, normalizeMessage } from "@/lib/normalize";
import { queryKeys } from "@/lib/query-keys";
import { getSocket, type ConnectionStatus } from "@/lib/socket";
import { useAuth } from "@/lib/auth";
import type { Conversation, Message } from "@/types/chat";

const PAGE_SIZE = 25;

type MessagePage = { messages: Message[]; hasMore: boolean };

/** The sidebar list. */
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations(),
    queryFn: conversations.list,
  });
}

/**
 * One socket for the app. It is the only writer for socket-sourced data, which is what
 * keeps REST and realtime from fighting over the same cache entry.
 *
 * Events are per-user, not per-conversation — there is no join/subscribe call — so this
 * updates every conversation the user is in, not just the open one.
 */
export function useChatSocket() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ConnectionStatus>("connecting");

  useEffect(() => {
    if (!token) return;
    const socket = getSocket(token);

    const onConnect = () => setStatus("connected");

    const onDisconnect = () => setStatus("disconnected");

    const onReconnect = () => {
      setStatus("connected");
      // Nothing is replayed after a reconnect, so anything sent while we were away is
      // simply missing. Refetch rather than trust the socket.
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      queryClient.invalidateQueries({ queryKey: ["messages"] });
    };

    const onMessage = (raw: Record<string, unknown>) => {
      const message = normalizeMessage(raw);
      if (!message.id || !message.conversationId) return;

      // Append to that conversation's list — it may not be the open one.
      queryClient.setQueryData<MessagePage>(
        queryKeys.messages(message.conversationId),
        (prev) =>
          prev
            ? { ...prev, messages: mergeMessages(prev.messages, [message]) }
            : prev,
      );

      // And bump the sidebar so the preview and ordering stay right.
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    };

    const onConversationUpdated = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.io.on("reconnect", onReconnect);
    socket.on("message:new", onMessage);
    socket.on("conversation:updated", onConversationUpdated);

    // The socket may already be open from a previous mount, in which case the
    // `connect` event has been and gone — sync to its current state once.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (socket.connected) setStatus("connected");

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.io.off("reconnect", onReconnect);
      socket.off("message:new", onMessage);
      socket.off("conversation:updated", onConversationUpdated);
    };
  }, [token, queryClient]);

  return status;
}

export function useMessages(conversationId: string) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const loadingOlderRef = useRef(false);

  const query = useQuery({
    queryKey: queryKeys.messages(conversationId),
    queryFn: () => conversations.history(conversationId, { limit: PAGE_SIZE }),
    enabled: !!conversationId,
  });

  const loadOlder = useCallback(async () => {
    // One page in flight at a time, or a fast scroll fires this repeatedly.
    if (loadingOlderRef.current) return false;

    const current = queryClient.getQueryData<MessagePage>(
      queryKeys.messages(conversationId),
    );
    if (!current?.hasMore || current.messages.length === 0) return false;

    loadingOlderRef.current = true;
    setIsLoadingOlder(true);
    try {
      const oldest = current.messages[0];
      const page = await conversations.history(conversationId, {
        limit: PAGE_SIZE,
        before: oldest.id,
      });

      // `before` is inclusive, so the first item of this page is the message we used
      // as the cursor. mergeMessages dedupes it by id, but dropping it here keeps the
      // page count honest for the hasMore check.
      const older = page.messages.filter((m) => m.id !== oldest.id);

      queryClient.setQueryData<MessagePage>(queryKeys.messages(conversationId), (prev) =>
        prev
          ? { messages: mergeMessages(prev.messages, older), hasMore: page.hasMore }
          : prev,
      );
      return true;
    } finally {
      loadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [conversationId, queryClient]);

  /**
   * Optimistic send.
   *
   * The sender never receives their own `message:new`, so the HTTP response is the only
   * confirmation — which also means a sent message can never arrive twice.
   */
  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !user) return;

      const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const optimistic: Message = {
        id: tempId,
        tempId,
        conversationId,
        senderId: user.id,
        text: trimmed,
        createdAt: new Date(),
        status: "pending",
      };

      const key = queryKeys.messages(conversationId);
      queryClient.setQueryData<MessagePage>(key, (prev) =>
        prev
          ? { ...prev, messages: mergeMessages(prev.messages, [optimistic]) }
          : { messages: [optimistic], hasMore: false },
      );

      try {
        const saved = await messagesApi.send(conversationId, trimmed);
        queryClient.setQueryData<MessagePage>(key, (prev) =>
          prev
            ? {
                ...prev,
                // tempId on the confirmed message tells mergeMessages which optimistic
                // entry to replace rather than sit beside.
                messages: mergeMessages(prev.messages, [{ ...saved, tempId }]),
              }
            : prev,
        );
        queryClient.invalidateQueries({ queryKey: queryKeys.conversations() });
      } catch {
        // Never discard the user's text — mark it and let them retry.
        queryClient.setQueryData<MessagePage>(key, (prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === tempId ? { ...m, status: "failed" as const } : m,
                ),
              }
            : prev,
        );
      }
    },
    [conversationId, queryClient, user],
  );

  const retry = useCallback(
    async (message: Message) => {
      const key = queryKeys.messages(conversationId);
      queryClient.setQueryData<MessagePage>(key, (prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== message.id) }
          : prev,
      );
      await send(message.text);
    },
    [conversationId, queryClient, send],
  );

  const discard = useCallback(
    (message: Message) => {
      queryClient.setQueryData<MessagePage>(queryKeys.messages(conversationId), (prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== message.id) }
          : prev,
      );
    },
    [conversationId, queryClient],
  );

  return {
    messages: query.data?.messages ?? [],
    hasMore: query.data?.hasMore ?? false,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
    isLoadingOlder,
    loadOlder,
    send,
    retry,
    discard,
  };
}

/** Resolve a conversation from the already-loaded sidebar list. */
export function useConversation(conversationId: string): Conversation | undefined {
  const { data } = useConversations();
  return data?.find((c) => c.id === conversationId);
}
