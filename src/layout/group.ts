import type { GroupLevel, MetricValues } from '../config';
import { metricsFor, type ResolvedMetric } from './aggregate';
import type { GroupInfo, NormalizedRow } from './types';

/**
 * A node in the row hierarchy — the original timeline's `EventGroupRow` tree (commit 7d5b7f1a): each row walks
 * down the group levels, and its bar lives in the deepest group's lanes.
 */
export interface GroupNode<T> {
	readonly id: string;
	readonly key: string;
	label: string;
	/** -1 for the root. */
	readonly level: number;
	readonly path: readonly string[];
	readonly children: GroupNode<T>[];
	/** Rows whose bars are drawn in this node's lanes (leaf nodes, or the root when there are no levels). */
	readonly rows: NormalizedRow<T>[];
	/** Every row in this subtree. */
	readonly allRows: NormalizedRow<T>[];
	metrics: MetricValues;
}

export function buildGroupTree<T>(
	rows: readonly NormalizedRow<T>[],
	levels: readonly GroupLevel<T>[],
	metrics: readonly ResolvedMetric<T>[],
	collator: Intl.Collator,
): GroupNode<T> {
	const root = createNode<T>('', '', -1, []);
	const index = new Map<string, GroupNode<T>>();

	for (const row of rows) {
		root.allRows.push(row);
		let node = root;
		for (let level = 0; level < levels.length; level++) {
			const path = row.path.slice(0, level + 1);
			const id = JSON.stringify(path);
			let child = index.get(id);
			if (!child) {
				child = createNode<T>(id, row.path[level] ?? '', level, path);
				child.label = row.labels[level] ?? child.key;
				index.set(id, child);
				node.children.push(child);
			}
			child.allRows.push(row);
			node = child;
		}
		node.rows.push(row);
	}

	finalize(root, levels, metrics, collator);
	return root;
}

function createNode<T>(id: string, key: string, level: number, path: readonly string[]): GroupNode<T> {
	return { id, key, label: key, level, path, children: [], rows: [], allRows: [], metrics: {} };
}

function finalize<T>(
	node: GroupNode<T>,
	levels: readonly GroupLevel<T>[],
	metrics: readonly ResolvedMetric<T>[],
	collator: Intl.Collator,
): void {
	node.metrics = metricsFor(node.allRows, metrics);
	for (const child of node.children) finalize(child, levels, metrics, collator);

	const sort = levels[node.level + 1]?.sort ?? 'asc';
	if (sort === 'none') return;
	if (typeof sort === 'function') {
		node.children.sort((a, b) => sort(groupInfo(a), groupInfo(b)));
	} else {
		const dir = sort === 'desc' ? -1 : 1;
		node.children.sort((a, b) => dir * collator.compare(a.label, b.label));
	}
}

export function groupInfo<T>(node: GroupNode<T>): GroupInfo<T> {
	return {
		key: node.key,
		label: node.label,
		level: node.level,
		rows: node.allRows.map((r) => r.row),
		metrics: node.metrics,
	};
}

/** Every node of the tree, depth first, excluding the root. */
export function* walk<T>(node: GroupNode<T>): Generator<GroupNode<T>> {
	for (const child of node.children) {
		yield child;
		yield* walk(child);
	}
}
