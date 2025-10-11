// Lightweight query descriptor helpers (compatible with WatermelonDB-style Q)
export const Q = {
  where: (field: string, predicate: any) => ({ type: 'where', field, predicate }),
  gte: (value: any) => ({ op: 'gte', value }),
  lte: (value: any) => ({ op: 'lte', value }),
  lt: (value: any) => ({ op: 'lt', value }),
  gt: (value: any) => ({ op: 'gt', value }),
  oneOf: (arr: any[]) => ({ op: 'oneOf', arr }),
  sortBy: (field: string, order: any) => ({ type: 'sortBy', field, order }),
  take: (n: number) => ({ type: 'take', n }),
  asc: 'asc',
  desc: 'desc',
};

export type QClause = ReturnType<typeof Q.where> | ReturnType<typeof Q.sortBy> | ReturnType<typeof Q.take>;
