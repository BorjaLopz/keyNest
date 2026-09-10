import { useEffect, useState } from "react";

const BREAKPOINT = "(max-width: 819px)";

export function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(() => window.matchMedia(BREAKPOINT).matches);

	useEffect(() => {
		const mql = window.matchMedia(BREAKPOINT);
		const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
		mql.addEventListener("change", listener);
		return () => mql.removeEventListener("change", listener);
	}, []);

	return isMobile;
}
