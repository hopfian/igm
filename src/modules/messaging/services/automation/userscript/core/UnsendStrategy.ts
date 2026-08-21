import type { IDMU } from "./IDMU";

export abstract class UnsendStrategy {
	protected _idmu: IDMU;

	constructor(idmu: IDMU) {
		this._idmu = idmu;
	}

	abstract isRunning(): boolean;
	abstract stop(): void;
	abstract reset(): void;
	abstract run(): Promise<void>;
	abstract getUnsentCount(): number;

	get idmu(): IDMU {
		return this._idmu;
	}
}
