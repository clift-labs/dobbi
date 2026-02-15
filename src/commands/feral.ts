// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — CLI Command
// ─────────────────────────────────────────────────────────────────────────────

import { Command } from 'commander';
import chalk from 'chalk';
import { bootstrapFeral } from '../feral/bootstrap.js';
import { FERAL_CATALOG_PATH } from '../feral/catalog/feral-catalog-config.js';
import type { ConfigurationDescription } from '../feral/configuration/configuration-description.js';

export const feralCommand = new Command('feral')
    .description(chalk.cyan('🔀 Feral CCF — Flow-Based Programming Engine'));

// ─────────────────────────────────────────────────────────────────────────────
// feral nodes — list all registered NodeCodes
// ─────────────────────────────────────────────────────────────────────────────
feralCommand
    .command('nodes')
    .description('List all available NodeCodes')
    .action(async () => {
        const runtime = await bootstrapFeral();
        const nodeCodes = runtime.nodeCodeFactory.getAllNodeCodes();

        console.log(chalk.cyan('\n🔀 Feral NodeCodes\n'));

        // Group by category
        const grouped = new Map<string, typeof nodeCodes>();
        for (const nc of nodeCodes) {
            const cat = nc.categoryKey || 'Uncategorized';
            if (!grouped.has(cat)) grouped.set(cat, []);
            grouped.get(cat)!.push(nc);
        }

        for (const [category, nodes] of grouped) {
            console.log(chalk.bold.yellow(`  ${category.toUpperCase()}`));
            for (const nc of nodes) {
                console.log(`    ${chalk.bold(nc.key)}  ${chalk.gray(nc.description)}`);
            }
            console.log('');
        }

        console.log(chalk.gray(`  ${nodeCodes.length} node code(s) registered`));
        console.log('');
    });

// ─────────────────────────────────────────────────────────────────────────────
// feral catalog [key] — list catalog or show details of a single node
// ─────────────────────────────────────────────────────────────────────────────
feralCommand
    .command('catalog [key]')
    .description('List catalog nodes or show details of a specific node')
    .action(async (key?: string) => {
        const runtime = await bootstrapFeral();

        if (key) {
            // Show detail for a single catalog node
            try {
                const node = runtime.catalog.getCatalogNode(key);
                console.log(chalk.cyan(`\n🔀 Catalog Node: ${chalk.bold(node.key)}\n`));
                console.log(`  ${chalk.gray('Name:')}         ${node.name || chalk.gray('(none)')}`);
                console.log(`  ${chalk.gray('Group:')}        ${node.group}`);
                console.log(`  ${chalk.gray('NodeCode:')}     ${node.nodeCodeKey}`);
                console.log(`  ${chalk.gray('Description:')}  ${node.description || chalk.gray('(none)')}`);

                // Show preconfigured values
                const configEntries = Object.entries(node.configuration);
                if (configEntries.length > 0) {
                    console.log(`\n  ${chalk.yellow('Preconfigured Values:')}`);
                    for (const [k, v] of configEntries) {
                        console.log(`    ${chalk.bold(k)}: ${chalk.green(JSON.stringify(v))}`);
                    }
                }

                // Show available config keys from the underlying NodeCode
                try {
                    const nc = runtime.nodeCodeFactory.getNodeCode(node.nodeCodeKey);
                    const Ctor = nc.constructor as { configDescriptions?: ConfigurationDescription[] };
                    const descriptions = Ctor.configDescriptions ?? [];
                    if (descriptions.length > 0) {
                        console.log(`\n  ${chalk.yellow('Available Configuration Keys:')}`);
                        for (const desc of descriptions) {
                            const optional = desc.isOptional ? chalk.gray(' (optional)') : chalk.red(' (required)');
                            const defaultVal = desc.default != null ? chalk.gray(` [default: ${desc.default}]`) : '';
                            console.log(`    ${chalk.bold(desc.key)}${optional}${defaultVal}`);
                            console.log(chalk.gray(`      ${desc.description}`));
                            if (desc.options) {
                                console.log(chalk.gray(`      options: ${desc.options.join(', ')}`));
                            }
                        }
                    }
                } catch {
                    // NodeCode not found, skip config display
                }

                console.log('');
            } catch (err) {
                console.log(chalk.red(`\n  Catalog node "${key}" not found.\n`));
                console.log(chalk.gray('  Run `dobbie feral catalog` to see all available nodes.\n'));
            }
        } else {
            // List all catalog nodes
            const allNodes = runtime.catalog.getAllCatalogNodes();
            console.log(chalk.cyan('\n🔀 Feral Catalog\n'));

            // Group by group field
            const grouped = new Map<string, typeof allNodes>();
            for (const node of allNodes) {
                const group = node.group || 'Ungrouped';
                if (!grouped.has(group)) grouped.set(group, []);
                grouped.get(group)!.push(node);
            }

            for (const [group, nodes] of grouped) {
                console.log(chalk.bold.yellow(`  ${group.toUpperCase()}`));
                for (const node of nodes) {
                    const configCount = Object.keys(node.configuration).length;
                    const configBadge = configCount > 0 ? chalk.green(` [${configCount} config]`) : '';
                    console.log(`    ${chalk.bold(node.key)}${configBadge}  ${chalk.gray(node.description || node.name)}`);
                }
                console.log('');
            }

            console.log(chalk.gray(`  ${allNodes.length} catalog node(s) from built-in + config`));
            console.log(chalk.gray(`  Config: ${FERAL_CATALOG_PATH}`));
            console.log('');
        }
    });
