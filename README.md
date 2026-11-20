# Patrones de Diseño Agéntico

## Aprendiendo sobre patrones de diseño para agentes

Este es el repositorio del proyecto para aprender sobre patrones de diseño para agentes.

### Tecnologías

- TypeScript
- Node.js
- [AI SDK](https://www.npmjs.com/package/ai)
- [Zod](https://www.npmjs.com/package/zod)

### Proveedores

El proyecto usa el [AI SDK](https://ai-sdk.dev), así que todos los proveedores
se cambian en un solo lugar: `src/helpers/selected-model.ts`.

| Proveedor          | Import                                                      | Variable de entorno            |
| ------------------ | -----------------------------------------                   | ------------------------------ |
| Groq               | `import { groq } from '@ai-sdk/groq'`                       | `GROQ_API_KEY`                 |
| Anthropic          | `import { anthropic } from '@ai-sdk/anthropic'`             | `ANTHROPIC_API_KEY`      |
| OpenAI             | `import { openai } from '@ai-sdk/openai'`                   | `OPENAI_API_KEY`               |
| Gemini             | `import { google } from '@ai-sdk/google'`                   | `GOOGLE_GENERATIVE_AI_API_KEY` |
| Ollama             | `import { ollama } from 'ollama-ai-provider-v2'`            | —                      |
| **OpenCode**       | `import { opencode } from './helpers/opencode-provider.js'` | `OPENCODE_API_KEY` |

### OpenCode como proveedor externo

OpenCode sirve sus modelos por HTTP, así que también se puede usar como
proveedor externo. Hay tres variantes, todas en
`src/helpers/opencode-provider.ts`:

| Variante         | Qué es                                        | Credencial                |
| ---------------- | --------------------------------------------- | ------------------------- |
| `opencode()`     | OpenCode Console (pay-as-you-go)              | `OPENCODE_API_KEY`        |
| `opencodeGo()`   | OpenCode Go (suscripción mensual)             | `OPENCODE_API_KEY`        |
| `opencodeotherProvider()` | Tus conexiones propias (p. ej. AWS Bedrock) | `OPENCODE_CONSOLE_TOKEN`  |

```ts
import { opencode, opencodeotherProvider, opencodeGo } from './helpers/opencode-provider.js';

// Console (pay-as-you-go)
export const model = opencode('glm-5.3-flash');

// Go
export const model = opencodeGo('minimax-m3');

// Tu conexión de AWS Bedrock sincronizada en la Console
export const model = opencodeotherProvider('openai.gpt-oss-20b');
```

Dentro de OpenCode cada modelo se sirve con una de cuatro APIs (Anthropic
Messages, OpenAI Responses, OpenAI Chat Completions o Google Generative AI).
El formato se detecta solo a partir del `model id`, pero puedes forzarlo:

```ts
opencode.chat('glm-5.3-flash');
opencode.anthropic('claude-haiku-5-5');
opencode.responses('gpt-6.1-sol');
opencode.google('gemini-3.8-flash');
```

Para ver los modelos disponibles:

```ts
import { listOpenCodeModels } from './helpers/opencode-provider.js';

console.log(await listOpenCodeModels('go'));
```

#### Variables de entorno

```bash
# Console y Go: se crea en https://opencode.ai/console > Account > Personal API keys
OPENCODE_API_KEY=oc_sk_...

# Conexiones propias (AWS Bedrock):
# el token y el org id se obtienen de tu instalación de OpenCode:
#   opencode db "SELECT access_token FROM account"
#   opencode db "SELECT active_org_id FROM account_state"
# y la URL de la conexión en https://opencode.ai/console > Providers
OPENCODE_CONSOLE_TOKEN=st_...
OPENCODE_ORG_ID=org_...
OPENCODE_EXTERNAL_PROV_URL=https://opencode.ai/inference/custom/conn_...
```

> Las conexiones propias solo funcionan con modelos que estén realmente
> provisionados en tu cuenta de AWS. En Bedrock hay que pedir acceso a cada
> modelo (Model access) en la región configurada en la conexión.

### Levantar proyecto

1. Clonar el `.env.template` y renombrarlo a `.env`
2. Llenar las variables de entorno
3. Instalar las dependencias `npm install`
4. Ejecutar el proyecto `npm run dev`
5. Cambiar el `main.ts` para ejecutar el patrón que se desee

## Actualizar dependencias (Opcional)

Para actualizar todas las dependencias a las últimas versiones permitidas por package.json, ejecuta:

```bash
npm update
```

Si quieres actualizar una dependencia específica a la última versión (mayor, menor, o patch), usa:

```bash
npm install nombre-del-paquete@latest
```

Para revisar si hay actualizaciones disponibles y ver sugerencias:

```bash
npm outdated
```

**Nota:** Si quieres actualizar todas las dependencias a la última versión disponible (rompiendo potencialmente cambios mayores), puedes usar herramientas como [`npm-check-updates`](https://www.npmjs.com/package/npm-check-updates):

```bash
npx npm-check-updates -u
npm install
```

Esto modificará tu `package.json` con las versiones más recientes.
