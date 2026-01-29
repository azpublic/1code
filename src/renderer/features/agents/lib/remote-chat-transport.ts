/**
 * Remote chat transport for sandbox chats
 * DISABLED: 21st.dev backend has been disabled for local-only operation
 */

import type { ChatTransport, UIMessage } from "ai"

type UIMessageChunk = any

type RemoteChatTransportConfig = {
  chatId: string
  subChatId: string
  subChatName: string
  sandboxUrl: string
  mode: "plan" | "agent"
  model?: string
}

/**
 * Remote chat transport for sandbox chats
 * DISABLED: 21st.dev backend has been disabled for local-only operation
 */
export class RemoteChatTransport implements ChatTransport<UIMessage> {
  constructor(private config: RemoteChatTransportConfig) {
    throw new Error("21st.dev remote chat backend is disabled. The app now operates in local-only mode.")
  }

  async sendMessages(_options: {
    messages: UIMessage[]
    abortSignal?: AbortSignal
  }): Promise<ReadableStream<UIMessageChunk>> {
    throw new Error("21st.dev remote chat backend is disabled. The app now operates in local-only mode.")
  }

  async reconnectToStream(): Promise<ReadableStream<UIMessageChunk> | null> {
    throw new Error("21st.dev remote chat backend is disabled. The app now operates in local-only mode.")
  }
}
