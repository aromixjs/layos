export function formatDate(date: Date = new Date()): string {
	return date.toISOString()
}

export function generateId(): string {
	return crypto.randomUUID()
}

export function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
