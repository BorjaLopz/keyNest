import type { ActivityEntry } from "../lib/activityService";
import type { UnlockedSession } from "../lib/authService";
import type { CredentialRow } from "../lib/credentialService";
import type { GroupSummary } from "../lib/groupService";

export const NO_SUBGROUP = "__none__";

export interface CredentialSection {
	key: string;
	label: string;
	rows: CredentialRow[];
}

export interface VaultViewProps {
	session: UnlockedSession;
	groups: GroupSummary[];
	selectedGroup: GroupSummary | null;
	onSelectGroup: (id: string) => void;
	onAddGroup: () => void;
	onLock: () => void;
	onLogout: () => void;
	sections: CredentialSection[];
	query: string;
	onQueryChange: (query: string) => void;
	selectedCredentialId: string | null;
	onSelectCredential: (id: string) => void;
	selectedCredential: CredentialRow | null;
	onCopy: (row: CredentialRow) => void;
	onReveal: (row: CredentialRow) => Promise<string>;
	copyStatus: string | null;
	onEdit: (row: CredentialRow) => void;
	onDelete: (id: string) => void;
	onAddCredential: () => void;
	onAddSubgroup: (name: string) => void;
	onDeleteSubgroup: (subgroupId: string, name: string) => void;
	onOpenGroupSettings: () => void;
	onLoadCredentialActivity: (credentialId: string) => Promise<ActivityEntry[]>;
}
