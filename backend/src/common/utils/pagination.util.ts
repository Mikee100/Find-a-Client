export interface CursorPaginationQuery {
  limit?: number;
  cursor?: string;
}

export interface PaginationMeta {
  hasNext: boolean;
  nextCursor?: string;
}

export const buildPagination = <T extends { id: string }>(items: T[], limit: number): { data: T[]; meta: PaginationMeta } => {
  const hasNext = items.length > limit;
  const data = hasNext ? items.slice(0, limit) : items;
  const nextCursor = hasNext ? data[data.length - 1]?.id : undefined;
  return {
    data,
    meta: {
      hasNext,
      nextCursor
    }
  };
};
