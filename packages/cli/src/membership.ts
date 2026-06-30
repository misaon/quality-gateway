/** Build a type guard that narrows a string to one of `values` (membership in a fixed value-set). */
export function isOneOf<Value extends string>(values: readonly Value[]): (candidate: string) => candidate is Value {
  const set: ReadonlySet<string> = new Set(values)

  return (candidate): candidate is Value => set.has(candidate)
}
