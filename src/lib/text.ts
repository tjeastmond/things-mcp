/**
 * Unescape C-style escapes inside a wire-format field per AGENTS.md:
 * `\n` `\t` `\\`
 */
export function unescapeCField(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c !== '\\' || i + 1 >= input.length) {
      out += c;
      continue;
    }
    const n = input[i + 1];
    switch (n) {
      case 'n':
        out += '\n';
        i++;
        break;
      case 't':
        out += '\t';
        i++;
        break;
      case '\\':
        out += '\\';
        i++;
        break;
      default:
        out += c;
        break;
    }
  }
  return out;
}
