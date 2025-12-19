import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { parse } from '../parser/parser.mjs';
import { Identifier, Literal } from '../parser/ast.mjs';
import { ExecutionError } from './execution-error.mjs';

export function executeLoad(executor, stmt) {
  if (stmt.args.length < 1) {
    throw new ExecutionError('Load requires a file path argument', stmt);
  }

  const pathArg = stmt.args[0];
  let filePath;

  if (pathArg instanceof Literal) {
    filePath = String(pathArg.value);
  } else if (pathArg instanceof Identifier) {
    filePath = pathArg.name;
  } else {
    throw new ExecutionError('Load requires a string path or theory name', stmt);
  }

  const absolutePath = resolve(executor.basePath, filePath);

  if (executor.loadedTheories.has(absolutePath)) {
    return {
      destination: stmt.destination,
      loaded: false,
      reason: 'Already loaded',
      path: absolutePath,
      statement: stmt.toString()
    };
  }

  try {
    const content = readFileSync(absolutePath, 'utf8');

    const previousBasePath = executor.basePath;
    executor.basePath = dirname(absolutePath);

    const program = parse(content);
    const result = executor.executeProgram(program);

    executor.trackRulesFromProgram(program);

    executor.basePath = previousBasePath;

    const hasErrors = result.errors && result.errors.length > 0;
    if (!hasErrors) {
      executor.loadedTheories.add(absolutePath);
    }

    return {
      destination: stmt.destination,
      loaded: !hasErrors,
      success: !hasErrors,
      path: absolutePath,
      factsLoaded: result.results.length,
      errors: result.errors,
      statement: stmt.toString()
    };
  } catch (e) {
    throw new ExecutionError(`Failed to load theory: ${e.message}`, stmt);
  }
}

export function executeUnload(executor, stmt) {
  if (stmt.args.length < 1) {
    throw new ExecutionError('Unload requires a theory argument', stmt);
  }

  const pathArg = stmt.args[0];
  let filePath;

  if (pathArg instanceof Literal) {
    filePath = String(pathArg.value);
  } else if (pathArg instanceof Identifier) {
    filePath = pathArg.name;
  } else {
    throw new ExecutionError('Unload requires a string path or theory name', stmt);
  }

  const absolutePath = resolve(executor.basePath, filePath);
  executor.loadedTheories.delete(absolutePath);

  return {
    destination: stmt.destination,
    unloaded: true,
    path: absolutePath,
    statement: stmt.toString()
  };
}

