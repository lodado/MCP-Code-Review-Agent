# my-mcp-server

A Model Context Protocol (MCP) server built with [mcp-framework](https://github.com/QuantGeekDev/mcp-framework). This server provides intelligent code review using OpenAI's Codex AI, weather information, and general utilities.

## Features

- 🧠 **Intelligent Code Review**: Advanced TypeScript code analysis using OpenAI's Codex AI
- 🌤️ **Weather API Tool**: Real-time weather information for cities
- 🛠️ **Example Tool**: General-purpose message processing

## Quick Start

```bash
# Install dependencies
npm install

# Set up Codex CLI
npm install -g @openai/codex
# Or: brew install codex

# Authenticate with Codex CLI
codex

# Build the project
npm run build

# Link globally for testing
npm link

# Test the server
my-mcp-server
```

## Environment Setup

Install and authenticate Codex CLI:

```bash
# Install Codex CLI globally
npm install -g @openai/codex
# Or using Homebrew
brew install codex

# Authenticate with your ChatGPT account
codex
```

Codex CLI will use your ChatGPT Plus, Pro, Team, Edu, or Enterprise plan for intelligent code analysis.

## Project Structure

```
my-mcp-server/
├── src/
│   ├── tools/        # MCP Tools
│   │   ├── CodexReviewTool.ts    # Git-based code review tool
│   │   ├── WeatherTool.ts        # Weather API integration
│   │   └── ExampleTool.ts        # Example tool
│   └── index.ts      # Server entry point
├── dist/             # Compiled JavaScript files
├── package.json
└── tsconfig.json
```

## Available Tools

### 🔍 Codex Review Tool (`codex_review`)

Performs automated code review based on Git status analysis.

**Parameters:**

- `repositoryPath` (optional): Path to the repository to review (default: current directory)
- `reviewType` (optional): Type of review - "full", "staged", or "modified" (default: "modified")
- `includeSuggestions` (optional): Include improvement suggestions (default: true)
- `useCodex` (optional): Use OpenAI Codex AI for intelligent analysis (default: true)

**Features:**

#### 🧠 Codex CLI Analysis

- ✅ **Context Understanding**: Analyzes code purpose and functionality using [OpenAI Codex CLI](https://github.com/openai/codex)
- ✅ **Security Vulnerability Detection**: SQL injection, XSS, unsafe data handling
- ✅ **Performance Optimization**: Identifies bottlenecks and inefficiencies
- ✅ **Architecture Review**: SOLID principles, design patterns, coupling analysis
- ✅ **Logic Error Detection**: Edge cases, race conditions, type safety
- ✅ **Intelligent Suggestions**: Specific, actionable improvement recommendations

#### 📊 Enhanced Reporting

- ✅ Categorized issues (Security 🔒, Performance ⚡, Architecture 🏗️, Logic 🧩, Style 🎨)
- ✅ Context-aware analysis
- ✅ Detailed recommendations

### 🌤️ Weather API Tool (`weather_api`)

Provides real-time weather information for cities using Open-Meteo API.

**Parameters:**

- `city`: City name to get weather information for

**Features:**

- Real-time weather data
- Korean city name support
- Temperature, humidity, wind speed, precipitation data
- Weather condition descriptions

### 🛠️ Example Tool (`example_tool`)

A simple example tool for message processing.

**Parameters:**

- `message`: Message to process

## Adding Components

You can add more tools using the CLI:

```bash
# Add a new tool
mcp add tool my-tool

# Example tools you might create:
mcp add tool data-processor
mcp add tool api-client
mcp add tool file-handler
```

## Tool Development

Example tool structure:

```typescript
import { MCPTool } from "mcp-framework";
import { z } from "zod";

interface MyToolInput {
  message: string;
}

class MyTool extends MCPTool<MyToolInput> {
  name = "my_tool";
  description = "Describes what your tool does";

  schema = {
    message: {
      type: z.string(),
      description: "Description of this input parameter",
    },
  };

  async execute(input: MyToolInput) {
    // Your tool logic here
    return `Processed: ${input.message}`;
  }
}

export default MyTool;
```

## Publishing to npm

1. Update your package.json:

   - Ensure `name` is unique and follows npm naming conventions
   - Set appropriate `version`
   - Add `description`, `author`, `license`, etc.
   - Check `bin` points to the correct entry file

2. Build and test locally:

   ```bash
   npm run build
   npm link
   my-mcp-server  # Test your CLI locally
   ```

3. Login to npm (create account if necessary):

   ```bash
   npm login
   ```

4. Publish your package:

   ```bash
   npm publish
   ```

After publishing, users can add it to their claude desktop client (read below) or run it with npx

````

## Using with Claude Desktop

### Local Development

Add this configuration to your Claude Desktop config file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "my-mcp-server"
    }
  }
}
```

### After Publishing

Add this configuration to your Claude Desktop config file:

**MacOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "npx",
      "args": ["my-mcp-server"]
    }
  }
}
```

## Building and Testing

1. Make changes to your tools
2. Run `npm run build` to compile
3. The server will automatically load your tools on startup

## Code Quality Analysis (Using Codex)

The Codex Review Tool uses intelligent AI analysis to provide comprehensive code review:

### Analysis Areas

**TypeScript/JavaScript:**
- Code structure and organization
- Type safety and best practices
- Performance optimization opportunities
- Security vulnerability detection
- Architecture and design pattern analysis

## Learn More

- [MCP Framework GitHub](https://github.com/QuantGeekDev/mcp-framework) - Core framework documentation
- [MCP Framework Docs](https://mcp-framework.com) - Official documentation
- [Model Context Protocol](https://modelcontextprotocol.io/) - MCP specification
````
