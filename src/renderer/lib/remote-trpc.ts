/**
 * tRPC client for remote web backend (21st.dev)
 * DISABLED: 21st.dev API has been disabled for local-only operation
 */

import type { AppRouter } from "../../../../web/server/api/root"
import { createTRPCClient, httpLink } from "@trpc/client"
import SuperJSON from "superjson"

/**
 * Stub tRPC client that throws errors when used
 * The 21st.dev remote backend has been disabled - app operates in local-only mode
 */
const createDisabledClient = (): any => ({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  query: (...args: any[]) => {
    throw new Error("21st.dev remote API is disabled. The app now operates in local-only mode.")
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mutation: (...args: any[]) => {
    throw new Error("21st.dev remote API is disabled. The app now operates in local-only mode.")
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  subscription: (...args: any[]) => {
    throw new Error("21st.dev remote API is disabled. The app now operates in local-only mode.")
  },
})

/**
 * Disabled tRPC client - throws error when attempting to use remote backend
 */
export const remoteTrpc = createDisabledClient() as ReturnType<typeof createTRPCClient<AppRouter>>
