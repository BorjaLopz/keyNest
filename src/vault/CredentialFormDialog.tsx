import { CredentialForm } from "../CredentialForm";
import type { CredentialFormValues } from "../lib/credentialService";
import type { Subgroup } from "../lib/subgroupService";

interface CredentialFormDialogProps {
	title: string;
	subgroups: Subgroup[];
	initialValues?: Partial<CredentialFormValues>;
	submitLabel: string;
	requirePassword?: boolean;
	onSubmit: (values: CredentialFormValues) => Promise<void>;
	onClose: () => void;
}

export function CredentialFormDialog({
	title,
	subgroups,
	initialValues,
	submitLabel,
	requirePassword,
	onSubmit,
	onClose,
}: CredentialFormDialogProps) {
	return (
		<div className="dialog-backdrop" onClick={onClose}>
			<div className="dialog" style={{ width: "min(440px, 100%)" }} onClick={(e) => e.stopPropagation()}>
				<div className="dialog-title">{title}</div>
				<CredentialForm
					subgroups={subgroups}
					initialValues={initialValues}
					submitLabel={submitLabel}
					requirePassword={requirePassword}
					onSubmit={onSubmit}
					onCancel={onClose}
				/>
			</div>
		</div>
	);
}
