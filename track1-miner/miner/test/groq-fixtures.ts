/** Offline stand-ins for Groq's chat-completions API, for tests of routes that call llm.ts. */
import { resetPhraseState } from "../src/llm";

/** A chat-completions answer whose message is `content`. */
export const groqReply = (content: string): Response =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

/** Runs `fn` with a placeholder key set and the phrase cache cleared, restoring the key after. */
export async function withGroqKey<T>(fn: () => Promise<T>): Promise<T> {
  const original = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key-not-real";
  resetPhraseState();
  try {
    return await fn();
  } finally {
    if (original === undefined) delete process.env.GROQ_API_KEY;
    else process.env.GROQ_API_KEY = original;
    resetPhraseState();
  }
}
