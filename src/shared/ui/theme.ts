// ⚠️  DOC-SYNC: Any changes to this file MUST be reflected in docs/ui.md (§ theme.ts — Color Palette & Symbols)
//     If color tokens or symbols are added/removed, update the theme table in the docs.
import chalk from "chalk";

export const Theme = {
	primary: chalk.bold.magenta,
	secondary: chalk.bold.cyan,
	accent: chalk.yellow,
	error: chalk.bold.red,
	success: chalk.bold.green,
	dim: chalk.dim,
	gray: chalk.gray,
	blue: chalk.blue,
	underline: chalk.underline,

	symbols: {
		heart: "♥",
		comment: "💬",
		notification: "🔔",
		inbox: "📩",
		search: "🔍",
		reels: "🎬",
		explore: "🧭",
		download: "📥",
		user: "👤",
		verified: "☑️",
		private: "🔒",
		bullet: "•",
		separator: "─",
		corner_tl: "┌",
		corner_tr: "┐",
		corner_bl: "└",
		corner_br: "┘",
		vertical: "│",
		horizontal: "─",
	},
};
