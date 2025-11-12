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
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey || apiKey.length === 0) {
    console.error('[OpenAI Client] getClient() - API key missing', {
      hasKey: !!process.env.OPENAI_API_KEY,
      keyLength: process.env.OPENAI_API_KEY?.length || 0,
      keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 10) || 'none'
    });
    throw new LLMServiceError(
      'OpenAI API key is missing. Set OPENAI_API_KEY in your environment.',
      false
    );
  }
  if (!client) {
    console.log('[OpenAI Client] Creating new OpenAI client', {
      keyPrefix: apiKey.substring(0, 7),
      isProjectKey: apiKey.startsWith('sk-proj')
    });
    client = new OpenAI({ apiKey });
    // Store API key for comparison
    (client as any).apiKey = apiKey;
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
    // Validate API key first - reload from env to ensure it's fresh
    // dotenv.config() is called at the top, but we need to ensure it's loaded
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    
    if (!apiKey || apiKey.length === 0) {
      const error = new LLMServiceError(
        'OpenAI API key is missing. Set OPENAI_API_KEY in your environment variables.',
        false
      );
      console.error('[OpenAI Client] API key validation failed:', {
        hasKey: !!process.env.OPENAI_API_KEY,
        keyLength: process.env.OPENAI_API_KEY?.length || 0,
        keyPrefix: process.env.OPENAI_API_KEY?.substring(0, 7) || 'none',
        envKeys: Object.keys(process.env).filter(k => k.includes('OPENAI'))
      });
      throw error;
    }

    // Reset client if API key changed
    if (client && (client as any).apiKey !== apiKey) {
      client = null;
    }

    const c = getClient();
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
      console.log('[OpenAI Client] Making API call', {
        model,
        messageCount: messages.length,
        isProjectKey,
        retryContext: options.retryContext || 'default',
        hasApiKey: !!apiKey,
        keyPrefix: apiKey.substring(0, 7)
      });

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
        
        if (!content || content.trim().length === 0) {
          console.warn('[OpenAI Client] Empty response from Responses API');
          throw new LLMServiceError('Empty response from OpenAI API', true);
        }
        
        console.log('[OpenAI Client] Successfully got response', { length: content.length });
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
        const sanitizedContent = sanitize(content);
        
        if (!sanitizedContent || sanitizedContent.trim().length === 0) {
          console.warn('[OpenAI Client] Empty response from Chat Completions API', {
            hasResult: !!result,
            hasChoices: !!(result?.choices),
            choicesLength: result?.choices?.length || 0,
            hasMessage: !!msg,
            rawContent: content
          });
          throw new LLMServiceError('Empty response from OpenAI API', true);
        }
        
        console.log('[OpenAI Client] Successfully got response', { length: sanitizedContent.length });
        return sanitizedContent;
      }
    } catch (error: any) {
      // Log detailed error information
      console.error('[OpenAI Client] API call failed', {
        error: error.message,
        errorType: error.constructor.name,
        status: error.status || error.response?.status,
        code: error.code,
        isRetryable: error instanceof LLMServiceError ? error.retryable : true,
        hasApiKey: !!apiKey,
        keyPrefix: apiKey?.substring(0, 7) || 'none',
        model,
        retryContext: options.retryContext
      });
      
      // Optional offline/demo fallback: allow engine to proceed using contextual fallbacks
      if (process.env.ALLOW_DEMO_FALLBACK === 'true') {
        console.warn('[OpenAI Client] Using demo fallback mode - returning empty string');
        return '';
      }
      throw error;
    }
  };

  return retryWithBackoff(run, 2, 750, options.retryContext || 'OpenAI chatCompletion');
}