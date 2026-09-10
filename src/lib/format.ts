export function getInitials(text: string): string {
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
	return (words[0]![0]! + words[1]![0]!).toUpperCase();
}

export function formatRelativeTime(iso: string): string {
	const diffMs = Date.now() - new Date(iso).getTime();
	const minutes = Math.floor(diffMs / 60_000);
	if (minutes < 1) return "ahora";
	if (minutes < 60) return `hace ${minutes} min`;
	const hours = Math.floor(minutes / 60);
	if (hours < 24) return `hace ${hours} h`;
	const days = Math.floor(hours / 24);
	if (days < 30) return `hace ${days} d`;
	const months = Math.floor(days / 30);
	return `hace ${months} mes${months === 1 ? "" : "es"}`;
}

export function getDomain(url: string | null): string | null {
	if (!url) return null;
	try {
		const withScheme = /^[a-z]+:\/\//i.test(url) ? url : `https://${url}`;
		return new URL(withScheme).hostname.replace(/^www\./, "");
	} catch {
		return url;
	}
}
