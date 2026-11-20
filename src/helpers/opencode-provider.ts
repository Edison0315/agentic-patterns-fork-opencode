/**
 * Proveedor externo: OPENCODE
 *
 * OpenCode sirve sus modelos por HTTP, así que podemos consumirlos con el
 * AI SDK igual que lo hacemos con google(), anthropic(), groq() u ollama().
 *
 * Hay tres "sabores" (flavors) disponibles:
 *
 * - console → https://opencode.ai/inference/...        (pay-as-you-go)
 * - go      → https://opencode.ai/inference/go/...     (suscripción Go)
 * - other-provider → https://opencode.ai/inference/custom/... (tus conexiones, p.ej. AWS other-provider)
 *
 * Dentro de cada sabor, un mismo modelo se sirve con una de cuatro APIs:
 * Anthropic Messages, OpenAI Responses, OpenAI Chat Completions o Google
 * Generative AI. Por eso detectamos el formato a partir del model id,
 * y dejamos la posibilidad de forzarlo con `{ api: '...' }`.
 *
 * Docs: https://opencode.ai/v2/docs/console/models/
 *       https://opencode.ai/v2/docs/console/go/
 *       https://opencode.ai/v2/docs/console/api/providers/
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import type { LanguageModel } from 'ai';
import { randomUUID } from 'node:crypto';

/**
 * El gateway de OpenCode identifica al cliente por su user-agent y usa el id
 * de sesión para enrutar y cachear. Los fijamos aquí para que cada proceso
 * se comporte como un cliente consistente.
 */
const USER_AGENT = 'agentic-patterns/1.0.0';
const DEFAULT_SESSION = randomUUID();

/** Formato (API) con el que el gateway de OpenCode sirve un modelo. */
export type OpenCodeApi = 'anthropic' | 'responses' | 'chat' | 'google';

/** Sabores de OpenCode que podemos usar como proveedor externo. */
export type OpenCodeFlavor = 'console' | 'go' | 'other-provider';

export interface OpenCodeOptions {
  /** Fuerza el formato del upstream en lugar de detectarlo por el model id. */
  api?: OpenCodeApi;
  /** Sobrescribe la URL base del gateway. */
  baseURL?: string;
  /** Sobrescribe la credencial (API key o token de consola). */
  apiKey?: string;
  /** Headers adicionales (p.ej. `x-org-id`). */
  headers?: Record<string, string>;
  /**
   * Id de sesión estable. OpenCode Go lo usa para enrutar y cachear.
   * Por defecto se genera uno por proceso.
   */
  session?: string;
}

/**
 * Una fábrica de modelos de OpenCode.
 *
 * Se puede llamar directamente (`opencode('glm-5.3-flash')`) o elegir el
 * formato del upstream de forma explícita (`opencode.chat('glm-5.3-flash')`).
 */
export interface OpenCodeFactory {
  (modelId: string, options?: OpenCodeOptions): LanguageModel;
  /** Anthropic Messages API (`/messages`). */
  anthropic(modelId: string, options?: OpenCodeOptions): LanguageModel;
  /** OpenAI Responses API (`/responses`). */
  responses(modelId: string, options?: OpenCodeOptions): LanguageModel;
  /** OpenAI Chat Completions API (`/chat/completions`). */
  chat(modelId: string, options?: OpenCodeOptions): LanguageModel;
  /** Google Generative AI API (`/models/{id}:generateContent`). */
  google(modelId: string, options?: OpenCodeOptions): LanguageModel;
}

const GATEWAY: Record<
  Exclude<OpenCodeFlavor, 'other-provider'>,
  Record<OpenCodeApi, string>
> = {
  console: {
    anthropic: 'https://opencode.ai/inference/anthropic/v1',
    responses: 'https://opencode.ai/inference/openai/v1',
    chat: 'https://opencode.ai/inference/openai/v1',
    google: 'https://opencode.ai/inference/google/v1beta',
  },
  go: {
    anthropic: 'https://opencode.ai/inference/go/anthropic/v1',
    responses: 'https://opencode.ai/inference/go/openai/v1',
    chat: 'https://opencode.ai/inference/go/openai/v1',
    google: 'https://opencode.ai/inference/go/google/v1beta',
  },
};

/**
 * Modelos que se sirven con una API distinta a la que sugiere su prefijo.
 * Fuente: https://opencode.ai/v2/docs/console/models/ y /console/go/
 */
const ANTHROPIC_EXCEPTIONS: Record<Exclude<OpenCodeFlavor, 'other-provider'>, Set<string>> = {
  console: new Set(['qwen3.8-flash', 'qwen3.6-plus', 'qwen3.5-plus']),
  go: new Set(['minimax-m3', 'qwen3.8-max', 'qwen3.7-plus']),
};

/**
 * Detecta con qué API (upstream) sirve OpenCode un modelo.
 *
 * En las conexiones propias (other-provider) manda el prefijo del vendor:
 * `anthropic.*` va por Anthropic Messages y el resto por OpenAI Chat
 * Completions, que es el formato con el que Bedrock (y casi cualquier
 * conexión BYOK) expone sus modelos. Si tu conexión usa otro formato
 * (por ejemplo OpenAI Responses), fórzalo con `{ api: '...' }`.
 */
export function detectOpenCodeApi(
  modelId: string,
  flavor: OpenCodeFlavor,
): OpenCodeApi {
  if (flavor === 'other-provider') {
    if (modelId.startsWith('anthropic.')) return 'anthropic';
    // Minimax se sirve con la API de Anthropic Messages (/messages).
    if (/^minimax/i.test(modelId)) return 'anthropic';
    return 'chat';
  }

  if (ANTHROPIC_EXCEPTIONS[flavor].has(modelId)) return 'anthropic';

  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gemini-')) return 'google';
  if (/^(gpt|grok|muse)-/.test(modelId)) return 'responses';

  return 'chat';
}

/**
 * Resuelve la credencial y los headers según el sabor.
 *
 * - console / go  → API key de la Console (`oc_sk_...`), ya viene asociada
 *   a un workspace, así que no hace falta mandar nada más.
 * - other-provider       → token de sesión de la Console + `x-org-id`, porque el
 *   token de sesión no está asociado a un workspace por sí solo.
 *
 * Además mandamos un id de sesión estable y un user-agent propio: el gateway
 * de Go los necesita para enrutar y cachear las peticiones.
 * Ver https://opencode.ai/v2/docs/console/go/#where-can-i-use-it
 */
function resolveAuth(
  flavor: OpenCodeFlavor,
  options: OpenCodeOptions,
): { apiKey: string; headers: Record<string, string> } {
  const session = options.session ?? DEFAULT_SESSION;
  const headers: Record<string, string> = {
    'User-Agent': USER_AGENT,
    ...options.headers,
  };

  if (flavor === 'other-provider') {
    const orgId = process.env.OPENCODE_ORG_ID;
    if (orgId) headers['x-org-id'] = orgId;
    headers['x-session-affinity'] = session;
    headers['X-Session-Id'] = session;
  } else {
    headers['x-opencode-session'] = session;
  }

  const apiKey =
    options.apiKey ??
    (flavor === 'other-provider'
      ? process.env.OPENCODE_CONSOLE_TOKEN
      : process.env.OPENCODE_API_KEY);

  if (!apiKey) {
    throw new Error(
      flavor === 'other-provider'
        ? 'Falta OPENCODE_CONSOLE_TOKEN en el .env (token de la OpenCode Console).'
        : 'Falta OPENCODE_API_KEY en el .env (API key de la OpenCode Console).',
    );
  }

  return { apiKey, headers };
}

/** Resuelve la URL base del gateway para el sabor y la API indicados. */
function resolveBaseURL(
  flavor: OpenCodeFlavor,
  api: OpenCodeApi,
  options: OpenCodeOptions,
): string {
  if (options.baseURL) return options.baseURL;

  if (flavor === 'other-provider') {
    const url = process.env.OPENCODE_EXTERNAL_PROV_URL;
    if (!url) {
      throw new Error(
        'Falta OPENCODE_EXTERNAL_PROV_URL en el .env (URL de la conexión de OpenCode).',
      );
    }
    return url;
  }

  return GATEWAY[flavor][api];
}

/** Construye el modelo de AI SDK para el upstream detectado. */
function buildModel(
  api: OpenCodeApi,
  modelId: string,
  baseURL: string,
  apiKey: string,
  headers: Record<string, string>,
): LanguageModel {
  switch (api) {
    case 'anthropic':
      return createAnthropic({ baseURL, apiKey, headers })(modelId);
    case 'responses':
      return createOpenAI({ baseURL, apiKey, headers })(modelId);
    case 'chat':
      return createOpenAICompatible({
        name: 'opencode',
        baseURL,
        apiKey,
        headers,
      })(modelId);
    case 'google':
      return createGoogle({ baseURL, apiKey, headers })(modelId);
  }
}

/** Crea una fábrica de modelos para un sabor de OpenCode. */
function createFactory(flavor: OpenCodeFlavor): OpenCodeFactory {
  const factory = ((modelId: string, options: OpenCodeOptions = {}) => {
    const api = options.api ?? detectOpenCodeApi(modelId, flavor);
    const { apiKey, headers } = resolveAuth(flavor, options);
    const baseURL = resolveBaseURL(flavor, api, options);
    return buildModel(api, modelId, baseURL, apiKey, headers);
  }) as OpenCodeFactory;

  factory.anthropic = (modelId, options = {}) =>
    factory(modelId, { ...options, api: 'anthropic' });
  factory.responses = (modelId, options = {}) =>
    factory(modelId, { ...options, api: 'responses' });
  factory.chat = (modelId, options = {}) =>
    factory(modelId, { ...options, api: 'chat' });
  factory.google = (modelId, options = {}) =>
    factory(modelId, { ...options, api: 'google' });

  return factory;
}

/**
 * OpenCode Console (pay-as-you-go) → `opencode/<model-id>`
 *
 * ```ts
 * export const model = opencode('glm-5.3-flash');
 * ```
 */
export const opencode: OpenCodeFactory = createFactory('console');

/**
 * OpenCode Go (suscripción) → `opencode-go/<model-id>`
 *
 * ```ts
 * export const model = opencodeGo('minimax-m3');
 * ```
 */
export const opencodeGo: OpenCodeFactory = createFactory('go');

/**
 * Conexiones propias de tu cuenta de OpenCode (p.ej. AWS other-provider)
 * → `console-aws-other-provider/<model-id>`
 *
 * ```ts
 * export const model = opencodeotherProvider('openai.gpt-oss-20b');
 * ```
 */
export const opencodeotherProvider: OpenCodeFactory = createFactory('other-provider');

/**
 * Lista los modelos disponibles en el gateway de OpenCode.
 * Útil para descubrir los model ids válidos.
 */
export async function listOpenCodeModels(
  flavor: Exclude<OpenCodeFlavor, 'other-provider'> = 'console',
): Promise<string[]> {
  const url =
    flavor === 'go'
      ? 'https://opencode.ai/inference/go/v1/models'
      : 'https://opencode.ai/inference/v1/models';

  const apiKey =
    process.env.OPENCODE_API_KEY ?? process.env.OPENCODE_CONSOLE_TOKEN;

  const response = await fetch(url, {
    headers: {
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      ...(process.env.OPENCODE_ORG_ID
        ? { 'x-org-id': process.env.OPENCODE_ORG_ID }
        : {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `No se pudieron listar los modelos de OpenCode (${response.status}).`,
    );
  }

  const body = (await response.json()) as { data?: { id: string }[] };
  return (body.data ?? []).map((model) => model.id);
}
