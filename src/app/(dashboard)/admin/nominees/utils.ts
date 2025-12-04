// src/app/(dashboard)/admin/nominees/utils.ts
export function normalizeNomineeName(name: string): string {
    return name.trim().replace(/\s+/g, ' ');
  }