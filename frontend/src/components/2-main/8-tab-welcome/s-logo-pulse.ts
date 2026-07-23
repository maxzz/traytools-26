import { proxy } from "valtio";

/** Ephemeral UI signal: increment to play the welcome logo anticipation pulse. */
export const welcomeLogoPulse = proxy({ tick: 0 });

export function pulseWelcomeLogo() {
    welcomeLogoPulse.tick++;
}
