export function getInitials(text: string): string {
	const words = text.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
	return (words[0]![0]! + words[1]![0]!).toUpperCase();
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
