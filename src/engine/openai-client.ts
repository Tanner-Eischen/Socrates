import dotenv from 'dotenv';
dotenv.config({ override: true });
import OpenAI from 'openai';
import { handleOpenAIError, retryWithBackoff } from '../lib/error-utils';
import { LLMServiceError } from '../api/middleware/errorHandler';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export interface ChatOptions {
  model?: string;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  presence_penalty?: number;
  frequency_penalty?: number;
  retryContext?: string;
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new LLMServiceError(
      'OpenAI API key is missing. Set OPENAI_API_KEY in your environment.',
      false
    );
  }
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client!;
}

export async function chatCompletion(
  messages: ChatMessage[],
  options: ChatOptions = {}
): Promise<string> {
  const model = options.model ?? 'gpt-4o-mini';
  const temperature = options.temperature ?? 0.7;
  const top_p = options.top_p ?? 1;
  const max_tokens = options.max_tokens ?? 150;
  const presence_penalty = options.presence_penalty ?? 0.6;
  const frequency_penalty = options.frequency_penalty ?? 0.2;

  const run = async () => {
    const c = getClient();
    const apiKey = process.env.OPENAI_API_KEY || '';
    const isProjectKey = apiKey.startsWith('sk-proj');

    const sanitize = (text: string): string => {
      return (text || '')
        .replace(/^\s*(assistant|system|user)\s*:\s*/i, '')
        .replace(/\bASSISTANT:\s*/g, '')
        .replace(/\bSYSTEM:\s*/g, '')
        .replace(/\bUSER:\s*/g, '')
        .trim();
    };

    try {
      if (isProjectKey) {
        // Use Responses API for project keys
        const input = messages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');
        const resp = await handleOpenAIError(async () => {
          return await c.responses.create({
            model,
            input,
            temperature,
            top_p,
            max_output_tokens: max_tokens,
            metadata: { ctx: options.retryContext || 'OpenAI responses' }
          } as any);
        }, options.retryContext || 'OpenAI responses');
        const content = sanitize(((resp as any).output_text || ''));
        return content;
      } else {
        // Legacy Chat Completions API for standard keys
        const result = await handleOpenAIError(async () => {
          return await c.chat.completions.create({
            model,
            messages,
            temperature,
            top_p,
            max_tokens,
            presence_penalty,
            frequency_penalty
          });
        }, options.retryContext || 'OpenAI chatCompletion');
        const choice = result && result.choices && result.choices[0];
        const msg = choice && choice.message ? choice.message : undefined;
        const content = msg && typeof msg.content === 'string' ? msg.content : '';
        return sanitize(content);
      }
    } catch (error: any) {
      // Optional offline/demo fallback: allow engine to proceed using contextual fallbacks
      if (process.env.ALLOW_DEMO_FALLBACK === 'true') {
        return '';
      }
      throw error;
    }
  };

  return retryWithBackoff(run, 2, 750, 'OpenAI chatCompletion');
}