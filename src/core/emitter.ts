export interface Emitter {
  emit(): void;
  subscribe(listener: () => void): () => void;
}

export function createEmitter(): Emitter {
  const listeners = new Set<() => void>();
  return {
    emit() {
      for (const listener of [...listeners]) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
