export interface ResizeState <ColumnName extends string> {
  colName: ColumnName
  startWidth: number
  startPageX: number
}

export interface ColumnDef <ColumnName extends string> {
  name: ColumnName
  resize?: boolean
}

export interface State <ColumnName extends string> {
  columns: Record<ColumnName, ColumnDef<ColumnName>>
  table: HTMLTableElement
  headers: Record<ColumnName, HTMLTableCellElement>
  sizes: Record<ColumnName, number>
  resizeState: ResizeState<ColumnName> | null
  viewportWidth: number
}
