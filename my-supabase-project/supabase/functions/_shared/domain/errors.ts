export type StructuredError = {
  code: string;
  message_id: string;
  fix_hint: string;
  valid_options: string[];
};

export function structuredError(
  code: string,
  fixHint: string,
  validOptions: string[] = [],
): StructuredError {
  return {
    code,
    message_id: code,
    fix_hint: fixHint,
    valid_options: validOptions,
  };
}
