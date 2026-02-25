/**
 * extension.test.ts - Basic tests for G_Dashboard VSCode extension
 *
 * Validates that core module exports exist and have correct types.
 * Does NOT require a running VSCode instance.
 */

import { describe, it, expect } from 'vitest';
import * as path from 'path';
import * as fs from 'fs';

describe('Extension module structure', () => {
  const srcDir = path.resolve(__dirname, '..', 'src');

  it('extension.ts exists and exports activate/deactivate', () => {
    const extensionPath = path.join(srcDir, 'extension.ts');
    expect(fs.existsSync(extensionPath)).toBe(true);

    const content = fs.readFileSync(extensionPath, 'utf-8');
    expect(content).toContain('export async function activate');
    expect(content).toContain('export function deactivate');
  });

  it('dataService.ts exists and exports DataService class', () => {
    const servicePath = path.join(srcDir, 'data', 'dataService.ts');
    expect(fs.existsSync(servicePath)).toBe(true);

    const content = fs.readFileSync(servicePath, 'utf-8');
    expect(content).toContain('export class DataService');
  });

  it('all provider files exist', () => {
    const providers = [
      'tasksTreeProvider.ts',
      'projectsTreeProvider.ts',
      'memoriesTreeProvider.ts',
      'promptsTreeProvider.ts',
      'workflowsTreeProvider.ts',
      'agentsTreeProvider.ts',
    ];

    for (const provider of providers) {
      const providerPath = path.join(srcDir, 'providers', provider);
      expect(fs.existsSync(providerPath), `${provider} should exist`).toBe(true);
    }
  });

  it('utility modules exist', () => {
    const utils = ['config.ts', 'logger.ts'];
    for (const util of utils) {
      const utilPath = path.join(srcDir, 'utils', util);
      expect(fs.existsSync(utilPath), `${util} should exist`).toBe(true);
    }
  });
});

describe('package.json validation', () => {
  const pkgPath = path.resolve(__dirname, '..', 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  it('has required package metadata', () => {
    expect(pkg.name).toBe('antigravity-dashboard');
    expect(pkg.version).toBeDefined();
    expect(pkg.engines?.vscode).toBeDefined();
  });

  it('declares activation events', () => {
    expect(pkg.activationEvents).toBeDefined();
    expect(Array.isArray(pkg.activationEvents)).toBe(true);
  });

  it('contributes commands', () => {
    expect(pkg.contributes?.commands).toBeDefined();
    expect(pkg.contributes.commands.length).toBeGreaterThan(0);
  });

  it('contributes views', () => {
    expect(pkg.contributes?.views).toBeDefined();
    const views = pkg.contributes.views['antigravity-dashboard'];
    expect(views).toBeDefined();
    expect(views.length).toBeGreaterThanOrEqual(6);
  });

  it('all command IDs start with antigravity.', () => {
    const commands = pkg.contributes.commands;
    for (const cmd of commands) {
      expect(cmd.command).toMatch(/^antigravity\./);
    }
  });
});
