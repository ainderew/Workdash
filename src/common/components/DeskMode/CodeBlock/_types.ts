export type CodeSegment =
  | { type: 'code_block'; language: string; code: string }
  | { type: 'inline_code'; code: string }
  | { type: 'text'; content: string };
