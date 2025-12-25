/**
 * Compatibility wrapper for prune scripts.
 *
 * Note: This validator now supports non-boolean tasks (query-answer, multi-choice, CLUTRR),
 * so it can correctly prune bugCases that are fixed even when `expectProved` is null.
 */

export { validateOne } from './bugcase-validator.lib.mjs';
