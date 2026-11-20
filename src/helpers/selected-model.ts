/**
 * Función para centralizar el modelo a usar en el proyecto
 *
 * También agregué otras opciones si lo quieres cambiar
 */

// Groq:
// npm i @ai-sdk/groq
import { groq } from '@ai-sdk/groq';

// Anthropic:
// npm i @ai-sdk/anthropic
import { anthropic } from '@ai-sdk/anthropic';

// OpenAI:
// npm i @ai-sdk/openai
import { openai } from '@ai-sdk/openai';

// Gemini:
// npm i @ai-sdk/google
import { google } from '@ai-sdk/google';

// Ollama:
// npm i ollama-ai-provider-v2
// A diferencia de los anteriores, este es un proveedor comunitario.
import { ollama } from 'ollama-ai-provider-v2';

// OpenCode:
// npm i @ai-sdk/openai-compatible
// Es el gateway de OpenCode: sirve los modelos de la Console (pay-as-you-go),
// los de Go y también tus conexiones propias (por ejemplo AWS Bedrock).
import { opencode, opencodeotherProvider, opencodeGo } from './opencode-provider.js';

// Groq:
// export const model = groq('openai/gpt-oss-20b');
// export const model = groq('openai/gpt-oss-120b');

// Anthropic:
// export const model = anthropic('claude-haiku-4-5');

// OpenAI:
// export const model = openai('gpt-5-mini');

// Gemini:
// export const model = google('gemini-2.5-flash');

// Ollama:
// qwen3:4b
//export const model = ollama('qwen3:4b');

// OpenCode Console (pay-as-you-go):
// El formato (Anthropic / Responses / Chat / Google) se detecta solo,
// pero también puedes forzarlo: opencode.chat('glm-5.3-flash')
// export const model = opencode('big-pickle');
// export const model = opencode('claude-haiku-5-5');
// export const model = opencode('gpt-6.1-sol');

// OpenCode Go:
// minimax-m3
// kimi-k3.1-pro
// export const model = opencodeGo('claude-haiku-5-5');
export const model = opencodeGo('minimax-m3');
// export const model = opencodeGo('beam-free');
// export const model = opencodeGo('longcat-2.5-free');

// OpenCode con tus conexiones propias (Other providers inside configured):
// esta conexión (AWS Bedrock) habla OpenAI Chat Completions, así que forzamos
// `api: 'chat'`. Con `api: 'anthropic'` el gateway devuelve un
// `chat.completion` y el AI SDK revienta con "Invalid JSON response".

// MINIMAX MODELS
// export const model = opencodeotherProvider('MiniMax-M3.1-Flash', { api: 'anthropic' });
// export const model = opencodeotherProvider('MiniMax-M3', { api: 'anthropic' });

// BEDROCK MODELS
// export const model = opencodeotherProvider('deepseek.v3.2', { api: 'chat' });
// export const model = opencodeotherProvider('zai.glm-5', { api: 'chat' });

// GOOGLE
// export const model = opencodeotherProvider('gemini-2.5-flash-lite');
