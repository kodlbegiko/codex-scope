const fs = require("node:fs");
const path = require("node:path");

export function isFile(filePath: string): boolean {
  try {
    return fs.statSync(filePath).isFile();
  } catch (error: any) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
    throw error;
  }
}

export function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch (error: any) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
    throw error;
  }
}

export function fileSize(filePath: string): number {
  return fs.statSync(filePath).size;
}

export function readBuffer(filePath: string): Buffer {
  return fs.readFileSync(filePath);
}

export function readBufferLimit(filePath: string, maxBytes: number): Buffer {
  const limit = Math.max(0, Math.trunc(maxBytes));
  if (limit === 0) return Buffer.alloc(0);
  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(limit);
    const bytesRead = fs.readSync(fd, buffer, 0, limit, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    fs.closeSync(fd);
  }
}

export function readText(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

export function normalizeExistingDirectory(input: string): string {
  const absolute = path.resolve(input);
  if (!isDirectory(absolute)) {
    throw new Error(`Target directory does not exist: ${absolute}`);
  }
  return fs.realpathSync(absolute);
}

export function normalizePathBestEffort(input: string): string {
  const absolute = path.resolve(input);
  try {
    const resolved = fs.realpathSync.native ? fs.realpathSync.native(absolute) : fs.realpathSync(absolute);
    return process.platform === "win32" ? resolved.toLowerCase() : resolved;
  } catch (error: any) {
    if (error?.code !== "ENOENT" && error?.code !== "ENOTDIR") throw error;
    const normalized = path.normalize(absolute);
    return process.platform === "win32" ? normalized.toLowerCase() : normalized;
  }
}

export function samePathBestEffort(left: string, right: string): boolean {
  return normalizePathBestEffort(left) === normalizePathBestEffort(right);
}

export function parentDirectories(start: string): string[] {
  const result: string[] = [];
  let current = path.resolve(start);
  while (true) {
    result.push(current);
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return result;
}

export function directoriesFromRoot(root: string, cwd: string): string[] {
  const rel = path.relative(root, cwd);
  if (rel.startsWith("..") || path.isAbsolute(rel)) {
    return [cwd];
  }
  const result = [root];
  if (!rel) return result;
  let current = root;
  for (const part of rel.split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    result.push(current);
  }
  return result;
}

export function displayPath(filePath: string, cwd: string, home?: string): string {
  const absolute = path.resolve(filePath);
  if (home) {
    const homeAbs = path.resolve(home);
    if (absolute === homeAbs) return "~";
    if (absolute.startsWith(`${homeAbs}${path.sep}`)) {
      return `~${path.sep}${path.relative(homeAbs, absolute)}`;
    }
  }
  const rel = path.relative(cwd, absolute);
  if (rel && !rel.startsWith("..") && !path.isAbsolute(rel)) return `.${path.sep}${rel}`;
  if (!rel) return ".";
  return absolute;
}

export { path };
