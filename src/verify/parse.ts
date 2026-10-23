// REQ-VER-001 the Verify command of a task line.

export interface VerifySpec {
  kind: "command" | "manual";
  command: string | null;
}

/** Code spans in a text, as CommonMark reads them: a run of N backticks closes at the next run of N. */
export function codeSpans(text: string): string[] {
  const spans: string[] = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== "`") {
      i++;
      continue;
    }
    let n = 0;
    while (text[i + n] === "`") n++;
    const open = i + n;
    let j = open;
    let close = -1;
    while (j < text.length) {
      if (text[j] !== "`") {
        j++;
        continue;
      }
      let m = 0;
      while (text[j + m] === "`") m++;
      if (m === n) {
        close = j;
        break;
      }
      j += m;
    }
    if (close < 0) {
      i = open;
      continue;
    }
    let body = text.slice(open, close).replace(/\n/g, " ");
    if (body.length > 2 && body.startsWith(" ") && body.endsWith(" ") && body.trim() !== "") body = body.slice(1, -1);
    if (body.trim()) spans.push(body);
    i = close + n;
  }
  return spans;
}

export function parseVerify(taskLine: string): VerifySpec {
  const at = taskLine.indexOf("Verify:");
  if (at < 0) return { kind: "manual", command: null };
  const spans = codeSpans(taskLine.slice(at + "Verify:".length));
  if (spans.length === 0) return { kind: "manual", command: null };
  return { kind: "command", command: spans.join(" && ") };
}
