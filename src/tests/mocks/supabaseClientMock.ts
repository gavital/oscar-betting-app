// src/tests/mocks/supabaseClientMock.ts
type Row = Record<string, any>;
type TableStore = Record<string, Row[]>;

export function createSupabaseStub(initial: Partial<TableStore> = {}) {
  const store: TableStore = {
    categories: [],
    profiles: [],
    ...initial
  };

  const api = {
    auth: {
      getUser: async () => ({
        data: { user: { id: 'user-1', email: 'admin@example.com', user_metadata: { role: 'admin' } } }
      })
    },
    from(table: string) {
      return {
        // SELECT
        select(_cols?: string, opts?: any) {
          const rows = store[table] ?? [];
          // Suporte a contagem: select('*', { count: 'exact', head: true })
          if (opts?.count && opts?.head) {
            let current = rows.slice();
            const countBuilder = {
              eq(field: string, value: any) {
                current = current.filter(r => r[field] === value);
                return Promise.resolve({ count: current.length, error: null });
              }
            };
            return countBuilder as any;
          }

          // Builder encadeável
          let current = rows.slice();

          const builder: any = {
            eq(field: string, value: any) {
              current = current.filter(r => r[field] === value);
              return builder;
            },
            ilike(field: string, value: string) {
              const needle = value.toLowerCase();
              current = current.filter(r => String(r[field] ?? '').toLowerCase() === needle);
              return builder;
            },
            neq(field: string, value: any) {
              current = current.filter(r => r[field] !== value);
              return builder;
            },
            maybeSingle: async () => ({ data: current[0] ?? null, error: null }),
            single: async () =>
              current[0]
                ? { data: current[0], error: null }
                : { data: null, error: { message: 'Row not found' } },
          };

          return builder;
        },,

        // INSERT
        insert(payload: Row | Row[]) {
          const arr = Array.isArray(payload) ? payload : [payload];
          arr.forEach(p => {
            if (table === 'categories') {
              // Simula unique case-insensitive em name
              const exists = (store.categories ?? []).some(
                c => String(c.name).toLowerCase() === String(p.name).toLowerCase()
              );
              if (exists) {
                // Retorna erro como Supabase faria
                (api as any)._lastError = { message: 'duplicate key value violates unique constraint categories_name_unique_ci' };
              } else {
                const id = p.id ?? `cat_${Math.random().toString(36).slice(2, 10)}`;
                store.categories = [...(store.categories ?? []), { ...p, id }];
                (api as any)._lastInserted = { id };
              }
            } else {
              const id = p.id ?? `id_${Math.random().toString(36).slice(2, 10)}`;
              store[table] = [...(store[table] ?? []), { ...p, id }];
              (api as any)._lastInserted = { id };
            }
          });

          const lastError = (api as any)._lastError ?? null;
          const lastInserted = (api as any)._lastInserted ?? null;

          return {
            select(_cols: string) {
              return {
                single: async () => ({ data: lastInserted, error: lastError })
              };
            }
          };
        },

        // UPDATE
        update(payload: Partial<Row>) {
          return {
            eq(field: string, value: any) {
              const rows = store[table] ?? [];
              let updated = 0;
              store[table] = rows.map(r => {
                if (r[field] === value) {
                  updated++;
                  return { ...r, ...payload };
                }
                return r;
              });
              const error = updated === 0 ? { message: 'Row not found' } : null;
              return Promise.resolve({ error });
            }
          };
        }
      };
    }
  };

  return api;
}