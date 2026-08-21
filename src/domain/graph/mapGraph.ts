import type { Graph, GraphConnection } from "./graph";

export class MapGraph<V, E> implements Graph<V, E> {
  private readonly vertexValues = new Map<string, V>();
  private readonly adjacency = new Map<string, GraphConnection<E>[]>();

  get size() {
    return this.vertexValues.size;
  }

  get edgeCount() {
    return Array.from(this.adjacency.values()).reduce(
      (count, edges) => count + edges.length,
      0
    );
  }

  addVertex(id: string, value: V) {
    this.vertexValues.set(id, value);
    if (!this.adjacency.has(id)) this.adjacency.set(id, []);
  }

  addEdge(from: string, to: string, value: E) {
    if (!this.vertexValues.has(from) || !this.vertexValues.has(to)) {
      throw new Error(
        `Both vertices must exist before adding edge ${from} -> ${to}`
      );
    }

    this.adjacency.get(from)?.push({ from, to, value });
  }

  vertex(id: string) {
    return this.vertexValues.get(id);
  }

  vertices() {
    return this.vertexValues.entries();
  }

  outgoingEdges(id: string) {
    return this.adjacency.get(id) ?? [];
  }
}
