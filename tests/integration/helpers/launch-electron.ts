import { ChildProcess, spawn } from 'child_process'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { randomBytes } from 'crypto'
import { mkdtempSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Path to the compiled Electron app
const ELECTRON_MAIN = join(__dirname, '../../../out/main/index.js')

export interface ElectronLaunchOptions {
  /**
   * Test environment to use for this launch
   */
  env: TestEnvironment
  /**
   * Additional environment variables
   */
  extraEnv?: Record<string, string>
  /**
   * Enable debug logging
   */
  debug?: boolean
}

export interface LaunchedElectron {
  process: ChildProcess
  /**
   * Wait for the app to be ready
   */
  waitForReady(): Promise<void>
  /**
   * Kill the Electron process
   */
  kill(): Promise<void>
  /**
   * Get the output logs
   */
  getLogs(): { stdout: string[]; stderr: string[] }
}

/**
 * Launch the Electron app with a test environment
 *
 * Usage:
 * ```ts
 * const env = TestEnvironment.create()
 * const electron = await launchElectron({ env })
 * try {
 *   // Run tests
 * } finally {
 *   await electron.kill()
 *   env.cleanup()
 * }
 * ```
 */
export async function launchElectron(
  options: ElectronLaunchOptions,
): Promise<LaunchedElectron> {
  const { env, extraEnv = {}, debug = false } = options

  const logs: { stdout: string[]; stderr: string[] } = {
    stdout: [],
    stderr: [],
  }

  // Launch the Electron app
  const proc = spawn(process.execPath, [ELECTRON_MAIN], {
    env: {
      ...process.env,
      ...env.getEnv(),
      ...extraEnv,
      // Enable test mode in the app
      NODE_ENV: 'test',
      TEST_MODE: '1',
    },
    stdio: 'pipe',
    detached: false,
  })

  // Capture stdout
  proc.stdout?.on('data', (data) => {
    const output = data.toString()
    logs.stdout.push(output)
    if (debug) {
      console.log('[Electron stdout]', output)
    }
  })

  // Capture stderr
  proc.stderr?.on('data', (data) => {
    const output = data.toString()
    logs.stderr.push(output)
    if (debug) {
      console.error('[Electron stderr]', output)
    }
  })

  // Handle process exit
  proc.on('error', (err) => {
    console.error('[Electron] Process error:', err)
  })

  // Wait for the app to be ready
  let readyResolver: () => void
  const readyPromise = new Promise<void>((resolve) => {
    readyResolver = resolve
  })

  // Look for a ready signal in stdout
  const checkReady = (data: Buffer) => {
    const output = data.toString()
    if (output.includes('APP_READY') || output.includes('Window created')) {
      readyResolver()
    }
  }

  proc.stdout?.on('data', checkReady)

  // Timeout if app doesn't start in 30 seconds
  const timeout = setTimeout(() => {
    readyResolver()
  }, 30000)

  await readyPromise
  clearTimeout(timeout)

  // Remove the ready listener
  proc.stdout?.off('data', checkReady)

  return {
    process: proc,
    waitForReady: async () => {
      // Already waited above, but keep for API consistency
    },
    kill: async () => {
      return new Promise((resolve) => {
        const timeout = setTimeout(() => {
          // Force kill if it doesn't exit gracefully
          proc.kill('SIGKILL')
          resolve()
        }, 5000)

        proc.on('exit', () => {
          clearTimeout(timeout)
          resolve()
        })

        // Try graceful shutdown first
        proc.kill('SIGTERM')
      })
    },
    getLogs: () => logs,
  }
}

// Re-export TestEnvironment for convenience
export { TestEnvironment } from '../fixtures/test-env'
