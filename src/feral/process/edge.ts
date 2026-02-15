// ─────────────────────────────────────────────────────────────────────────────
// Feral CCF — Edge + EdgeCollection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A connection between two ProcessNodes, selected by a result status string.
 */
export interface Edge {
    readonly fromKey: string;
    readonly toKey: string;
    readonly result: string;  // the result status that selects this edge
}

/**
 * Indexed collection of edges for fast lookup by [fromKey][result].
 */
export class EdgeCollection {
    private collection: Map<string, Map<string, Edge[]>> = new Map();

    addEdge(edge: Edge): void {
        if (!this.collection.has(edge.fromKey)) {
            this.collection.set(edge.fromKey, new Map());
        }
        const resultMap = this.collection.get(edge.fromKey)!;
        if (!resultMap.has(edge.result)) {
            resultMap.set(edge.result, []);
        }
        resultMap.get(edge.result)!.push(edge);
    }

    getEdgesByNodeAndResult(fromKey: string, result: string): Edge[] {
        return this.collection.get(fromKey)?.get(result) ?? [];
    }

    getAllEdges(): Edge[] {
        const all: Edge[] = [];
        for (const resultMap of this.collection.values()) {
            for (const edges of resultMap.values()) {
                all.push(...edges);
            }
        }
        return all;
    }
}
