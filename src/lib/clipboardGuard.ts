// El navegador bloquea Clipboard.readText() si el documento no tiene foco
// (justo lo que pasa cuando el usuario cambia de pestana/app para pegar la
// password, el caso de uso normal). No hay forma de forzarlo desde JS: en
// vez de reintentar a ciegas, se reintenta cuando la pestana recupera el
// foco (visibilitychange/focus), momento en el que readText() si funciona.

interface PendingClear {
	value: string;
	clearAt: number;
}

let pending: PendingClear | null = null;
let listenerAttached = false;

function attemptClear() {
	if (!pending || Date.now() < pending.clearAt) return;
	const target = pending.value;

	navigator.clipboard
		.readText()
		.then((current) => {
			pending = null;
			if (current === target) return navigator.clipboard.writeText("");
		})
		.catch(() => {
			// documento sin foco: pending se mantiene, se reintenta en el proximo focus
		});
}

function ensureListener() {
	if (listenerAttached) return;
	listenerAttached = true;
	document.addEventListener("visibilitychange", () => {
		if (document.visibilityState === "visible") attemptClear();
	});
	window.addEventListener("focus", attemptClear);
}

export function scheduleClipboardClear(value: string, delayMs: number): void {
	pending = { value, clearAt: Date.now() + delayMs };
	ensureListener();
	window.setTimeout(attemptClear, delayMs);
}
