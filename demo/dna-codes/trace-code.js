function withoutDnaCodeComments(line, shell = false) {
  if (shell && /^\s*#(?:\s|$)/.test(line)) return '';
  return line.replace(/(["'`])(?:\\.|(?!\1).)*\1|\/\/.*$|\/\*.*?\*\//g,
    (token,quote) => quote ? token : '').trimEnd();
}

function dnaCodeTokens(line) {
  const tokens = /(`(?:\\.|[^`\\])*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\b(?:as|auto|await|bool|break|cd|class|const|continue|def|elif|else|enum|export|false|float|for|from|if|import|in|int|let|new|None|null|number|or|and|not|print|return|string|struct|throw|true|False|True|typeof|unknown|using|void|while|include)\b|\b(?:0x[\da-fA-F]+|\d+(?:\.\d+)?)\b)/g;
  return line.split(tokens).map((value,i) => ({value,kind:i%2 === 0 ? undefined :
    /^[`"']/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : 'keyword'}));
}

function paintDnaCode(target,tokens,length = Infinity) {
  const parts = [];
  for (const {value,kind} of tokens) {
    if (length <= 0) break;
    const visible = value.slice(0,length);
    length -= visible.length;
    if (!kind) parts.push(visible);
    else {
      const span = document.createElement('span');
      span.className = 'syntax-' + kind;
      span.textContent = visible;
      parts.push(span);
    }
  }
  target.replaceChildren(...parts);
}
