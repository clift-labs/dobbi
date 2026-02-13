import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { SecretsSchema, ConfigSchema, type Secrets, type Config, type LLMCapability, type CapabilityModelMapping } from './schemas/index.js';
import { debug } from './utils/debug.js';

const DOBBIE_DIR = path.join(os.homedir(), '.dobbie');
const SECRETS_PATH = path.join(DOBBIE_DIR, 'secrets.json');
const CONFIG_PATH = path.join(DOBBIE_DIR, 'config.json');

// Default configuration with capability-based mapping
// Using OpenAI models with cost-conscious selection:
// - GPT-4o: Complex reasoning, general chat (~$2.50/1M input, $10/1M output)
// - GPT-4o-mini: Simple tasks (~$0.15/1M input, $0.60/1M output) - 15x cheaper!
// - text-embedding-3-small: Embeddings (~$0.02/1M tokens)
const DEFAULT_CONFIG: Config = {
    capabilityMapping: {
        reason: { provider: 'openai', model: 'gpt-4o' },           // Complex thinking needs full power
        summarize: { provider: 'openai', model: 'gpt-4o-mini' },   // Summarizing is straightforward
        categorize: { provider: 'openai', model: 'gpt-4o-mini' },  // Classification is simple
        format: { provider: 'openai', model: 'gpt-4o-mini' },      // Text formatting is simple
        chat: { provider: 'openai', model: 'gpt-4o' },             // General chat, good quality
        embed: { provider: 'openai', model: 'text-embedding-3-small' },
    },
    defaultProvider: 'openai',
};

const DEFAULT_SECRETS: Secrets = {
    providers: {},
};

async function ensureDobbieDir(): Promise<void> {
    await fs.mkdir(DOBBIE_DIR, { recursive: true });
}

export async function loadSecrets(): Promise<Secrets> {
    try {
        await ensureDobbieDir();
        const data = await fs.readFile(SECRETS_PATH, 'utf-8');
        return SecretsSchema.parse(JSON.parse(data));
    } catch (err) {
        debug('config', err);
        return DEFAULT_SECRETS;
    }
}

export async function saveSecrets(secrets: Secrets): Promise<void> {
    await ensureDobbieDir();
    await fs.writeFile(SECRETS_PATH, JSON.stringify(secrets, null, 2));
}

export async function loadConfig(): Promise<Config> {
    try {
        await ensureDobbieDir();
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        return ConfigSchema.parse(JSON.parse(data));
    } catch (err) {
        debug('config', err);
        return DEFAULT_CONFIG;
    }
}

export async function saveConfig(config: Config): Promise<void> {
    await ensureDobbieDir();
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function getApiKey(provider: string): Promise<string | null> {
    const secrets = await loadSecrets();
    return secrets.providers[provider]?.apiKey ?? null;
}

export async function setApiKey(provider: string, apiKey: string): Promise<void> {
    const secrets = await loadSecrets();
    secrets.providers[provider] = { apiKey };
    await saveSecrets(secrets);
}

export async function getCapabilityModel(capability: LLMCapability): Promise<CapabilityModelMapping | null> {
    const config = await loadConfig();
    return config.capabilityMapping[capability] ?? null;
}

export async function setCapabilityModel(capability: LLMCapability, provider: string, model: string): Promise<void> {
    const config = await loadConfig();
    config.capabilityMapping[capability] = { provider, model };
    await saveConfig(config);
}

export { DOBBIE_DIR, SECRETS_PATH, CONFIG_PATH };
