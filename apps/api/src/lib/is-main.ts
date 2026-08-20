import path from "node:path";
import { pathToFileURL } from "node:url";

/** True quando o arquivo foi executado direto (`tsx src/server.ts`), inclusive no Windows. */
export function isMainModule(metaUrl: string): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return metaUrl === pathToFileURL(path.resolve(entry)).href;
  } catch {
    return false;
  }
}
