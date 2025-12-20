"use client";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
    onItemsPerPageChange?: (itemsPerPage: number) => void;
    showItemsPerPage?: boolean;
}

export default function Pagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    onItemsPerPageChange,
    showItemsPerPage = true,
}: PaginationProps) {
    const startItem = (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);

    // 페이지 번호 목록 생성 (최대 5개 표시)
    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 5;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (currentPage <= 3) {
                for (let i = 1; i <= 4; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    if (totalItems === 0) return null;

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 px-4 py-3 bg-white/5 border border-white/10 rounded-lg">
            {/* 항목 정보 */}
            <div className="text-sm text-gray-400">
                전체 <span className="font-medium text-white">{totalItems}</span>개 중{' '}
                <span className="font-medium text-white">{startItem}-{endItem}</span>개 표시
            </div>

            <div className="flex items-center gap-4">
                {/* 페이지당 항목 수 */}
                {showItemsPerPage && onItemsPerPageChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">표시:</span>
                        <select
                            value={itemsPerPage}
                            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
                            className="px-2 py-1 bg-white/5 border border-white/10 rounded text-white text-sm focus:outline-none"
                        >
                            <option value={10}>10개</option>
                            <option value={20}>20개</option>
                            <option value={50}>50개</option>
                            <option value={100}>100개</option>
                        </select>
                    </div>
                )}

                {/* 페이지 네비게이션 */}
                <div className="flex items-center gap-1">
                    {/* 이전 페이지 */}
                    <button
                        onClick={() => onPageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${currentPage === 1
                                ? 'text-gray-600 cursor-not-allowed'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        ←
                    </button>

                    {/* 페이지 번호 */}
                    {getPageNumbers().map((page, index) => (
                        <button
                            key={index}
                            onClick={() => typeof page === 'number' && onPageChange(page)}
                            disabled={page === '...'}
                            className={`min-w-[32px] px-2 py-1.5 rounded text-sm transition-colors ${page === currentPage
                                    ? 'bg-white text-gray-900 font-medium'
                                    : page === '...'
                                        ? 'text-gray-500 cursor-default'
                                        : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {page}
                        </button>
                    ))}

                    {/* 다음 페이지 */}
                    <button
                        onClick={() => onPageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1.5 rounded text-sm transition-colors ${currentPage === totalPages
                                ? 'text-gray-600 cursor-not-allowed'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                            }`}
                    >
                        →
                    </button>
                </div>
            </div>
        </div>
    );
}
