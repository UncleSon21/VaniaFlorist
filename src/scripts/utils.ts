export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}
export function qs<T extends Element = Element>(sel: string, parent: ParentNode | Document = document): T | null {
  return parent.querySelector(sel) as T |null;
}
export function qsa<T extends Element = Element>(sel: string, parent: ParentNode | Document = document): T[] {
  return Array.from(parent.querySelectorAll(sel)) as T[];
}
export function getParam(key: string): string | null {
  return new URLSearchParams(location.search).get(key);
}