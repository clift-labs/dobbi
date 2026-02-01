import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import {
    loadConfig,
    loadSecrets,
    setApiKey,
    setCapabilityModel,
    getApiKey,
} from '../config.js';
import { listProviders } from '../llm/providers/index.js';
import { LLM_CAPABILITIES, type LLMCapability } from '../schemas/index.js';

export const configCommand = new Command('config')
    .description('Manage configuration and secrets');

// Default action - show config
configCommand
    .action(async () => {
        const config = await loadConfig();
        const secrets = await loadSecrets();

        console.log(chalk.cyan('\n⚙️  Dobbie Configuration\n'));

        console.log(chalk.bold('Default Provider:'), config.defaultProvider);
        console.log('');

        console.log(chalk.bold('Capability → Model Mapping:'));
        for (const [capability, mapping] of Object.entries(config.capabilityMapping)) {
            const m = mapping as { provider: string; model: string };
            console.log(chalk.gray(`  ${capability}: ${m.provider}/${m.model}`));
        }
        console.log('');

        console.log(chalk.bold('Configured Providers:'));
        const providers = Object.keys(secrets.providers);
        if (providers.length === 0) {
            console.log(chalk.yellow('  No providers configured. Run `dobbie config add-provider <name>`'));
        } else {
            for (const provider of providers) {
                console.log(chalk.green(`  ✓ ${provider}`));
            }
        }
        console.log('');
    });

// Add provider
configCommand
    .command('add-provider <name>')
    .description('Add or update an LLM provider API key')
    .action(async (name: string) => {
        console.log(chalk.cyan(`\nConfiguring ${name} provider, sir.\n`));

        const existing = await getApiKey(name);
        if (existing) {
            const { confirm } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'confirm',
                    message: `API key for ${name} already exists. Replace it?`,
                    default: false,
                },
            ]);
            if (!confirm) {
                console.log(chalk.gray('Cancelled.'));
                return;
            }
        }

        const { apiKey } = await inquirer.prompt([
            {
                type: 'password',
                name: 'apiKey',
                message: `Enter API key for ${name}:`,
                mask: '*',
                validate: (input: string) => input.length > 0 || 'API key is required',
            },
        ]);

        await setApiKey(name, apiKey);
        console.log(chalk.green(`\n✓ API key for ${name} saved, sir!`));
    });

// Set capability model
configCommand
    .command('set-capability <capability> <provider> <model>')
    .description('Set which model to use for a capability (reason, summarize, categorize, format, chat, embed)')
    .action(async (capability: string, provider: string, model: string) => {
        if (!LLM_CAPABILITIES.includes(capability as LLMCapability)) {
            console.log(chalk.red(`Unknown capability: ${capability}`));
            console.log(chalk.gray(`Valid capabilities: ${LLM_CAPABILITIES.join(', ')}`));
            return;
        }
        await setCapabilityModel(capability as LLMCapability, provider, model);
        console.log(chalk.green(`✓ Capability "${capability}" will now use ${provider}/${model}, sir!`));
    });

// List capabilities
configCommand
    .command('list-capabilities')
    .description('List LLM capability categories')
    .action(() => {
        console.log(chalk.cyan('\n🧠 LLM Capabilities:\n'));

        const descriptions: Record<string, string> = {
            reason: 'Complex thinking, multi-step logic',
            summarize: 'Condensing, prioritizing info',
            categorize: 'Classification, tagging',
            format: 'Markdown, text cleanup',
            chat: 'General conversation',
            embed: 'Vector embeddings',
        };

        for (const cap of LLM_CAPABILITIES) {
            console.log(`  ${chalk.bold(cap)}: ${chalk.gray(descriptions[cap])}`);
        }
        console.log('');
    });

// List providers
configCommand
    .command('list-providers')
    .description('List available providers')
    .action(async () => {
        const providers = listProviders();
        const secrets = await loadSecrets();

        console.log(chalk.cyan('\n📡 Available Providers:\n'));

        for (const provider of providers) {
            const configured = secrets.providers[provider] ? chalk.green('✓') : chalk.gray('○');
            console.log(`  ${configured} ${provider}`);
        }
        console.log('');
    });

export default configCommand;
