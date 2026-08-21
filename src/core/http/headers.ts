// ⚠️ DOC-SYNC: Any changes to this file MUST be reflected in docs/core.md

/**
 * Fetch the Instagram homepage to extract live rollout values.
 * These rotate with deployments and stale values are a bot signal.
 */
export async function fetchRolloutHash(): Promise<{
	rolloutHash: string;
	asbdId: string;
} | null> {
	try {
		const https = await import("https");
		return new Promise((resolve) => {
			const req = https.get(
				"https://www.instagram.com/",
				{
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
						Accept: "text/html",
					},
				},
				(res) => {
					let body = "";
					res.on("data", (chunk: Buffer) => (body += chunk.toString()));
					res.on("end", () => {
						const hashMatch = body.match(/"server_revision":(\d+)/);
						const asbdMatch = body.match(/"ASBD_ID":"(\d+)"/);
						resolve({
							rolloutHash: hashMatch ? hashMatch[1] : "1039665806",
							asbdId: asbdMatch ? asbdMatch[1] : "198387",
						});
					});
				},
			);
			req.on("error", () => resolve(null));
			req.setTimeout(8000, () => {
				req.destroy();
				resolve(null);
			});
		});
	} catch {
		return null;
	}
}
