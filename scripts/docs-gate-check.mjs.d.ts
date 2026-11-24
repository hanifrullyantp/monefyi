export const REQUIRED_CHANGELOG_PATH: string;

export function isFinanceFile(filePath: string): boolean;

export function evaluateDocsGate(changedFiles: string[]): {
  ok: boolean;
  touchedFinanceFiles: string[];
  changelogUpdated: boolean;
  reason: string;
};

export function collectChangedFiles(args?: string[], env?: NodeJS.ProcessEnv): string[];

