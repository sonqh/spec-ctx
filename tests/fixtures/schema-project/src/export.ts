// REQ-EXP-001
export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map(quote).join(",")).join("\n");
}

// REQ-EXP-002
function quote(field: string): string {
  return field.includes(",") ? `"${field}"` : field;
}
