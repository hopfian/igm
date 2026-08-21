import { IGClient } from "../../../core/http/ig-client";

export class AuthService {
	private client: IGClient;

	constructor(client: IGClient) {
		this.client = client;
	}

	/**
	 * Pre-fetches the homepage to populate initial CSRF and session cookies
	 */
	public async preLogin(): Promise<void> {
		await this.client.apiCall("https://www.instagram.com/", "GET");
	}

	/**
	 * Submits the primary login request.
	 * Returns either a success payload or a 2FA challenge payload.
	 */
	public async login(username: string, password: string): Promise<any> {
		const timestamp = Math.floor(Date.now() / 1000).toString();
		const encPassword = `#PWD_INSTAGRAM_BROWSER:0:${timestamp}:${password}`;
		
		const data = {
			username,
			enc_password: encPassword,
			queryParams: "{}",
			optIntoOneTap: "false"
		};

		return this.client.apiCall("web/accounts/login/ajax/", "POST", data);
	}

	/**
	 * Submits the 2FA verification code.
	 */
	public async submit2FA(username: string, identifier: string, code: string): Promise<any> {
		const data = {
			username,
			identifier,
			verificationCode: code,
		};

		return this.client.apiCall("web/accounts/login/ajax/two_factor/", "POST", data);
	}
}
