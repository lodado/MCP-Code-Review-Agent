import { resolve, normalize } from "path";
import { PathPolicy } from "../../domain/ports.js";

export class SafePathPolicy implements PathPolicy {
  resolve(basePath: string, inputPath: string): string {
    const resolvedPath = resolve(basePath, inputPath);
    const normalizedBase = normalize(resolve(basePath));
    const normalizedResolved = normalize(resolvedPath);

    // Check for path traversal using canonical paths
    if (!this.isWithin(normalizedBase, normalizedResolved)) {
      throw new Error(`Path traversal detected: ${inputPath}`);
    }

    return normalizedResolved;
  }

  isAllowed(path: string): boolean {
    try {
      // Additional security checks can be added here
      return true;
    } catch {
      return false;
    }
  }

  private isWithin(base: string, target: string): boolean {
    // Normalize separators to forward slashes for consistent comparison
    const normalizedBase = base.replace(/\\/g, "/");
    const normalizedTarget = target.replace(/\\/g, "/");

    // Ensure base ends with separator for proper prefix checking
    const baseWithSep = normalizedBase.endsWith("/")
      ? normalizedBase
      : normalizedBase + "/";

    // Normalize case for Windows compatibility
    const finalBase =
      process.platform === "win32" ? baseWithSep.toLowerCase() : baseWithSep;
    const finalTarget =
      process.platform === "win32"
        ? normalizedTarget.toLowerCase()
        : normalizedTarget;

    // Debug logging
    console.log(`Path check: base="${finalBase}", target="${finalTarget}"`);

    return finalTarget.startsWith(finalBase);
  }
}
