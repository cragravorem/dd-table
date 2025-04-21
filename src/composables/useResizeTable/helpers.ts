import type { ComponentPublicInstance } from "vue";

import type { ColumnDef } from './types'

const TABLE_HEADER_CLASS = 'use-resize-table__header'
const TABLE_RESIZE_HANDLE_CLASS = 'use-resize-table__resize-handle'

export const getTable = (wrapper: HTMLElement | ComponentPublicInstance | null):
  HTMLTableElement | null =>
{
  if (!wrapper) return null
  const domEl: HTMLElement = (wrapper as ComponentPublicInstance).$el
    ? (wrapper as ComponentPublicInstance).$el
    : wrapper as HTMLElement
  return domEl.tagName === 'TABLE'
    ? domEl as HTMLTableElement
    : domEl.querySelector('table')

}

export const getHeaders = <ColumnName extends string>({
  table,
  columns,
  columnHeaderSelector,
}: {
  table: HTMLTableElement,
  columns: { name: ColumnName, resize?: boolean }[],
  columnHeaderSelector: string,
}): Map<ColumnName, HTMLTableCellElement> => {
  const tableHeaders =
    [...table.querySelectorAll(columnHeaderSelector)] as HTMLTableCellElement[]
  if (columns.length !== tableHeaders.length) throw new Error('Table layout mismatch')
  return new Map(
    columns.map((col, ix) =>
      [col.name, tableHeaders[ix]!])
  )
}

export const getNonResizableWidth = <ColumnName extends string>(
  sizes: Record<ColumnName, number>,
  columns: Record<ColumnName, ColumnDef<ColumnName>>
) =>
    (Object.entries(sizes) as [ColumnName, number][])
      .filter(([colName]) => !(columns[colName].resize ?? true))
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      .map(([_, width]) => width)
      .reduce((a, b) => a + b, 0)

export const attachResizeHandle = ({
  header,
  onMouseDown,
}: {
  header: HTMLTableCellElement,
  onMouseDown: (e: MouseEvent) => unknown,
}) => {
  if (header.getElementsByClassName(TABLE_RESIZE_HANDLE_CLASS).length) return

  const handle = document.createElement('div')
  handle.classList.add('use-resize-table__handle')
  handle.addEventListener('mousedown', onMouseDown)
  handle.classList.add(TABLE_RESIZE_HANDLE_CLASS)

  header.appendChild(handle)
  header.classList.add(TABLE_HEADER_CLASS)

  return () => handle.removeEventListener('mousedown', onMouseDown)
}
