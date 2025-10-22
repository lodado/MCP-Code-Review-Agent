import { MCPServer } from "mcp-framework";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read package.json to get name and version
const packageJsonPath = join(__dirname, "..", "package.json");
const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));

const server = new MCPServer({
  name: packageJson.name,
  version: packageJson.version,
  basePath: __dirname,
});

server.start();
