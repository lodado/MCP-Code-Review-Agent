import { resolve, normalize, isAbsolute } from "path";
import { PathPolicy } from "../../domain/ports.js";

export class SafePathPolicy implements PathPolicy {
  resolve(basePath: string, inputPath: string): string {
    const normalizedBase = normalize(resolve(basePath));

    let resolvedPath: string;

    // If inputPath is already absolute, use it directly
    if (isAbsolute(inputPath)) {
      resolvedPath = normalize(inputPath);
    } else {
      // Normalize inputPath for comparison
      const normalizedInput = normalize(inputPath);

      // Split into segments for comparison
      const baseSegments = normalizedBase.split(/[/\\]/).filter(Boolean);
      const inputSegments = normalizedInput.split(/[/\\]/).filter(Boolean);

      // Check if inputPath starts with a suffix of basePath (indicating duplication)
      // For example: basePath ends with "modules/moduleFederation"
      // and inputPath starts with "modules/moduleFederation/packages/..."
      let overlapLength = 0;
      for (
        let len = Math.min(baseSegments.length, inputSegments.length);
        len > 0;
        len--
      ) {
        const baseSuffix = baseSegments.slice(-len);
        const inputPrefix = inputSegments.slice(0, len);

        if (this.segmentsEqual(baseSuffix, inputPrefix)) {
          overlapLength = len;
          break;
        }
      }

      // If there's overlap, remove the overlapping part from inputPath
      if (overlapLength > 0) {
        const remainingInputSegments = inputSegments.slice(overlapLength);
        // Reconstruct path without duplication using resolve for proper absolute path handling
        const deduplicatedInput = remainingInputSegments.join("/");
        resolvedPath = normalize(resolve(normalizedBase, deduplicatedInput));
      } else {
        // No overlap, resolve normally
        resolvedPath = normalize(resolve(basePath, inputPath));
      }
    }

    const normalizedResolved = normalize(resolvedPath);

    // Check for path traversal using canonical paths
    if (!this.isWithin(normalizedBase, normalizedResolved)) {
      throw new Error(`Path traversal detected: ${inputPath}`);
    }

    return normalizedResolved;
  }

  private segmentsEqual(segments1: string[], segments2: string[]): boolean {
    if (segments1.length !== segments2.length) return false;
    for (let i = 0; i < segments1.length; i++) {
      const s1 =
        process.platform === "win32"
          ? segments1[i].toLowerCase()
          : segments1[i];
      const s2 =
        process.platform === "win32"
          ? segments2[i].toLowerCase()
          : segments2[i];
      if (s1 !== s2) return false;
    }
    return true;
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
