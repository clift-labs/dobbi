// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Introspect NodeCode
// ─────────────────────────────────────────────────────────────────────────────
//
// Lets Feral processes query Dobbi's own configuration without leaking secrets.
// The `target` config param selects which slice of settings to load.
// ─────────────────────────────────────────────────────────────────────────────

import type { Context } from '../../context/context.js';
import type { Result } from '../../result/result.js';
import { ResultStatus } from '../../result/result.js';
import type { ConfigurationDescription, ResultDescription } from '../../configuration/configuration-description.js';
import { AbstractNodeCode } from '../abstract-node-code.js';
import { NodeCodeCategory } from '../node-code.js';

import { loadState, findVaultRoot } from '../../../state/manager.js';
import { getConfiguredProviders, getEffectiveConfig } from '../../../config.js';
import { getDaemonStatus } from '../../../service/daemon.js';
import { loadCronConfig } from '../../../service/cron/scheduler.js';

const VALID_TARGETS = ['user_profile', 'providers', 'capabilities', 'service', 'vault', 'cron_schedule'] as const;
type IntrospectTarget = (typeof VALID_TARGETS)[number];

export class IntrospectNodeCode extends AbstractNodeCode {
    static readonly configDescriptions: ConfigurationDescription[] = [
        {
            key: 'target',
            name: 'Target',
            description: `What to introspect: ${VALID_TARGETS.join(', ')}`,
            type: 'string',
        },
        {
            key: 'context_path',
            name: 'Context Path',
            description: 'Context key to store the result.',
            type: 'string',
            default: 'introspection',
            isOptional: true,
        },
    ];
    static readonly resultDescriptions: ResultDescription[] = [
        { status: ResultStatus.OK, description: 'Introspection data loaded.' },
        { status: ResultStatus.ERROR, description: 'Failed to load introspection data.' },
    ];

    constructor() {
        super(
            'introspect',
            'Introspect',
            'Queries Dobbi\'s own configuration — user profile, providers, capabilities, service status, or vault info.',
            NodeCodeCategory.DATA,
        );
    }

    async process(context: Context): Promise<Result> {
        const target = this.getRequiredConfigValue('target') as string;
        const contextPath = this.getOptionalConfigValue('context_path', 'introspection') as string;

        if (!VALID_TARGETS.includes(target as IntrospectTarget)) {
            return this.result(ResultStatus.ERROR, `Unknown introspect target: "${target}". Valid: ${VALID_TARGETS.join(', ')}`);
        }

        try {
            const data = await this.loadTarget(target as IntrospectTarget);
            context.set(contextPath, data);
            return this.result(ResultStatus.OK, `${contextPath} loaded (target: ${target})`);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return this.result(ResultStatus.ERROR, `Introspect failed for "${target}": ${message}`);
        }
    }

    private async loadTarget(target: IntrospectTarget): Promise<unknown> {
        switch (target) {
            case 'user_profile': {
                const state = await loadState();
                return {
                    userName: state.userName,
                    gender: state.gender,
                    workType: state.workType,
                    familySituation: state.familySituation,
                    hasCar: state.hasCar,
                    cityLive: state.cityLive,
                    cityWork: state.cityWork,
                    lastUsed: state.lastUsed,
                    interviewComplete: state.interviewComplete,
                };
            }

            case 'providers': {
                return await getConfiguredProviders();
            }

            case 'capabilities': {
                return await getEffectiveConfig();
            }

            case 'service': {
                const status = await getDaemonStatus();
                return {
                    running: status.running,
                    pid: status.pid,
                };
            }

            case 'vault': {
                const root = await findVaultRoot();
                return {
                    root,
                };
            }

            case 'cron_schedule': {
                const config = await loadCronConfig();
                return config.jobs;
            }
        }
    }
}
