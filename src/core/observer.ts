import { Runtime } from './runtime'
export class Observer {
	private runtime: Runtime

	constructor(runtime: Runtime) {
		this.runtime = runtime
	}

	private handleAttributeChange(element: HTMLElement): void {
		const layValue = element.getAttribute('lay')
		if (layValue === null) {
			this.runtime.cleanup(element)
			return
		}
		this.runtime.run(element, layValue)
	}

	private handleElementAdded(element: HTMLElement): void {
		const layValue = element.getAttribute('lay')
		if (layValue !== null) {
			this.runtime.run(element, layValue)
		}
		this.runtime.scan(element)
	}

	private handleElementRemoved(element: HTMLElement): void {
		this.runtime.cleanup(element)
		const descendantElements = element.querySelectorAll<HTMLElement>('[lay]')
		for (const descendantElement of descendantElements) {
			this.runtime.cleanup(descendantElement)
		}
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

	observe(target: Node) {
		this.observer.observe(target, {
			attributes: true,
			attributeFilter: ['lay'],
			childList: true,
			subtree: true,
		})
	}

	disconnect() {
		this.observer.disconnect()
	}
}
