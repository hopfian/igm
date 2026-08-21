// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/ui.md (§ output.ts — Data Export Engine)
//     If export formats, CSV column schemas, or the OutputOptions interface change, update the docs.

import * as fs from "node:fs";
import chalk from "chalk";

export interface OutputOptions {
	json?: boolean;
	csv?: boolean;
	pipe?: boolean;
	out?: string;
}

// ─── Generic Export Engine ───────────────────────────────────────────────────

/**
 * Handle data export for timeline/post items.
 * Returns true if data was intercepted (UI printing should be muted).
 */
export function handleDataExport(items: any[], opts: OutputOptions): boolean {
	if (!opts.json && !opts.csv && !opts.pipe && !opts.out) return false;

	if (opts.pipe) {
		for (const item of items) process.stdout.write(`${JSON.stringify(item)}\n`);
		return true;
	}

	if (opts.json) {
		console.log(JSON.stringify(items, null, 2));
		return true;
	}

	if (opts.csv) {
		console.log(toPostCSV(items));
		return true;
	}

	if (opts.out) {
		return writeToFile(items, opts.out, "items", toPostCSV);
	}

	return false;
}

/**
 * Handle data export for user search results / profiles.
 */
export function handleUserExport(users: any[], opts: OutputOptions): boolean {
	if (!opts.json && !opts.csv && !opts.pipe && !opts.out) return false;

	if (opts.pipe) {
		for (const u of users) process.stdout.write(`${JSON.stringify(u)}\n`);
		return true;
	}

	if (opts.json) {
		console.log(JSON.stringify(users, null, 2));
		return true;
	}

	if (opts.csv) {
		console.log(toUserCSV(users));
		return true;
	}

	if (opts.out) {
		return writeToFile(users, opts.out, "users", toUserCSV);
	}

	return false;
}

/**
 * Handle data export for comments.
 */
export function handleCommentExport(
	comments: any[],
	opts: OutputOptions,
): boolean {
	if (!opts.json && !opts.csv && !opts.pipe && !opts.out) return false;

	if (opts.pipe) {
		for (const c of comments) process.stdout.write(`${JSON.stringify(c)}\n`);
		return true;
	}

	if (opts.json) {
		console.log(JSON.stringify(comments, null, 2));
		return true;
	}

	if (opts.csv) {
		console.log(toCommentCSV(comments));
		return true;
	}

	if (opts.out) {
		return writeToFile(comments, opts.out, "comments", toCommentCSV);
	}

	return false;
}

// ─── File Writer (supports .json, .csv, .jsonl) ─────────────────────────────

function writeToFile(
	data: any[],
	filepath: string,
	label: string,
	csvFn: (d: any[]) => string,
): boolean {
	const ext = filepath.split(".").pop()?.toLowerCase();
	let content: string;

	if (ext === "csv") {
		content = csvFn(data);
	} else if (ext === "jsonl") {
		content = `${data.map((d) => JSON.stringify(d)).join("\n")}\n`;
	} else {
		content = JSON.stringify(data, null, 2);
	}

	fs.writeFileSync(filepath, content);

	console.log("");
	console.log(
		`  ${chalk.green("✓")} ${chalk.green(`Saved ${data.length} ${label} to ${filepath}`)}`,
	);
	console.log("");

	printPreview(data);
	return true;
}

// ─── CSV Generators ──────────────────────────────────────────────────────────

function escapeCsv(val: any): string {
	if (val === null || val === undefined) return "";
	const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, " ");
	return `"${str}"`;
}

function toPostCSV(items: any[]): string {
	if (items.length === 0) return "";
	const headers = [
		"id",
		"username",
		"full_name",
		"code",
		"caption",
		"like_count",
		"comment_count",
		"view_count",
		"media_type",
		"taken_at",
		"location",
		"has_liked",
		"media_count",
		"media_urls",
		"url",
	];

	let csv = `${headers.join(",")}\n`;
	for (const item of items) {
		const takenAt = item.taken_at
			? new Date(item.taken_at * 1000).toISOString()
			: "";
		const row = [
			item.id,
			item.username,
			escapeCsv(item.full_name),
			item.code,
			escapeCsv(item.caption),
			item.like_count ?? 0,
			item.comment_count ?? 0,
			item.view_count ?? "",
			item.media_type ?? "",
			takenAt,
			escapeCsv(item.location),
			item.has_liked ?? "",
			(item.media_urls || []).length,
			escapeCsv((item.media_urls || []).join(" ")),
			item.url || `https://www.instagram.com/p/${item.code}/`,
		];
		csv += `${row.join(",")}\n`;
	}
	return csv;
}

function toUserCSV(users: any[]): string {
	if (users.length === 0) return "";
	const headers = [
		"pk",
		"username",
		"full_name",
		"is_private",
		"is_verified",
		"follower_count",
		"following_count",
		"media_count",
		"biography",
		"external_url",
	];

	let csv = `${headers.join(",")}\n`;
	for (const u of users) {
		const row = [
			u.pk || u.id || "",
			u.username,
			escapeCsv(u.full_name),
			u.is_private ?? "",
			u.is_verified ?? "",
			u.follower_count ?? "",
			u.following_count ?? "",
			u.media_count ?? "",
			escapeCsv(u.biography),
			u.external_url || "",
		];
		csv += `${row.join(",")}\n`;
	}
	return csv;
}

function toCommentCSV(comments: any[]): string {
	if (comments.length === 0) return "";
	const headers = [
		"id",
		"username",
		"text",
		"like_count",
		"reply_count",
		"created_at",
	];

	let csv = `${headers.join(",")}\n`;
	for (const c of comments) {
		const createdAt = c.created_at
			? new Date(c.created_at * 1000).toISOString()
			: "";
		const row = [
			c.id,
			c.username,
			escapeCsv(c.text),
			c.like_count ?? 0,
			c.reply_count ?? 0,
			createdAt,
		];
		csv += `${row.join(",")}\n`;
	}
	return csv;
}

// ─── Preview ─────────────────────────────────────────────────────────────────

function printPreview(items: any[]) {
	const count = Math.min(3, items.length);
	if (count === 0) return;

	console.log(
		`  ${chalk.dim(`╭─ Preview (first ${count}) ${"─".repeat(40)}`)}`,
	);
	for (let i = 0; i < count; i++) {
		const item = items[i];
		const label = item.username ? `@${item.username}` : `#${item.id || i}`;
		const snippet = (item.caption || item.text || item.full_name || "").replace(
			/\n/g,
			" ",
		);
		const trunc =
			snippet.length > 50 ? `${snippet.substring(0, 47)}...` : snippet;
		console.log(
			`  ${chalk.dim("│")} ${chalk.cyan(label)} ${chalk.dim("·")} "${chalk.white(trunc)}"`,
		);
	}
	console.log(`  ${chalk.dim(`╰${"─".repeat(60)}`)}`);
	console.log("");
}
