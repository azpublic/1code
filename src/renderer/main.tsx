// Console log immediately to help diagnose startup issues
console.log("[main.tsx] Starting renderer initialization...")

// Why Did You Render - MUST be first import (before React)
try {
  console.log("[main.tsx] Importing wdyr...")
  import("./wdyr")
  console.log("[main.tsx] WDYR imported successfully")
} catch (error) {
  console.error("[main.tsx] Failed to import wdyr:", error)
}

// Only initialize Sentry in production to avoid IPC errors in dev mode
if (import.meta.env.PROD) {
  console.log("[main.tsx] Initializing Sentry...")
  import("@sentry/electron/renderer").then((Sentry) => {
    Sentry.init()
    console.log("[main.tsx] Sentry initialized")
  }).catch((error) => {
    console.error("[main.tsx] Failed to initialize Sentry:", error)
  })
}

console.log("[main.tsx] Importing ReactDOM...")
import ReactDOM from "react-dom/client"
console.log("[main.tsx] Importing App...")
import { App } from "./App"
console.log("[main.tsx] Importing styles...")
import "./styles/globals.css"
console.log("[main.tsx] Importing diff highlighter...")
import { preloadDiffHighlighter } from "./lib/themes/diff-view-highlighter"

// Preload shiki highlighter for diff view (prevents delay when opening diff sidebar)
console.log("[main.tsx] Preloading diff highlighter...")
preloadDiffHighlighter()
console.log("[main.tsx] Diff highlighter preloaded")

// Suppress ResizeObserver loop error - this is a non-fatal browser warning
// that can occur when layout changes trigger observation callbacks
// Common with virtualization libraries and diff viewers
const resizeObserverErr = /ResizeObserver loop/

// Handle both error event and unhandledrejection
window.addEventListener("error", (e) => {
  if (e.message && resizeObserverErr.test(e.message)) {
    e.stopImmediatePropagation()
    e.preventDefault()
    return false
  }
})

// Also override window.onerror for broader coverage
const originalOnError = window.onerror
window.onerror = (message, source, lineno, colno, error) => {
  if (typeof message === "string" && resizeObserverErr.test(message)) {
    return true // Suppress the error
  }
  if (originalOnError) {
    return originalOnError(message, source, lineno, colno, error)
  }
  return false
}

// Global DevTools keyboard shortcut: Ctrl/Cmd + Shift + D
// Always available, no need to unlock via 5-click feature
window.addEventListener("keydown", (e) => {
  // Check for Ctrl/Cmd + Shift + D
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "d" || e.key === "D")) {
    e.preventDefault()
    console.log("[DevTools] Toggling DevTools via Ctrl/Cmd+Shift+D")
    window.desktopApi?.toggleDevTools()
  }
})

// Handle unhandled promise rejections (e.g., "Failed to fetch" errors)
// This prevents the "black screen of death" from async errors
window.addEventListener("unhandledrejection", (event) => {
  // Log the error for debugging
  console.error("[Unhandled Promise Rejection]:", event.reason)

  // Prevent the default browser error page/black screen
  event.preventDefault()

  // Show a toast notification for the user
  // We need to import toast dynamically since this is at the module level
  import("sonner").then(({ toast }) => {
    const errorMessage = event.reason?.message || String(event.reason) || "An unexpected error occurred"

    // Don't show toasts for ResizeObserver errors (already handled above)
    if (typeof errorMessage === "string" && resizeObserverErr.test(errorMessage)) {
      return
    }

    // Special handling for "Failed to fetch" errors from tRPC subscriptions
    // This typically happens when trying to send a message while another is being processed
    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
      toast("Message queued", {
        description: "Claude is still busy. Your message will be sent when ready.",
        duration: 4000,
      })
      return
    }

    toast.error("Something went wrong", {
      description: errorMessage.length > 200
        ? errorMessage.slice(0, 200) + "..."
        : errorMessage,
      duration: 8000,
      action: {
        label: "Copy Error",
        onClick: () => {
          const errorDetails = typeof event.reason === "object"
            ? JSON.stringify(event.reason, null, 2)
            : String(event.reason)
          navigator.clipboard.writeText(errorDetails)
          toast.success("Error details copied")
        },
      },
    })
  }).catch(() => {
    // If toast import fails, try to alert the user (last resort)
    console.warn("[Toast] Failed to show toast notification")
    // Don't use alert() as it can also cause issues
  })
})

// ADDITIONAL: Catch ALL errors that might slip through
// This is a last resort to prevent the app from completely crashing
window.addEventListener("error", (e) => {
  const errorMessage = e.message || String(e.error) || "Unknown error"

  // Already handled ResizeObserver
  if (resizeObserverErr.test(errorMessage)) {
    return
  }

  console.error("[Window Error]", errorMessage)

  // Prevent default to avoid browser's default error page
  e.preventDefault()
  e.stopImmediatePropagation()

  // Try to show a toast
  import("sonner").then(({ toast }) => {
    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("fetch")) {
      toast("Message queued", {
        description: "Claude is still busy. Your message will be sent when ready.",
        duration: 4000,
      })
    } else {
      toast.error("Error", {
        description: errorMessage.slice(0, 200),
        duration: 5000,
      })
    }
  }).catch(() => {
    // Last resort - just log it
    console.error("[Critical] Error occurred but toast failed:", errorMessage)
  })
}, true) // Use capture phase to catch errors early

console.log("[main.tsx] Getting root element...")
const rootElement = document.getElementById("root")

if (rootElement) {
  console.log("[main.tsx] Root element found, creating React root...")
  ReactDOM.createRoot(rootElement).render(<App />)
  console.log("[main.tsx] React render initiated")
} else {
  console.error("[main.tsx] Root element not found!")
}

// LAST RESORT: Prevent the page from ever being completely blank
// If everything else fails, show a minimal recovery UI
setTimeout(() => {
  // Check if the app has rendered anything visible
  const root = document.getElementById("root")
  if (root && root.children.length === 0) {
    console.error("[CRITICAL] App rendered nothing! Showing fallback UI")
    root.innerHTML = `
      <div style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #1a1a1a;
        color: #fff;
        padding: 20px;
        border-radius: 8px;
        font-family: sans-serif;
        z-index: 999999;
      ">
        <h2 style="margin: 0 0 10px 0;">App failed to load</h2>
        <p style="margin: 0 0 20px 0;">Try restarting the app.</p>
        <button onclick="location.reload()" style="
          padding: 8px 16px;
          background: #007acc;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        ">Reload</button>
      </div>
    `
  }
}, 3000)
