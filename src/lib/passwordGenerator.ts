const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{}";
const ALPHABET = LOWER + UPPER + DIGITS + SYMBOLS;

export function generateSecurePassword(length = 20): string {
	const bytes = crypto.getRandomValues(new Uint32Array(length));
	let password = "";
	for (const byte of bytes) {
		password += ALPHABET[byte % ALPHABET.length];
	}
	return password;
}

export interface PasswordStrength {
	score: 0 | 1 | 2 | 3 | 4;
	label: string;
}

// Heuristico simple por entropia (longitud * log2 del tamano del alfabeto
// usado), no es zxcvbn (no vale la pena la dependencia para un side project)
// pero distingue bien "1234" de una password generada de 20 caracteres.
export function estimatePasswordStrength(password: string): PasswordStrength {
	if (!password) return { score: 0, label: "" };

	let alphabetSize = 0;
	if (/[a-z]/.test(password)) alphabetSize += 26;
	if (/[A-Z]/.test(password)) alphabetSize += 26;
	if (/[0-9]/.test(password)) alphabetSize += 10;
	if (/[^a-zA-Z0-9]/.test(password)) alphabetSize += 32;

	const entropy = password.length * Math.log2(Math.max(alphabetSize, 2));

	if (entropy < 28) return { score: 0, label: "Muy debil" };
	if (entropy < 40) return { score: 1, label: "Debil" };
	if (entropy < 60) return { score: 2, label: "Aceptable" };
	if (entropy < 80) return { score: 3, label: "Fuerte" };
	return { score: 4, label: "Muy fuerte" };
}
