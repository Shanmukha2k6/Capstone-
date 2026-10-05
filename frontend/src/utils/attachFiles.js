export const CONTEXT_LIMIT = 20000;
export const ATTACH_ACCEPT = ".py,.js,.jsx,.ts,.tsx,.java,.kt,.go,.rs,.c,.cpp,.h,.cs,.rb,.php,.swift,.sh,.html,.css,.sql,.json,.yaml,.yml,.toml,.xml,.md,.txt,.gradle,.env.example,.log";

/** Reads local text files and appends them to the chat context as delimited, read-only blocks within the character limit. */
export async function appendFilesToContext(files, context = "") {
  let next = context, skipped = [];
  for (const file of Array.from(files || [])) {
    let text;
    try { text = await file.text(); } catch { skipped.push(`${file.name} (unreadable)`); continue; }
    if (text.includes("\u0000")) { skipped.push(`${file.name} (binary)`); continue; }
    const block = `${next ? "\n\n" : ""}<file name="${file.name.replace(/"/g, "")}">\n${text}\n</file>`;
    if (next.length + block.length > CONTEXT_LIMIT) { skipped.push(`${file.name} (over the ${CONTEXT_LIMIT.toLocaleString()}-character limit)`); continue; }
    next += block;
  }
  return { context: next, skipped };
}

export const attachedFileNames = (context = "") => [...context.matchAll(/<file name="([^"]*)">/g)].map((match) => match[1]);
