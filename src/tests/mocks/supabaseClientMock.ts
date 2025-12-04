// src/tests/mocks/supabaseClientMock.ts
type Row = Record<string, any>;
type TableStore = Record<string, Row[]>;

export function createSupabaseStub(initial: Partial<TableStore> = {}) {
  const store: TableStore = {
    categories: [],
    nominees: [],
    bets: [],
    profiles: [],
    ...initial,
  };

  const api = {
    auth: {
      getUser: async () => ({
        data: {
          user: {
            id: 'user-1',
            email: 'admin@example.com',
            user_metadata: { role: 'admin' },
          },
        },
      }),
    },

    from(table: string) {
      return {
        // SELECT
        select(_cols?: string, opts?: any) {
          const rows = store[table] ?? [];

          // Suporte a contagem head:true
          if (opts?.count && opts?.head) {
            let current = rows.slice();
            const countBuilder = {
              eq(field: string, value: any) {
                current = current.filter((r) => r[field] === value);
                return Promise.resolve({ count: current.length, error: null });
              },
            };
            return countBuilder as any;
          }

          // Builder encadeável: eq → ilike → neq → (maybeSingle|single)
          let current = rows.slice();

          const builder: any = {
            eq(field: string, value: any) {
              current = current.filter((r) => r[field] === value);
              return builder;
            },
            ilike(field: string, value: string) {
              const needle = value.toLowerCase();
              current = current.filter(
                (r) => String(r[field] ?? '').toLowerCase() === needle
              );
              return builder;
            },
            neq(field: string, value: any) {
              current = current.filter((r) => r[field] !== value);
              return builder;
            },
            maybeSingle: async () => ({ data: current[0] ?? null, error: null }),
            single: async () =>
              current[0]
                ? { data: current[0], error: null }
                : { data: null, error: { message: 'Row not found' } },
          };

          return builder;
        },

        // INSERT
        insert(payload: Row | Row[]) {
          const arr = Array.isArray(payload) ? payload : [payload];
          let lastError: any = null;
          let lastInserted: any = null;

          arr.forEach((p) => {
            if (table === 'categories') {
              // Unicidade por lower(name)
              const exists = (store.categories ?? []).some(
                (c) => String(c.name).toLowerCase() === String(p.name).toLowerCase()
              );
              if (exists) {
                lastError = {
                  message:
                    'duplicate key value violates unique constraint categories_name_unique_ci',
                };
              } else {
                const id = p.id ?? `cat_${Math.random().toString(36).slice(2, 10)}`;
                store.categories = [...(store.categories ?? []), { ...p, id }];
                lastInserted = { id };
              }
            } else if (table === 'nominees') {
              // Unicidade por (category_id, lower(name))
              const exists = (store.nominees ?? []).some(
                (n) =>
                  String(n.category_id) === String(p.category_id) &&
                  String(n.name).toLowerCase() === String(p.name).toLowerCase()
              );
              if (exists) {
                lastError = {
                  message:
                    'duplicate key value violates unique constraint nominees_unique_per_category',
                };
              } else {
                const id = p.id ?? `nom_${Math.random().toString(36).slice(2, 10)}`;
                store.nominees = [...(store.nominees ?? []), { ...p, id }];
                lastInserted = { id };
              }
            } else {
              const id = p.id ?? `id_${Math.random().toString(36).slice(2, 10)}`;
              store[table] = [...(store[table] ?? []), { ...p, id }];
              lastInserted = { id };
            }
          });

          return {
            select(_cols: string) {
              return {
                single: async () => ({ data: lastInserted, error: lastError }),
              };
            },
          };
        },

        // UPDATE (encadeável com thenable)
        update(payload: Partial<Row>) {
          // Acumula filtros para serem aplicados no await final
          const filters: Array<{ field: string; value: any }> = [];

          const builder: any = {
            eq(field: string, value: any) {
              filters.push({ field, value });
              return builder; // permite encadear outro .eq(...)
            },
            // Torna o builder "thenable": quando for await'ed, aplica os filtros e executa o update
            then: async (resolve: (result: any) => any) => {
              const rows = store[table] ?? [];
              let updated = 0;

              store[table] = rows.map((r) => {
                const match = filters.every((f) => r[f.field] === f.value);
                if (match) {
                  updated++;
                  return { ...r, ...payload };
                }
                return r;
              });

              const error = updated === 0 ? { message: 'Row not found' } : null;
              return resolve({ error });
            },
          };

          return builder;
        },

        // DELETE
        delete() {
          return {
            eq(field: string, value: any) {
              const rows = store[table] ?? [];
              const before = rows.length;
              store[table] = rows.filter((r) => r[field] !== value);
              const removed = before - store[table].length;
              const error = null; // simplificado
              return Promise.resolve({ error, removed });
            },
          };
        },

        // UPSERT (suporte básico para bets por (user_id, category_id))
        upsert(payload: Row | Row[], options?: { onConflict?: string }) {
          const arr = Array.isArray(payload) ? payload : [payload];
          let lastError: any = null;

          if (table === 'bets') {
            const onConflict = options?.onConflict ?? 'user_id,category_id';
            const keys = onConflict.split(',').map(k => k.trim());

            arr.forEach(p => {
              const rows = store.bets ?? [];
              const foundIdx = rows.findIndex(r => keys.every(k => String(r[k]) === String(p[k])));
              if (foundIdx >= 0) {
                // update existente
                store.bets[foundIdx] = { ...rows[foundIdx], ...p };
              } else {
                const id = p.id ?? `bet_${Math.random().toString(36).slice(2, 10)}`;
                store.bets = [...rows, { ...p, id }];
              }
            });
          } else {
            // comportamento genérico: inserção simples
            arr.forEach(p => {
              const id = p.id ?? `id_${Math.random().toString(36).slice(2, 10)}`;
              store[table] = [...(store[table] ?? []), { ...p, id }];
            });
          }

          return Promise.resolve({ error: lastError });
        },
      };
    },
  } as any;

  // expõe o store para asserts nos testes
  (api as any).__store = store;

  return api;
}