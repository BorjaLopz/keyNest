import type { UnlockedSession } from "../lib/authService";
import type { CredentialRow } from "../lib/credentialService";
import type { GroupSummary } from "../lib/groupService";

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
	sections: CredentialSection[];
	query: string;
	onQueryChange: (query: string) => void;
	selectedCredentialId: string | null;
	onSelectCredential: (id: string) => void;
	selectedCredential: CredentialRow | null;
	onCopy: (row: CredentialRow) => void;
	copyStatus: string | null;
	onEdit: (row: CredentialRow) => void;
	onDelete: (id: string) => void;
	onAddCredential: () => void;
	onAddSubgroup: (name: string) => void;
	onInvite: () => void;
}
