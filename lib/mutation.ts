// A standalone server is a single process. Serialize reference checks and file
// deletion with writes so attaching a PDF cannot race its last-reference cleanup.
const state = globalThis as unknown as { paperMutationTail?: Promise<void> }
export async function withPaperMutation<T>(run: () => Promise<T>): Promise<T> {
  const previous = state.paperMutationTail || Promise.resolve()
  let release!: () => void
  state.paperMutationTail = new Promise<void>(resolve => { release = resolve })
  await previous
  try { return await run() } finally { release() }
}
