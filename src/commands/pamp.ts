// ─────────────────────────────────────────────────────────────────────────────
// CLI Command — pamp
// ─────────────────────────────────────────────────────────────────────────────

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { getUserName, getUserHonorific } from '../state/manager.js';
import { PampClient } from '../pamp/client.js';
import {
    requireIdentity,
    loadIdentity,
    listContacts,
    listSessions,
    listMessages,
    loadMessage,
    loadThread,
    loadContactByAddress,
} from '../pamp/storage.js';

export const pampCommand = new Command('pamp')
    .description('PAMP messaging — exchange encrypted messages with other Dobbi instances');

// Default action — show status if set up, otherwise hint at setup
pampCommand
    .action(async () => {
        const identity = await loadIdentity();
        if (!identity) {
            console.log(chalk.yellow(`PAMP not set up yet. Run ${chalk.bold('dobbi pamp setup')} to register a mailbox.`));
            return;
        }
        // Delegate to status
        await showStatus();
    });

// ── pamp setup ──────────────────────────────────────────────────────────────

pampCommand
    .command('setup')
    .description('Register a mailbox at a Post Office')
    .option('--post-office <url>', 'Post Office URL')
    .option('--name <name>', 'Display name for mailbox')
    .option('--id <id>', 'Preferred mailbox ID (8 chars, uppercase alphanumeric)')
    .action(async (opts) => {
        const hon = await getUserHonorific();
        const existing = await loadIdentity();
        if (existing) {
            console.log(chalk.yellow(`Already registered as ${chalk.bold(existing.address)}, ${hon}.`));
            console.log(chalk.gray('To re-register, remove ~/.dobbi/pamp/identity.json first.'));
            return;
        }

        let postOffice = opts.postOffice;
        if (!postOffice) {
            const answers = await inquirer.prompt([{
                type: 'input',
                name: 'postOffice',
                message: 'Post Office URL:',
                default: 'https://relay.dobbi.dev',
            }]);
            postOffice = answers.postOffice;
        }

        const userName = await getUserName();
        let displayName = opts.name;
        if (!displayName) {
            const answers = await inquirer.prompt([{
                type: 'input',
                name: 'displayName',
                message: 'Display name:',
                default: `${userName}'s Dobbi`,
            }]);
            displayName = answers.displayName;
        }

        const preferredId = opts.id ?? undefined;

        console.log(chalk.gray('Registering mailbox...'));

        try {
            const identity = await PampClient.register(postOffice, displayName, preferredId);
            console.log(chalk.green(`\nRegistered successfully, ${hon}!`));
            console.log(chalk.cyan(`  Address: ${chalk.bold(identity.address)}`));
            console.log(chalk.gray(`  Mailbox: ${identity.mailboxId}`));
            console.log(chalk.gray(`  Post Office: ${identity.postOffice}`));
            console.log(chalk.gray(`  Registered: ${identity.registeredAt}`));
        } catch (err) {
            console.log(chalk.red(`Registration failed: ${err instanceof Error ? err.message : err}`));
        }
    });

// ── pamp status ─────────────────────────────────────────────────────────────

pampCommand
    .command('status')
    .description('Show mailbox info, active agreements, unread count')
    .action(showStatus);

async function showStatus(): Promise<void> {
    const hon = await getUserHonorific();
    const identity = await requireIdentity();
    const client = new PampClient(identity);

    console.log(chalk.cyan(`\nPAMP Mailbox, ${hon}:\n`));
    console.log(`  ${chalk.bold('Address:')}    ${identity.address}`);
    console.log(`  ${chalk.bold('Name:')}       ${identity.displayName}`);
    console.log(`  ${chalk.bold('Registered:')} ${identity.registeredAt}`);

    try {
        const unread = await client.listMessages({ unread: true });
        console.log(`  ${chalk.bold('Unread:')}     ${unread.length}`);
    } catch {
        console.log(chalk.gray('  (Could not reach Post Office for unread count)'));
    }

    try {
        const pending = await client.listPendingAgreements();
        if (pending.length > 0) {
            console.log(`  ${chalk.bold('Pending:')}    ${pending.length} agreement(s) waiting`);
        }
    } catch {
        // Silently skip
    }

    console.log('');
}

// ── pamp agree ──────────────────────────────────────────────────────────────

pampCommand
    .command('agree <address>')
    .description('Initiate an agreement with another mailbox')
    .option('--type <type>', 'Agreement type', 'bilateral')
    .action(async (address: string, opts) => {
        const hon = await getUserHonorific();
        const identity = await requireIdentity();
        const client = new PampClient(identity);

        const type = opts.type as 'bilateral' | 'unilateral';
        console.log(chalk.gray(`Requesting ${type} agreement with ${address}...`));

        try {
            const agreement = await client.requestAgreement(address, type);
            console.log(chalk.green(`\nAgreement requested, ${hon}!`));
            console.log(chalk.gray(`  ID: ${agreement.agreementId}`));
            console.log(chalk.gray(`  Status: ${agreement.status}`));
            console.log(chalk.gray('  Waiting for the other party to accept.'));
        } catch (err) {
            console.log(chalk.red(`Failed: ${err instanceof Error ? err.message : err}`));
        }
    });

// ── pamp agreements ─────────────────────────────────────────────────────────

pampCommand
    .command('agreements')
    .alias('agr')
    .description('List all agreements')
    .action(async () => {
        const contacts = await listContacts();
        const sessions = await listSessions();

        if (contacts.length === 0) {
            console.log(chalk.yellow('No agreements yet.'));
            return;
        }

        console.log(chalk.cyan('\nAgreements:\n'));
        for (const contact of contacts) {
            const session = sessions.find(s => s.agreementId === contact.agreementId);
            const status = session?.contactPublicKey ? chalk.green('active') : chalk.yellow('pending');
            const name = contact.displayName ? ` (${contact.displayName})` : '';
            console.log(`  ${contact.address}${chalk.gray(name)}`);
            console.log(chalk.gray(`    Agreement: ${contact.agreementId}  Status: ${status}`));
        }
        console.log('');
    });

// ── pamp accept ─────────────────────────────────────────────────────────────

pampCommand
    .command('accept <agreement_id>')
    .description('Accept a pending agreement')
    .action(async (agreementId: string) => {
        const hon = await getUserHonorific();
        const identity = await requireIdentity();
        const client = new PampClient(identity);

        console.log(chalk.gray(`Accepting agreement ${agreementId}...`));

        try {
            const agreement = await client.acceptAgreement(agreementId);
            console.log(chalk.green(`\nAgreement accepted, ${hon}!`));
            console.log(chalk.gray(`  With: ${agreement.initiator}`));
            console.log(chalk.gray(`  Type: ${agreement.type}`));
        } catch (err) {
            console.log(chalk.red(`Failed: ${err instanceof Error ? err.message : err}`));
        }
    });

// ── pamp revoke ─────────────────────────────────────────────────────────────

pampCommand
    .command('revoke <agreement_id>')
    .description('Revoke an agreement (permanent)')
    .action(async (agreementId: string) => {
        const hon = await getUserHonorific();
        const identity = await requireIdentity();
        const client = new PampClient(identity);

        try {
            await client.revokeAgreement(agreementId);
            console.log(chalk.green(`Agreement ${agreementId} revoked, ${hon}.`));
        } catch (err) {
            console.log(chalk.red(`Failed: ${err instanceof Error ? err.message : err}`));
        }
    });

// ── pamp send ───────────────────────────────────────────────────────────────

pampCommand
    .command('send <address> [message]')
    .description('Send an encrypted message')
    .option('--reply-to <msg_id>', 'Reply to a message (threading)')
    .option('--content-type <type>', 'Content type', 'text/plain')
    .action(async (address: string, message: string | undefined, opts) => {
        const hon = await getUserHonorific();
        const identity = await requireIdentity();
        const client = new PampClient(identity);

        let body = message ?? '';
        if (!body) {
            const answers = await inquirer.prompt([{
                type: 'input',
                name: 'body',
                message: 'Message:',
            }]);
            body = answers.body as string;
        }

        console.log(chalk.gray('Sending...'));

        try {
            const msg = await client.sendMessage(
                address,
                body,
                opts.contentType,
                opts.replyTo,
            );
            console.log(chalk.green(`\nMessage sent, ${hon}!`));
            console.log(chalk.gray(`  ID: ${msg.header.message_id}`));
            console.log(chalk.gray(`  To: ${address}`));
        } catch (err) {
            console.log(chalk.red(`Failed: ${err instanceof Error ? err.message : err}`));
        }
    });

// ── pamp inbox ──────────────────────────────────────────────────────────────

pampCommand
    .command('inbox')
    .description('List received messages')
    .option('--local', 'Show only locally stored messages')
    .action(async (opts) => {
        const identity = await requireIdentity();

        if (opts.local) {
            const messages = await listMessages('inbox');
            displayMessageList(messages);
            return;
        }

        const client = new PampClient(identity);
        try {
            const headers = await client.listMessages();
            if (headers.length === 0) {
                console.log(chalk.yellow('\nInbox is empty.'));
                return;
            }

            console.log(chalk.cyan(`\nInbox (${headers.length} message(s)):\n`));
            for (const h of headers) {
                const read = h.read_at ? chalk.gray('read') : chalk.green('new');
                const id = h.message_id.substring(0, 12);
                console.log(`  ${read} ${chalk.bold(id)}  from ${h.from}  ${chalk.gray(h.created_at)}`);
            }
            console.log('');
        } catch (err) {
            console.log(chalk.red(`Failed to fetch inbox: ${err instanceof Error ? err.message : err}`));
            // Fall back to local
            const messages = await listMessages('inbox');
            displayMessageList(messages);
        }
    });

function displayMessageList(messages: import('../pamp/types.js').PampMessage[]): void {
    if (messages.length === 0) {
        console.log(chalk.yellow('\nNo messages.'));
        return;
    }

    console.log(chalk.cyan(`\nMessages (${messages.length}):\n`));
    const sorted = [...messages].sort((a, b) =>
        new Date(b.header.created_at).getTime() - new Date(a.header.created_at).getTime(),
    );
    for (const msg of sorted) {
        const read = msg.header.read_at ? chalk.gray('read') : chalk.green('new');
        const id = msg.header.message_id.substring(0, 12);
        console.log(`  ${read} ${chalk.bold(id)}  from ${msg.header.from}  ${chalk.gray(msg.header.created_at)}`);
    }
    console.log('');
}

// ── pamp read ───────────────────────────────────────────────────────────────

pampCommand
    .command('read <msg_id>')
    .description('Read and decrypt a message')
    .action(async (msgId: string) => {
        const identity = await requireIdentity();
        const client = new PampClient(identity);

        // Check local first
        let message = await loadMessage(msgId, 'inbox');

        if (!message) {
            console.log(chalk.gray('Fetching from Post Office...'));
            try {
                message = await client.fetchAndDecryptMessage(msgId);
                await client.markRead(msgId);
            } catch (err) {
                console.log(chalk.red(`Failed: ${err instanceof Error ? err.message : err}`));
                return;
            }
        }

        console.log(chalk.cyan('\n── Message ──────────────────────────────'));
        console.log(`  ${chalk.bold('ID:')}      ${message.header.message_id}`);
        console.log(`  ${chalk.bold('From:')}    ${message.header.from}`);
        console.log(`  ${chalk.bold('To:')}      ${message.header.to}`);
        console.log(`  ${chalk.bold('Date:')}    ${message.header.created_at}`);
        console.log(`  ${chalk.bold('Type:')}    ${message.header.content_type}`);
        if (message.header.chain.length > 0) {
            console.log(`  ${chalk.bold('Chain:')}   ${message.header.chain.join(' → ')}`);
        }
        console.log(chalk.cyan('─────────────────────────────────────────'));
        console.log(`\n${message.body}\n`);
    });

// ── pamp thread ─────────────────────────────────────────────────────────────

pampCommand
    .command('thread <msg_id>')
    .description('Show conversation thread')
    .action(async (msgId: string) => {
        const identity = await requireIdentity();

        const messageIds = await loadThread(msgId);
        if (!messageIds || messageIds.length === 0) {
            console.log(chalk.yellow(`No thread found for ${msgId}.`));
            return;
        }

        console.log(chalk.cyan(`\nThread (${messageIds.length} message(s)):\n`));

        for (const id of messageIds) {
            const inboxMsg = await loadMessage(id, 'inbox');
            const sentMsg = await loadMessage(id, 'sent');
            const msg = inboxMsg ?? sentMsg;

            if (!msg) {
                console.log(chalk.gray(`  ? ${id} (not found locally)`));
                continue;
            }

            const isSent = msg.header.from === identity.address;
            const arrow = isSent ? chalk.blue('→') : chalk.green('←');
            const peer = isSent ? msg.header.to : msg.header.from;
            const preview = msg.body.length > 80 ? msg.body.substring(0, 77) + '...' : msg.body;

            console.log(`  ${arrow} ${chalk.gray(msg.header.created_at)}  ${peer}`);
            console.log(`    ${preview}`);
            console.log('');
        }
    });

export default pampCommand;
