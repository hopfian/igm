import chalk from "chalk";
import { Card } from "../../../shared/ui/card.component";
import { Theme } from "../../../shared/ui/theme";
import { formatNumber } from "../../../shared/utils/formatters";
import type {
	FriendshipStatus,
	ProfileInfo,
	SearchUser,
} from "../models/user.model";

export function renderSearchResults(users: SearchUser[]): void {
	console.log(
		Theme.accent(
			`\n${Theme.symbols.search} SEARCH RESULTS (${users.length})\n`,
		),
	);
	if (users.length === 0) {
		console.log(Theme.gray("  No users found."));
		return;
	}

	for (const u of users) {
		const verified = u.is_verified ? chalk.blue(" ✓") : "";
		const priv = u.is_private ? chalk.dim(" 🔒") : "";
		const followers = u.follower_count
			? chalk.dim(` · ${formatNumber(u.follower_count)} followers`)
			: "";
		console.log(
			`  ${Theme.secondary(`@${u.username}`)}${verified}${priv} — ${u.full_name}${followers}`,
		);
	}
	console.log();
}

export function renderProfile(profile: ProfileInfo): void {
	console.log(Theme.primary(`\n${Theme.symbols.user} PROFILE\n`));

	const verified = profile.is_verified ? chalk.blue(" ✓") : "";
	const title = `@${profile.username}${verified}`;
	const content = [
		`Name: ${profile.full_name || "N/A"}`,
		`ID: ${chalk.dim(profile.id)}`,
		`Status: ${profile.is_private ? "🔒 Private" : "🌐 Public"}`,
		...(profile.category ? [`Category: ${profile.category}`] : []),
		"",
		`${chalk.green(formatNumber(profile.follower_count))} followers · ${chalk.green(formatNumber(profile.following_count))} following · ${formatNumber(profile.media_count)} posts`,
		...(profile.mutual_followers_count
			? [`${profile.mutual_followers_count} mutual follower(s)`]
			: []),
		"",
		profile.biography || Theme.dim("(No bio)"),
		...(profile.external_url ? ["", chalk.blue(profile.external_url)] : []),
	];

	Card.draw(content, title);

	if (profile.show_account_transparency_details) {
		console.log(
			`\n  ${Theme.accent(`${Theme.symbols.bullet} Transparency details available.`)}`,
		);
	}
	console.log();
}

export function renderFriendship(
	status: FriendshipStatus,
	username: string,
): void {
	console.log(Theme.primary(`\n  Friendship with @${username}\n`));
	const line = (label: string, val: boolean) =>
		console.log(`  ${val ? chalk.green("✓") : chalk.red("✗")} ${label}`);

	line("You follow them", status.following);
	line("They follow you", status.followed_by);
	line("Blocking", status.blocking);
	line("Muting", status.muting);
	line("Restricted", status.is_restricted);
	if (status.outgoing_request)
		console.log(`  ${chalk.yellow("⏳")} Pending follow request`);
	if (status.incoming_request)
		console.log(`  ${chalk.yellow("⏳")} They requested to follow you`);
	console.log();
}
