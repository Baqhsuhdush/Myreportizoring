interface PaginationControlsProps {
  page: number;
  pageSize: 10 | 25 | 50;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: 10 | 25 | 50) => void;
}

export default function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
}: PaginationControlsProps) {
  return (
    <div className="pagination-controls">
      <label>
        На странице
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as 10 | 25 | 50)}
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </label>
      <span>Всего: {total}</span>
      <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        ← Назад
      </button>
      <span>Страница {page} из {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
        Вперёд →
      </button>
    </div>
  );
}
