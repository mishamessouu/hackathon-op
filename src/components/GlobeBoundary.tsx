import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode; fallback: ReactNode }
type State = { failed: boolean }

/**
 * WebGL is not available everywhere. If the globe cannot start, the round must
 * still be playable, so this swaps in a text summary rather than blanking the
 * panel.
 */
export class GlobeBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
