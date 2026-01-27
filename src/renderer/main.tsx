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

console.log("[main.tsx] Getting root element...")
const rootElement = document.getElementById("root")

if (rootElement) {
  console.log("[main.tsx] Root element found, creating React root...")
  ReactDOM.createRoot(rootElement).render(<App />)
  console.log("[main.tsx] React render initiated")
} else {
  console.error("[main.tsx] Root element not found!")
}
