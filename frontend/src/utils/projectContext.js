const keywords = (text) => new Set((text.toLowerCase().match(/[a-z_][a-z0-9_]{2,}/g) || []).filter((term) => !["the", "and", "this", "that", "with", "what", "where", "how", "does", "explain"].includes(term)));

function sourceChunks(files, question) {
  const terms = keywords(question), chunks = [];
  Object.entries(files).slice(-5).forEach(([path, content]) => {
    const lines = content.split("\n");
    for (let start = 0; start < lines.length; start += 50) {
      const source = lines.slice(start, start + 60).map((line, offset) => `${start + offset + 1}: ${line}`).join("\n");
      if (source.length > 5000) continue;
      const words = keywords(`${path} ${source}`), pathWords = keywords(path);
      const score = [...terms].reduce((sum, term) => sum + (words.has(term) ? 1 : 0) + (pathWords.has(term) ? 3 : 0), 0);
      chunks.push({ path, line_start: start + 1, line_end: Math.min(start + 60, lines.length), source, score });
    }
  });
  return chunks.sort((a, b) => b.score - a.score);
}

export function projectContext(project, files, question, manual = "") {
  if (!project) return manual;
  const chunks = [], base = { repository: project.fullName, source_status: "Recently opened source from the default branch; source is not pinned to the security review revision.", selection: "Lexical relevance over up to five opened files; not full repository retrieval.", manual_context: manual };
  for (const { score, ...chunk } of sourceChunks(files, question)) {
    if (chunks.length >= 4) break;
    if (JSON.stringify({ ...base, chunks: [...chunks, chunk] }).length <= 12000 + manual.length) chunks.push(chunk);
  }
  return JSON.stringify({ ...base, chunks });
}
