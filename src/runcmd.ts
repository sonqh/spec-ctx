// REQ-CLI-010 the one function that builds a command for a person or agent to run (043/D1).

/** The prefix, a space, and the arguments. Every printed command goes through here. */
export function runCommand(run: string, args: string): string {
  return `${run} ${args}`;
}
