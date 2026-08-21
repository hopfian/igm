import * as p from "@clack/prompts";
import chalk from "chalk";
import { loadConfig, saveConfig } from "../../core/config/config-manager";
import { IGClient } from "../../core/http/ig-client";
import { AuthService } from "../../modules/auth/services/auth.service";

export const registerAuthCommands = (yargs: any) => {
	yargs.command(
		"auth <subcommand>",
		"Manage Instagram authentication and multiple profiles",
		(y: any) => {
			return y
				.command(
					"login [profile]",
					"Login to Instagram and save session to a profile",
					(y2: any) => {
						return y2.positional("profile", {
							describe: "Name of the profile to save to",
							type: "string",
						});
					},
					handleLogin,
				)
				.command(
					"switch <profile>",
					"Switch active profile",
					(y2: any) => {
						return y2.positional("profile", {
							describe: "Profile name to switch to",
							type: "string",
						});
					},
					handleSwitch,
				)
				.command("list", "List saved profiles", {}, handleList);
		},
		() => {},
	);
};

async function handleLogin(argv: any) {
	p.intro(chalk.inverse(" igm auth login "));

	const config = loadConfig();

	const usernamePrompt = await p.text({
		message: "Instagram Username:",
		placeholder: "zuck",
		validate: (val) => (!val ? "Username is required" : undefined),
	});

	if (p.isCancel(usernamePrompt)) {
		p.cancel("Operation cancelled.");
		process.exit(0);
	}
	const username = usernamePrompt as string;

	const profileName = argv.profile || username;

	const passwordPrompt = await p.password({
		message: "Instagram Password:",
		validate: (val) => (!val ? "Password is required" : undefined),
	});

	if (p.isCancel(passwordPrompt)) {
		p.cancel("Operation cancelled.");
		process.exit(0);
	}
	const password = passwordPrompt as string;

	const spinner = p.spinner();
	spinner.start("Initializing login session...");

	try {
		// Initialize an empty client for login flow
		const client = new IGClient("local");
		const auth = new AuthService(client);

		// Step 1: Fetch CSRF
		await auth.preLogin();

		// Step 2: Login
		spinner.message("Authenticating...");
		let response: any;
		try {
			response = await auth.login(username, password);
		} catch (error: any) {
			if (error.statusCode === 400 && error.body) {
				const body =
					typeof error.body === "string" ? JSON.parse(error.body) : error.body;
				if (body.message === "checkpoint_required") {
					throw new Error(
						"Instagram flagged this login as suspicious. Please log in via browser first to clear the checkpoint.",
					);
				}
				if (body.two_factor_required) {
					response = body;
				} else {
					throw new Error(body.message || "Login failed due to bad request.");
				}
			} else {
				throw error;
			}
		}

		// Step 3: Handle 2FA
		if (response?.two_factor_required) {
			spinner.stop("Two-factor authentication required.");
			const twoFactorInfo = response.two_factor_info;

			const contactInfo = twoFactorInfo.obfuscated_phone_number
				? `(ending in ${twoFactorInfo.obfuscated_phone_number})`
				: "authenticator app";

			const codePrompt = await p.text({
				message: `Enter the 2FA code from your ${contactInfo}:`,
				validate: (val) => (!val ? "Code is required" : undefined),
			});

			if (p.isCancel(codePrompt)) {
				p.cancel("Operation cancelled.");
				process.exit(0);
			}

			const code = codePrompt as string;
			spinner.start("Verifying 2FA code...");

			try {
				await auth.submit2FA(
					username,
					twoFactorInfo.two_factor_identifier,
					code,
				);
			} catch (e: any) {
				if (e.statusCode === 400) {
					throw new Error("Invalid or expired 2FA code.");
				}
				throw e;
			}
		}

		spinner.stop("Login successful!");

		// Save profile
		const cookies = client.getCookies();

		const profiles = config.profiles || {};
		profiles[profileName] = cookies;

		saveConfig({
			profiles,
			activeProfile: profileName,
		});

		p.outro(`Session saved to profile '${profileName}' and set as active.`);
	} catch (e: any) {
		spinner.stop("Login failed.");
		p.cancel(e.message || "An error occurred during login.");
		process.exit(1);
	}
}

async function handleSwitch(argv: any) {
	const config = loadConfig();
	const profileName = argv.profile;

	if (profileName !== "local" && !config.profiles[profileName]) {
		console.error(chalk.red(`Error: Profile '${profileName}' not found.`));
		process.exit(1);
	}

	saveConfig({ activeProfile: profileName });
	console.log(chalk.green(`✓ Switched to profile '${profileName}'.`));
}

async function handleList() {
	const config = loadConfig();
	const profiles = Object.keys(config.profiles || {});

	console.log(chalk.bold("\nConfigured Profiles:\n"));

	const localActive = config.activeProfile === "local" ? " (active)" : "";
	console.log(
		`  ${config.activeProfile === "local" ? chalk.green("•") : " "} local${chalk.gray(localActive)}`,
	);

	for (const p of profiles) {
		const isActive = p === config.activeProfile;
		const marker = isActive ? chalk.green("•") : " ";
		const activeText = isActive ? chalk.gray(" (active)") : "";
		console.log(`  ${marker} ${p}${activeText}`);
	}
	console.log();
}
