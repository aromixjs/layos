import { Orchestrator } from './orchestrator'
import type { TokenDef } from './token'
export { token } from './token'
export type { TokenContext, TokenDef, TokenNode } from './token'

export class Layos {
	readonly orchestrator: Orchestrator
	constructor(tokens: TokenDef[]) {
		this.orchestrator = new Orchestrator(tokens)
	}

	private observer = new MutationObserver((mutations) => {
		for (const mutation of mutations) {
			if (mutation.type === 'attributes') {
				this.handleAttributeChange(mutation.target as HTMLElement)
				continue
			}

			if (mutation.type !== 'childList') {
				continue
			}

			for (const addedNode of mutation.addedNodes) {
				if (addedNode instanceof HTMLElement) {
					this.handleElementAdded(addedNode)
				}
			}

			for (const removedNode of mutation.removedNodes) {
				if (removedNode instanceof HTMLElement) {
					this.handleElementRemoved(removedNode)
				}
			}
		}
	})

	private handleAttributeChange(element: HTMLElement): void {
		const layValue = element.getAttribute('lay')

		if (layValue === null) {
			this.orchestrator.cleanup(element)
			return
		}

		this.orchestrator.run(element, layValue)
	}

	private handleElementAdded(element: HTMLElement): void {
		const layValue = element.getAttribute('lay')

		if (layValue !== null) {
			this.orchestrator.run(element, layValue)
		}

		this.orchestrator.scan(element)
	}

	private handleElementRemoved(element: HTMLElement): void {
		this.orchestrator.cleanup(element)

		const descendantElements = element.querySelectorAll<HTMLElement>('[lay]')

		for (const descendantElement of descendantElements) {
			this.orchestrator.cleanup(descendantElement)
		}
	}

	start(root: ParentNode): void {
		this.orchestrator.scan(root)

		const observationTarget = this.getObservationTarget(root)

		this.observer.observe(observationTarget, {
			attributes: true,
			attributeFilter: ['lay'],
			childList: true,
			subtree: true,
		})
	}
	private getObservationTarget(root: ParentNode): Node {
		if (root instanceof Document) {
			return root.documentElement
		}

		return root
	}
	stop(): void {
		this.observer.disconnect()
	}
}




export interface LayosConfig {
	tokens: TokenDef[],
	target: ParentNode
}




export function layos(config: LayosConfig): Layos {
	const layosInstance = new Layos(config.tokens)
	layosInstance.start(config.target)
	return layosInstance
}
