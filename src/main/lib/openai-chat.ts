/**
 * OpenAI-style chat completion utility
 *
 * Handles chat completions for OpenAI-compatible APIs (like z.ai)
 * Used for APP TASKS (chat name generation, commit message generation)
 * when the model profile's apiFormat is "openai".
 */

export interface OpenAIChatOptions {
  /** The user prompt to send */
  prompt: string
  /** Optional system prompt to guide the AI's behavior */
  systemPrompt?: string
  /** Model name (e.g., "glm-4.7", "gpt-4", etc.) */
  model: string
  /** API key for authentication */
  apiKey: string
  /** Base URL (e.g., "https://api.openai.com/v1", "https://api.z.ai/api/paas/v4") */
  baseUrl: string
  /** Maximum tokens to generate (default: 100) */
  maxTokens?: number
  /** Temperature for randomness (default: 0.7) */
  temperature?: number
  /** Request structured JSON output (e.g., {"type": "json_object"}) */
  responseFormat?: { type: "json_object" } | null
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant"
  content: string
}

interface OpenAIResponse {
  choices: Array<{
    message: {
      content?: string
      reasoning_content?: string  // z.ai glm-4.7 uses this field for reasoning output
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

/**
 * Perform a chat completion using OpenAI-compatible API format
 *
 * @param options - Chat completion options
 * @returns The generated text content, or parsed object if responseFormat is json_object
 * @throws Error if the request fails
 */
export async function openAIChatCompletion(
  options: OpenAIChatOptions,
): Promise<string | Record<string, unknown>> {
  const {
    prompt,
    systemPrompt,
    model,
    apiKey,
    baseUrl,
    maxTokens = 100,
    temperature = 0.7,
    responseFormat,
  } = options

  // Build messages array
  const messages: OpenAIMessage[] = []

  // Add system prompt if provided
  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    })
  }

  // Add user prompt
  messages.push({
    role: "user",
    content: prompt,
  })

  // Ensure baseUrl doesn't end with slash for consistent URL construction
  const cleanBaseUrl = baseUrl.replace(/\/$/, "")
  const url = `${cleanBaseUrl}/chat/completions`

  console.log("[OpenAIChat] Sending request to:", url)
  console.log("[OpenAIChat] Model:", model)
  console.log("[OpenAIChat] Messages:", messages.length)
  console.log("[OpenAIChat] Response format:", responseFormat?.type || "text")

  try {
    const requestBody: Record<string, unknown> = {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    }


    console.log("[OpenAIChat] requestBody:", requestBody);

    // Add response_format if specified (for structured JSON output)
    if (responseFormat) {
      requestBody.response_format = responseFormat
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[OpenAIChat] Request failed:", response.status, errorText)
      throw new Error(
        `OpenAI API request failed: ${response.status} ${response.statusText} - ${errorText}`,
      )
    }

    const data = (await response.json()) as OpenAIResponse

    if (!data.choices?.[0]) {
      console.error("[OpenAIChat] Invalid response:", data)
      throw new Error("Invalid response from OpenAI API")
    }

    const choice = data.choices[0]
    const message = choice.message || {}

    // Try content first, then fall back to reasoning_content (for z.ai glm-4.7)
    let content = message.content?.trim() || ""
    if (!content && message.reasoning_content) {
      content = message.reasoning_content.trim()
    }

    if (!content) {
      console.error("[OpenAIChat] Empty response:", data)
      throw new Error("Empty response from API")
    }

    console.log("[OpenAIChat] Tokens used:", data.usage?.total_tokens || "unknown")
    console.log("[OpenAIChat] Finish reason:", choice.finish_reason)

    // Warn if we hit token limit
    if (choice.finish_reason === "length") {
      console.warn("[OpenAIChat] Response hit token limit, consider increasing maxTokens")
    }

    // If response_format is json_object, parse and return the JSON object
    if (responseFormat?.type === "json_object") {
      try {
        const parsed = JSON.parse(content) as Record<string, unknown>
        console.log("[OpenAIChat] Generated JSON:", parsed)
        return parsed
      } catch (parseError) {
        console.error("[OpenAIChat] Failed to parse JSON response:", content)
        throw new Error(`Failed to parse JSON response: ${parseError}`)
      }
    }

    // Otherwise return raw text content
    console.log("[OpenAIChat] Generated content:", content)
    return content
  } catch (error) {
    console.error("[OpenAIChat] Error:", error)
    throw error
  }
}
