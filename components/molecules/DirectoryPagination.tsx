import {
  directoryPagePath,
  type DirectorySearchParams,
} from "@/lib/directory/pagination"

export function DirectoryPagination({
  path,
  page,
  hasMore,
  params = {},
}: {
  path: string
  page: number
  hasMore: boolean
  params?: DirectorySearchParams
}) {
  return (
    <nav
      aria-label="Product pages"
      className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#e2e8f0] pt-5 text-sm font-medium"
    >
      <div className="flex gap-4">
        {page > 1 && (
          <a
            href={directoryPagePath(path, page - 1, params)}
            rel="prev"
            className="underline underline-offset-4"
          >
            Previous page
          </a>
        )}
        {page > 2 && (
          <a
            href={directoryPagePath(path, 1, params)}
            className="underline underline-offset-4"
          >
            First page
          </a>
        )}
      </div>
      <span>Page {page}</span>
      {hasMore ? (
        <a
          href={directoryPagePath(path, page + 1, params)}
          rel="next"
          className="underline underline-offset-4"
        >
          Next page
        </a>
      ) : (
        <span className="text-[#43474c]">Last page</span>
      )}
    </nav>
  )
}
