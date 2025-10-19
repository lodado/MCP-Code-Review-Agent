# MCP Code Review Agent

> **Personal Use Repository**  
> This is a personal repository for my own use. Feel free to use it if you find it helpful.

A sophisticated code review tool built with the Model Context Protocol (MCP) framework, designed to improve code quality through multiple AI-powered analysis strategies with distinct personas and expertise areas.

## 🔐 Prerequisites

### Codex CLI Login & Permissions

This tool requires **Codex CLI** to be installed and authenticated. You need to log in to Codex and have the necessary permissions to use the AI-powered analysis features.

**Required Steps:**

1. **Install Codex CLI** (if not already installed)
2. **Login to Codex** using your credentials
3. **Ensure proper permissions** for AI analysis features

**Codex CLI Resources:**

- [Codex CLI Documentation](https://codex.com/docs/cli)
- [Codex CLI Installation Guide](https://codex.com/docs/cli/installation)
- [Codex Authentication Guide](https://codex.com/docs/cli/authentication)

**Note**: Without proper Codex CLI authentication, the AI-powered analysis strategies (Codex, Toxic Architect, Accessibility Expert) will not function. Only the static analysis strategy will be available.

## 🚀 Quick Start

### Installation

```bash
# Clone and build the tool locally (package not yet published to npm)
git clone https://github.com/lodado/MCP-Code-Review-Agent
cd MCP-Code-Review-Agent
npm install
npm run build
npm link
```

### Basic Usage

```bash
# Get balanced AI review (Codex)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"modified","analysisType":"codex"}}}' | node dist/index.js

# Get accessibility expert review
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"full","analysisType":"accessibility"}}}' | node dist/index.js

# Get brutally honest architect review (prepare for tough love!)
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"full","analysisType":"toxic-architect"}}}' | node dist/index.js
```

## 🤖 AI Review Agents & Personas

This tool features multiple AI agents, each with distinct personalities and expertise areas, providing comprehensive code review from different perspectives.

### 1. **Codex Analysis** (`codex`) - The Generalist

- **Persona**: Balanced AI code reviewer
- **Expertise**: Comprehensive analysis across all areas
- **Style**: Professional, thorough, and constructive
- **Focus**: Security, performance, architecture, and logic issues
- **Best for**: General code quality improvement

### 2. **Toxic Architect** (`toxic-architect`) - The Perfectionist

- **Persona**: Brutally honest senior architect with zero tolerance for poor code
- **Expertise**: SOLID principles, Clean Architecture, design patterns
- **Style**: Sarcastic, condescending, but technically accurate
- **Focus**: Architectural flaws, SOLID violations, design pattern misuse
- **Best for**: When you need tough love and architectural discipline

### 3. **Web Accessibility Expert** (`accessibility`) - The Inclusive Designer

- **Persona**: Senior Frontend Publisher with 10+ years of accessibility experience
- **Expertise**: WCAG compliance, semantic web, React accessibility
- **Style**: Professional, detail-oriented, user-focused
- **Focus**: Web accessibility, inclusive design, semantic HTML
- **Best for**: Frontend code, especially React/TypeScript components

### 4. **Static Analyzer** (`static`) - The Rule Enforcer

- **Persona**: Consistent, rule-based code analyzer
- **Expertise**: TypeScript patterns, code metrics, complexity analysis
- **Style**: Systematic, objective, fast
- **Focus**: Code metrics, complexity, basic patterns
- **Best for**: Quick feedback and consistent rule enforcement

### 5. **Hybrid Analysis** (`hybrid`) - The Team Player

- **Persona**: Combines multiple analysis approaches
- **Expertise**: Best of all worlds
- **Style**: Comprehensive and balanced
- **Focus**: Multiple perspectives in one review
- **Best for**: When you want comprehensive coverage

## 📖 Detailed Usage

### Method 1: Direct Execution (Development)

```bash
# Get balanced AI review (Codex)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"modified","analysisType":"codex"}}}' | node dist/index.js

# Get accessibility expert review
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"full","analysisType":"accessibility"}}}' | node dist/index.js

# Get brutally honest architect review (prepare for tough love!)
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"full","analysisType":"toxic-architect"}}}' | node dist/index.js

# Get quick static analysis
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"modified","analysisType":"static"}}}' | node dist/index.js

# Get comprehensive hybrid review
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"full","analysisType":"hybrid"}}}' | node dist/index.js
```

### Method 2: Global Installation (Production)

After running `npm link`, you can use the tool globally from any directory:

```bash
# Install globally (run once after npm link)
npm link

# Now you can use it from anywhere:
# Get balanced AI review (Codex)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"modified","analysisType":"codex"}}}' | mcp-code-review-agent

# Get accessibility expert review
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"full","analysisType":"accessibility"}}}' | mcp-code-review-agent

# Get brutally honest architect review
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"full","analysisType":"toxic-architect"}}}' | mcp-code-review-agent

# Get quick static analysis
echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"modified","analysisType":"static"}}}' | mcp-code-review-agent

# Get comprehensive hybrid review
echo '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"codex_review","arguments":{"reviewType":"full","analysisType":"hybrid"}}}' | mcp-code-review-agent
```

### Method 3: MCP Client Integration

If you're using an MCP client (like Cursor, Claude Desktop, etc.), the tool will be automatically available as `codex_review` with the following parameters:

```json
{
  "name": "codex_review",
  "arguments": {
    "repositoryPath": "/path/to/your/repo",
    "reviewType": "modified",
    "analysisType": "codex",
    "includeSuggestions": true,
    "outputFormat": "text",
    "noEmoji": false
  }
}
```

### When to Use Each Agent

- **Codex**: Daily development, general code quality
- **Toxic Architect**: When you need architectural discipline and tough feedback
- **Accessibility Expert**: Frontend development, React components, user-facing code
- **Static Analyzer**: Quick feedback, CI/CD pipelines, consistent rule enforcement
- **Hybrid**: Comprehensive reviews, important milestones, final checks

### Parameters

- `repositoryPath`: Path to Git repository (default: current directory)
- `reviewType`: Type of files to review (`full`, `staged`, `modified`)
- `analysisType`: Analysis strategy (`codex`, `static`, `hybrid`, `accessibility`, `toxic-architect`)
- `includeSuggestions`: Include improvement suggestions (default: `true`)
- `outputFormat`: Output format (`text`, `json`)
- `noEmoji`: Disable emoji in output

### Environment Variables

- `DEFAULT_REPO_PATH`: Default repository path
- `DEFAULT_INCLUDE_SUGGESTIONS`: Default suggestion inclusion
- `DEFAULT_USE_CODEX`: Default Codex usage (deprecated)
- `DEFAULT_ANALYSIS_TYPE`: Default analysis type
- `NO_EMOJI`: Disable emoji globally

## 🤖 AI Provider & MCP Connection

### Current AI Provider: OpenAI Codex

This tool currently uses **OpenAI Codex** as the primary AI provider for intelligent code analysis. The Codex integration provides sophisticated code understanding and review capabilities across multiple programming languages.

**Note**: The tool is designed to be provider-agnostic and can be extended to support other AI providers in the future.

### MCP (Model Context Protocol) Connection

This tool is built as an MCP server that can be connected to MCP-compatible clients. Here's how to connect:

#### For MCP-Compatible IDEs/Editors

1. **Clone and build the tool locally** (package not yet published to npm):

   ```bash
   git clone https://github.com/lodado/MCP-Code-Review-Agent
   cd MCP-Code-Review-Agent
   npm install
   npm run build
   npm link
   ```

   **Future**: Once published to npm, you'll be able to install with:

   ```bash
   npm install -g mcp-code-review-agent
   ```

2. **Configure your MCP client** (e.g., codex, Claude Desktop):

   ```json
   {
     "mcpServers": {
       "code-review-agent": {
         "command": "mcp-code-review",
         "args": []
       }
     }
   }
   ```

3. **Use the tool** through your MCP client's interface

#### ⚠️ Cursor IDE Limitation

**Important**: Due to permission restrictions in Cursor IDE, this MCP tool may not work properly when connected through Cursor's MCP integration. The tool requires file system access and Git operations that may be restricted by Cursor's security model.

**Workaround**: Use the tool directly via command line or through other MCP-compatible clients that have appropriate permissions.

## 🚀 Key Capabilities

- **Multi-Persona Reviews**: Get feedback from different AI personalities and expertise areas
- **Parallel Processing**: Multiple files analyzed concurrently using `p-limit`
- **Path Security**: Safe path validation preventing directory traversal attacks
- **File Filtering**: Intelligent filtering based on file type, size, and complexity
- **Git Integration**: Seamless integration with Git repositories
- **Multiple Output Formats**: Text and JSON output support
- **Configurable Analysis**: Customizable analysis parameters and limits
- **Personal Code Quality Journey**: Continuous improvement through AI-powered feedback

## 🎯 Purpose & Goals

This project was created to explore the potential of **AI-powered code review** using different specialized personas. The goal is to demonstrate how various AI agents with distinct personalities and expertise can provide comprehensive code quality improvements from multiple perspectives.

### Why This Project Exists

- **Personal Code Quality Improvement**: Use MCP agents to continuously improve code quality through automated reviews
- **Multi-Perspective Analysis**: Leverage different AI personas (senior architect, accessibility expert, etc.) to get diverse feedback
- **Learning Tool**: Understand how different AI personalities approach code review and what insights they provide
- **MCP Framework Exploration**: Experiment with the Model Context Protocol for building AI-powered development tools

### The Vision

Imagine having a team of expert code reviewers available 24/7, each with their own specialty:

- A **brutally honest senior architect** who catches SOLID violations and architectural flaws
- A **web accessibility expert** who ensures inclusive design
- An **AI-powered generalist** who provides comprehensive analysis
- A **rule-based analyzer** for consistent, fast feedback

This tool makes that vision a reality through MCP agents with distinct personas and expertise areas.

## 🏗️ Architecture Overview

This project implements a **Clean Architecture** pattern with clear separation of concerns. The architecture was designed based on comprehensive code review feedback from MCP agents - I had no involvement in the architectural decisions!

### Architecture Layers

```
┌─────────────────────────────────────┐
│           Presentation Layer         │ ← CLI output, JSON reports
├─────────────────────────────────────┤
│         Application Layer            │ ← Use Case orchestration
├─────────────────────────────────────┤
│           Domain Layer               │ ← Business logic, port interfaces
├─────────────────────────────────────┤
│        Infrastructure Layer         │ ← Git, FS, AI Provider implementations
└─────────────────────────────────────┘
```

The architecture follows Clean Architecture principles with clear separation of concerns, making it easy to add new analysis strategies and maintain the codebase.

## 📁 Project Structure

```
src/
├── domain/                    # Domain Layer
│   ├── ports.ts              # Port interfaces (contracts)
│   └── entities.ts           # Business entities and logic
├── application/              # Application Layer
│   ├── CodeReviewUseCase.ts  # Main business orchestration
│   └── AnalysisOrchestrator.ts # Analysis strategy coordination
├── infrastructure/           # Infrastructure Layer
│   ├── git/
│   │   └── NodeGitClient.ts  # Git operations adapter
│   ├── filesystem/
│   │   └── NodeFileSystem.ts # File system operations adapter
│   ├── ai/
│   │   └── CodexClient.ts    # AI provider adapter
│   └── path/
│       └── SafePathPolicy.ts # Path security validation
├── presentation/             # Presentation Layer
│   ├── CliReporter.ts        # Text output formatter
│   └── JsonReporter.ts       # JSON output formatter
├── strategies/               # Analysis Strategies
│   ├── CodeAnalysisStrategy.ts      # Abstract base strategy
│   ├── CodexAnalysisStrategy.ts     # AI-powered analysis
│   ├── WebAccessibilityAnalysisStrategy.ts # Accessibility-focused
│   ├── ToxicArchitectAnalysisStrategy.ts  # Architecture-focused
│   ├── TypeScriptStaticAnalysisStrategy.ts # Rule-based analysis
│   └── AnalysisStrategyFactory.ts   # Strategy factory
├── composition/              # Dependency Injection
│   └── container.ts          # DI container and wiring
├── config/                   # Configuration
│   └── analysisConfig.ts     # Analysis settings
└── tools/                    # MCP Tools
    └── CodexReviewTool.ts    # Main MCP tool (thin wrapper)
```

## 🏛️ Architecture Details

### Domain Layer

The domain layer contains the core business logic and defines the contracts (ports) that external dependencies must implement.

**Key Components:**

- `ports.ts`: Interface definitions for all external dependencies
- `entities.ts`: Business entities with domain logic

### Application Layer

The application layer orchestrates the business logic and coordinates between different services.

**Key Components:**

- `CodeReviewUseCase`: Main orchestration logic
- `AnalysisOrchestrator`: Manages analysis strategy selection and execution

### Infrastructure Layer

The infrastructure layer provides concrete implementations of the domain interfaces.

**Key Components:**

- `NodeGitClient`: Git operations using Node.js child processes
- `NodeFileSystem`: File system operations using Node.js fs module
- `CodexClient`: OpenAI Codex SDK integration
- `SafePathPolicy`: Security-focused path validation

### Presentation Layer

The presentation layer handles output formatting and user interface concerns.

**Key Components:**

- `CliReporter`: Human-readable text output
- `JsonReporter`: Machine-readable JSON output

## 🔧 Configuration

### Analysis Configuration

```typescript
export const defaultAnalysisConfig: AnalysisConfig = {
  maxFileSize: 50 * 1024, // 50KB
  maxLines: 2500, // Maximum lines per file
  maxFunctions: 50, // Maximum functions per file
  maxClasses: 10, // Maximum classes per file
  concurrency: 3, // Parallel processing limit
  supportedExtensions: [".ts", ".tsx"],
  excludedPatterns: [
    "\\.d\\.ts$",
    "\\.(test|spec)\\.tsx?$",
    "/node_modules/",
    "/dist/",
    "/build/",
  ],
};
```

## 🧪 Testing

```bash
# Build the project
npm run build

# Test with different analysis strategies
npm test
```

## 🔒 Security Features

- **Path Traversal Protection**: Prevents directory traversal attacks
- **File Size Limits**: Prevents memory exhaustion from large files
- **Input Validation**: Comprehensive input sanitization and validation
- **Safe Git Operations**: Secure Git command execution

## 🚀 Performance Features

- **Parallel Processing**: Concurrent file analysis using `p-limit`
- **Intelligent Filtering**: Skip unsuitable files early
- **Memory Management**: Efficient file size and complexity checks
- **Caching**: Dependency injection container with instance caching

## 📝 Development

### Adding New Analysis Strategies

1. Create a new strategy class extending `CodeAnalysisStrategy`
2. Implement the required abstract methods
3. Register the strategy in `AnalysisStrategyFactory`
4. Update the schema validation

### Adding New Output Formats

1. Create a new reporter implementing `Reporter` interface
2. Register the reporter in the dependency container
3. Update the tool's output format handling

## 🤝 Contributing

This project follows clean architecture principles and SOLID design patterns. When contributing:

1. Maintain separation of concerns
2. Use dependency injection
3. Write tests for new features
4. Follow the existing code structure

## 📄 License

MIT License - see LICENSE file for details.

---

**Note**: This architecture was designed based on comprehensive code review feedback from MCP agents. The architectural decisions, design patterns, and code structure were all determined by the AI review process - I had no involvement in the architectural design!
