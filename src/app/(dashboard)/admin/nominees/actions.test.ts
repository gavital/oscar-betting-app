// src/app/(dashboard)/admin/nominees/actions.test.ts
import { describe, it, expect } from 'vitest';
import { normalizeNomineeName } from './actions'; // supondo que exista um util interno

describe('import nominees helpers', () => {
  it('normalizes names: trims and dedups', () => {
    const input = '  Indicado 1 \nIndicado 2\n\nIndicado 1  ';
    const lines = input.split('\n').map(s => s.trim()).filter(Boolean);
    const unique = Array.from(new Set(lines.map(normalizeNomineeName)));
    expect(unique).toEqual(['Indicado 1', 'Indicado 2']);
  });
});