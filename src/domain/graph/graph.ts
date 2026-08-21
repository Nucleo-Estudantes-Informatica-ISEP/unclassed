export interface GraphConnection<E> {
  from: string;
  to: string;
  value: E;
}

export interface Graph<V, E> {
  readonly size: number;
  readonly edgeCount: number;
  addVertex(id: string, value: V): void;
  addEdge(from: string, to: string, value: E): void;
  vertex(id: string): V | undefined;
  vertices(): IterableIterator<[string, V]>;
  outgoingEdges(id: string): readonly GraphConnection<E>[];
}
