import { MCPTool } from "mcp-framework";
import { z } from "zod";
import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface CodexReviewInput {
  repositoryPath?: string;
  reviewType?: "full" | "staged" | "modified";
  includeSuggestions?: boolean;
}

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  modified: string[];
  untracked: string[];
  deleted: string[];
}

interface CodeReviewResult {
  summary: string;
  files: Array<{
    path: string;
    status: string;
    issues: Array<{
      type: "error" | "warning" | "suggestion";
      line?: number;
      message: string;
      suggestion?: string;
    }>;
    score: number;
  }>;
  overallScore: number;
  recommendations: string[];
}

class CodexReviewTool extends MCPTool<CodexReviewInput> {
  name = "codex_review";
  description =
    "Git status를 분석하여 코드 리뷰를 수행하고 개선 사항을 제안합니다";

  schema = {
    repositoryPath: {
      type: z.string().optional(),
      description: "리뷰할 저장소 경로 (기본값: 현재 디렉토리)",
    },
    reviewType: {
      type: z.enum(["full", "staged", "modified"]).optional(),
      description:
        "리뷰 타입: full(전체), staged(스테이징된 파일), modified(수정된 파일)",
    },
    includeSuggestions: {
      type: z.boolean().optional(),
      description: "개선 제안 포함 여부",
    },
  };

  async execute(input: CodexReviewInput): Promise<string> {
    const {
      repositoryPath = process.cwd(),
      reviewType = "modified",
      includeSuggestions = true,
    } = input;

    try {
      // Git 상태 분석
      const gitStatus = await this.analyzeGitStatus(repositoryPath);

      // 리뷰할 파일 목록 결정
      const filesToReview = this.getFilesToReview(gitStatus, reviewType);

      if (filesToReview.length === 0) {
        return "리뷰할 파일이 없습니다. 모든 파일이 깨끗합니다!";
      }

      // 각 파일에 대해 코드 리뷰 수행
      const reviewResults: CodeReviewResult["files"] = [];

      for (const filePath of filesToReview) {
        const review = await this.reviewFile(
          filePath,
          repositoryPath,
          includeSuggestions
        );
        reviewResults.push(review);
      }

      // 전체 점수 계산
      const overallScore = this.calculateOverallScore(reviewResults);

      // 권장사항 생성
      const recommendations = this.generateRecommendations(
        reviewResults,
        gitStatus
      );

      const result: CodeReviewResult = {
        summary: this.generateSummary(gitStatus, reviewResults, overallScore),
        files: reviewResults,
        overallScore,
        recommendations,
      };

      // 결과를 읽기 쉬운 문자열 형태로 반환
      let output = `📊 코드 리뷰 결과\n`;
      output += `=${"=".repeat(50)}\n\n`;
      output += `📋 ${result.summary}\n\n`;

      if (result.files.length > 0) {
        output += `📁 파일별 상세 결과:\n`;
        output += `-`.repeat(50) + `\n`;

        result.files.forEach((file, index) => {
          output += `${index + 1}. ${file.path} (점수: ${file.score}/100)\n`;

          if (file.issues.length > 0) {
            file.issues.forEach((issue, issueIndex) => {
              const icon =
                issue.type === "error"
                  ? "❌"
                  : issue.type === "warning"
                  ? "⚠️"
                  : "💡";
              const lineInfo = issue.line ? ` (라인 ${issue.line})` : "";
              output += `   ${icon} ${issue.message}${lineInfo}\n`;
              if (issue.suggestion) {
                output += `      💭 제안: ${issue.suggestion}\n`;
              }
            });
          } else {
            output += `   ✅ 이슈 없음\n`;
          }
          output += `\n`;
        });
      }

      if (result.recommendations.length > 0) {
        output += `💡 권장사항:\n`;
        output += `-`.repeat(50) + `\n`;
        result.recommendations.forEach((rec, index) => {
          output += `${index + 1}. ${rec}\n`;
        });
      }

      return output;
    } catch (error) {
      throw new Error(
        `코드 리뷰 실패: ${
          error instanceof Error ? error.message : "알 수 없는 오류"
        }`
      );
    }
  }

  private async analyzeGitStatus(repoPath: string): Promise<GitStatus> {
    try {
      const gitStatusOutput = execSync("git status --porcelain", {
        cwd: repoPath,
        encoding: "utf8",
      });

      const branchOutput = execSync("git branch --show-current", {
        cwd: repoPath,
        encoding: "utf8",
      }).trim();

      const aheadBehindOutput = execSync(
        "git rev-list --left-right --count HEAD@{upstream}...HEAD",
        {
          cwd: repoPath,
          encoding: "utf8",
        }
      ).trim();

      const [ahead, behind] = aheadBehindOutput.split("\t").map(Number);

      const staged: string[] = [];
      const modified: string[] = [];
      const untracked: string[] = [];
      const deleted: string[] = [];

      gitStatusOutput.split("\n").forEach((line) => {
        if (!line.trim()) return;

        const status = line.substring(0, 2);
        const filePath = line.substring(3);

        if (status.includes("A") || status.includes("M")) {
          staged.push(filePath);
        }
        if (status.includes("M") && !status.includes("A")) {
          modified.push(filePath);
        }
        if (status.includes("?")) {
          untracked.push(filePath);
        }
        if (status.includes("D")) {
          deleted.push(filePath);
        }
      });

      return {
        branch: branchOutput,
        ahead,
        behind,
        staged,
        modified,
        untracked,
        deleted,
      };
    } catch (error) {
      throw new Error(
        "Git 상태 분석 실패: 저장소가 아닌 디렉토리이거나 Git이 설치되지 않았습니다"
      );
    }
  }

  private getFilesToReview(gitStatus: GitStatus, reviewType: string): string[] {
    switch (reviewType) {
      case "staged":
        return gitStatus.staged;
      case "modified":
        return [...gitStatus.staged, ...gitStatus.modified];
      case "full":
        return [
          ...gitStatus.staged,
          ...gitStatus.modified,
          ...gitStatus.untracked,
        ];
      default:
        return [...gitStatus.staged, ...gitStatus.modified];
    }
  }

  private async reviewFile(
    filePath: string,
    repoPath: string,
    includeSuggestions: boolean
  ): Promise<CodeReviewResult["files"][0]> {
    const fullPath = join(repoPath, filePath);

    if (!existsSync(fullPath)) {
      return {
        path: filePath,
        status: "deleted",
        issues: [
          {
            type: "warning",
            message: "파일이 삭제되었습니다",
          },
        ],
        score: 0,
      };
    }

    const content = readFileSync(fullPath, "utf8");
    const issues: CodeReviewResult["files"][0]["issues"] = [];

    // 파일 확장자에 따른 리뷰 로직
    const extension = filePath.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "ts":
      case "tsx":
        this.reviewTypeScriptFile(
          content,
          filePath,
          issues,
          includeSuggestions
        );
        break;
      case "js":
      case "jsx":
        this.reviewJavaScriptFile(
          content,
          filePath,
          issues,
          includeSuggestions
        );
        break;
      case "py":
        this.reviewPythonFile(content, filePath, issues, includeSuggestions);
        break;
      case "java":
        this.reviewJavaFile(content, filePath, issues, includeSuggestions);
        break;
      case "go":
        this.reviewGoFile(content, filePath, issues, includeSuggestions);
        break;
      default:
        this.reviewGenericFile(content, filePath, issues, includeSuggestions);
    }

    const score = this.calculateFileScore(issues);

    return {
      path: filePath,
      status: "reviewed",
      issues,
      score,
    };
  }

  private reviewTypeScriptFile(
    content: string,
    filePath: string,
    issues: CodeReviewResult["files"][0]["issues"],
    includeSuggestions: boolean
  ): void {
    const lines = content.split("\n");

    // 기본적인 TypeScript 리뷰 규칙들
    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // any 타입 사용 체크
      if (line.includes(": any") && !line.includes("// eslint-disable")) {
        issues.push({
          type: "warning",
          line: lineNumber,
          message: "any 타입 사용을 피하세요",
          suggestion: includeSuggestions
            ? "구체적인 타입을 정의하거나 unknown을 사용하세요"
            : undefined,
        });
      }

      // console.log 체크
      if (line.includes("console.log") && !line.includes("// TODO")) {
        issues.push({
          type: "warning",
          line: lineNumber,
          message: "프로덕션 코드에서 console.log 사용을 피하세요",
          suggestion: includeSuggestions
            ? "로깅 라이브러리 사용을 고려하세요"
            : undefined,
        });
      }

      // 긴 라인 체크
      if (line.length > 120) {
        issues.push({
          type: "suggestion",
          line: lineNumber,
          message: "라인이 너무 깁니다",
          suggestion: includeSuggestions
            ? "라인을 분할하거나 변수명을 줄이세요"
            : undefined,
        });
      }

      // TODO/FIXME 체크
      if (line.includes("TODO") || line.includes("FIXME")) {
        issues.push({
          type: "suggestion",
          line: lineNumber,
          message: "TODO/FIXME 주석이 있습니다",
          suggestion: includeSuggestions
            ? "이슈를 해결하거나 이슈 트래커에 등록하세요"
            : undefined,
        });
      }
    });

    // 함수 복잡도 체크
    const functionMatches = content.match(
      /function\s+\w+|const\s+\w+\s*=\s*\(/g
    );
    if (functionMatches && functionMatches.length > 10) {
      issues.push({
        type: "suggestion",
        message: "파일에 너무 많은 함수가 있습니다",
        suggestion: includeSuggestions
          ? "파일을 여러 개로 분할하는 것을 고려하세요"
          : undefined,
      });
    }
  }

  private reviewJavaScriptFile(
    content: string,
    filePath: string,
    issues: CodeReviewResult["files"][0]["issues"],
    includeSuggestions: boolean
  ): void {
    // JavaScript는 TypeScript와 유사하지만 타입 체크 제외
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      if (line.includes("console.log") && !line.includes("// TODO")) {
        issues.push({
          type: "warning",
          line: lineNumber,
          message: "프로덕션 코드에서 console.log 사용을 피하세요",
          suggestion: includeSuggestions
            ? "로깅 라이브러리 사용을 고려하세요"
            : undefined,
        });
      }

      if (line.length > 120) {
        issues.push({
          type: "suggestion",
          line: lineNumber,
          message: "라인이 너무 깁니다",
          suggestion: includeSuggestions
            ? "라인을 분할하거나 변수명을 줄이세요"
            : undefined,
        });
      }
    });
  }

  private reviewPythonFile(
    content: string,
    filePath: string,
    issues: CodeReviewResult["files"][0]["issues"],
    includeSuggestions: boolean
  ): void {
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // print 문 체크
      if (line.includes("print(") && !line.includes("# TODO")) {
        issues.push({
          type: "warning",
          line: lineNumber,
          message: "프로덕션 코드에서 print 사용을 피하세요",
          suggestion: includeSuggestions
            ? "로깅 모듈 사용을 고려하세요"
            : undefined,
        });
      }

      // 긴 라인 체크 (PEP 8)
      if (line.length > 88) {
        issues.push({
          type: "suggestion",
          line: lineNumber,
          message: "라인이 PEP 8 권장 길이(88자)를 초과합니다",
          suggestion: includeSuggestions ? "라인을 분할하세요" : undefined,
        });
      }
    });
  }

  private reviewJavaFile(
    content: string,
    filePath: string,
    issues: CodeReviewResult["files"][0]["issues"],
    includeSuggestions: boolean
  ): void {
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // System.out.println 체크
      if (line.includes("System.out.println") && !line.includes("// TODO")) {
        issues.push({
          type: "warning",
          line: lineNumber,
          message: "프로덕션 코드에서 System.out.println 사용을 피하세요",
          suggestion: includeSuggestions
            ? "로깅 프레임워크 사용을 고려하세요"
            : undefined,
        });
      }

      // 긴 라인 체크
      if (line.length > 120) {
        issues.push({
          type: "suggestion",
          line: lineNumber,
          message: "라인이 너무 깁니다",
          suggestion: includeSuggestions ? "라인을 분할하세요" : undefined,
        });
      }
    });
  }

  private reviewGoFile(
    content: string,
    filePath: string,
    issues: CodeReviewResult["files"][0]["issues"],
    includeSuggestions: boolean
  ): void {
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // fmt.Println 체크
      if (line.includes("fmt.Println") && !line.includes("// TODO")) {
        issues.push({
          type: "warning",
          line: lineNumber,
          message: "프로덕션 코드에서 fmt.Println 사용을 피하세요",
          suggestion: includeSuggestions
            ? "log 패키지 사용을 고려하세요"
            : undefined,
        });
      }

      // 긴 라인 체크
      if (line.length > 100) {
        issues.push({
          type: "suggestion",
          line: lineNumber,
          message: "라인이 너무 깁니다",
          suggestion: includeSuggestions ? "라인을 분할하세요" : undefined,
        });
      }
    });
  }

  private reviewGenericFile(
    content: string,
    filePath: string,
    issues: CodeReviewResult["files"][0]["issues"],
    includeSuggestions: boolean
  ): void {
    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // 긴 라인 체크
      if (line.length > 120) {
        issues.push({
          type: "suggestion",
          line: lineNumber,
          message: "라인이 너무 깁니다",
          suggestion: includeSuggestions ? "라인을 분할하세요" : undefined,
        });
      }

      // TODO/FIXME 체크
      if (line.includes("TODO") || line.includes("FIXME")) {
        issues.push({
          type: "suggestion",
          line: lineNumber,
          message: "TODO/FIXME 주석이 있습니다",
          suggestion: includeSuggestions
            ? "이슈를 해결하거나 이슈 트래커에 등록하세요"
            : undefined,
        });
      }
    });
  }

  private calculateFileScore(
    issues: CodeReviewResult["files"][0]["issues"]
  ): number {
    if (issues.length === 0) return 100;

    let score = 100;
    issues.forEach((issue) => {
      switch (issue.type) {
        case "error":
          score -= 20;
          break;
        case "warning":
          score -= 10;
          break;
        case "suggestion":
          score -= 5;
          break;
      }
    });

    return Math.max(0, score);
  }

  private calculateOverallScore(files: CodeReviewResult["files"]): number {
    if (files.length === 0) return 100;

    const totalScore = files.reduce((sum, file) => sum + file.score, 0);
    return Math.round(totalScore / files.length);
  }

  private generateSummary(
    gitStatus: GitStatus,
    files: CodeReviewResult["files"],
    overallScore: number
  ): string {
    const totalIssues = files.reduce(
      (sum, file) => sum + file.issues.length,
      0
    );
    const errorCount = files.reduce(
      (sum, file) =>
        sum + file.issues.filter((issue) => issue.type === "error").length,
      0
    );
    const warningCount = files.reduce(
      (sum, file) =>
        sum + file.issues.filter((issue) => issue.type === "warning").length,
      0
    );

    return (
      `브랜치 '${gitStatus.branch}'에서 ${files.length}개 파일을 리뷰했습니다. ` +
      `전체 점수: ${overallScore}/100. ` +
      `발견된 이슈: ${totalIssues}개 (오류: ${errorCount}, 경고: ${warningCount})`
    );
  }

  private generateRecommendations(
    files: CodeReviewResult["files"],
    gitStatus: GitStatus
  ): string[] {
    const recommendations: string[] = [];

    // Git 상태 기반 권장사항
    if (gitStatus.ahead > 0) {
      recommendations.push(
        `로컬에 ${gitStatus.ahead}개의 커밋이 있습니다. 원격 저장소에 푸시를 고려하세요.`
      );
    }

    if (gitStatus.behind > 0) {
      recommendations.push(
        `원격 저장소에 ${gitStatus.behind}개의 새로운 커밋이 있습니다. pull을 고려하세요.`
      );
    }

    if (gitStatus.untracked.length > 0) {
      recommendations.push(
        `${gitStatus.untracked.length}개의 추적되지 않는 파일이 있습니다. .gitignore에 추가하거나 커밋하세요.`
      );
    }

    // 코드 품질 기반 권장사항
    const lowScoreFiles = files.filter((file) => file.score < 70);
    if (lowScoreFiles.length > 0) {
      recommendations.push(
        `${lowScoreFiles.length}개 파일의 점수가 낮습니다. 코드 품질 개선이 필요합니다.`
      );
    }

    const filesWithErrors = files.filter((file) =>
      file.issues.some((issue) => issue.type === "error")
    );
    if (filesWithErrors.length > 0) {
      recommendations.push(
        `${filesWithErrors.length}개 파일에 오류가 있습니다. 우선적으로 수정하세요.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("코드 품질이 양호합니다!");
    }

    return recommendations;
  }
}

export default CodexReviewTool;
