import './useResizeTable.sass'

import type { ComponentPublicInstance, MaybeRefOrGetter, Ref, ComputedRef } from "vue";
import { ref, watch, toValue, nextTick, markRaw, computed, onUnmounted, readonly } from 'vue';
import { useWindowSize, useEventListener } from '@vueuse/core'

import type { ColumnDef, State, ResizeState } from "./types";
import { getTable, getHeaders, getNonResizableWidth, attachResizeHandle } from "./helpers";

const TABLE_CLASS = 'use-resize-table'

// State and state mutations
const useState = <ColumnName extends string>({ tableId }: { tableId: string }) => {
  // Init reactive state
  const state: Ref<State<ColumnName> | null> = ref(null);

  // Syncing to localStorage
  let restoredState: Pick<State<ColumnName>, 'sizes' | 'viewportWidth'> | null = null
  const restoreSavedState = (lsKey: string) => {
    const rawValue = localStorage.getItem(lsKey)
    restoredState = rawValue ? JSON.parse(rawValue) : null;
  }
  const localStorageKey = computed(() => `use-resize-table:${tableId}`)
  watch(localStorageKey, restoreSavedState, { immediate: true })
  watch(() => state.value && {
    sizes: state.value.sizes,
    viewportWidth: state.value.viewportWidth,
  }, (stateToStore) => {
    if (!stateToStore) return
    localStorage.setItem(localStorageKey.value, JSON.stringify(stateToStore))
  })

  // Cumulative width of non-resizable columns (derived from state)
  const nonResizableWidth = computed(() =>
    getNonResizableWidth(
      state.value?.sizes ?? ({} as Record<ColumnName, number>),
      state.value?.columns ?? ({} as Record<ColumnName, ColumnDef<ColumnName>>),
    ))

  // Restores sizes from localStorage and scales if necessary
  const restoreSizes = ({
    columns,
    sizes,
    viewportWidth
  }: Pick<State<ColumnName>, 'columns' | 'sizes' | 'viewportWidth'>): Record<ColumnName, number> => {
    if (!restoredState) return sizes
    const nonResizableWidth = getNonResizableWidth(sizes, columns)
    const scaleBy = (viewportWidth - nonResizableWidth) / (restoredState.viewportWidth - nonResizableWidth)
    return Object.fromEntries(
      (Object.entries(sizes) as [ColumnName, number][])
        .map(([col, size]) => [
          col,
          (columns[col].resize ?? true)
            ? (restoredState!.sizes[col] ?? size) * scaleBy
            : size,
        ])
    ) as Record<ColumnName, number>
  }

  // Initializes state
  const init = (stateInit: Omit<State<ColumnName>, 'resizeState'>) => {
    state.value = {
      ...stateInit,
      resizeState: null,
      sizes: restoreSizes(stateInit),
    }
  }

  // Preserves column info while resizing the column (col name, initial width and pointer coordinate)
  const setResizeState = (resizeState: ResizeState<ColumnName> | null) => {
    if (!state.value) throw new Error('Uninitialized')
    state.value = { ...state.value, resizeState }
  }

  // Update state when column is being resized
  const resizeColumn = (colName: ColumnName, width: number) => {
    if (!state.value) throw new Error('Uninitialized')
    state.value = {
      ...state.value!,
      sizes: Object.fromEntries(
        Object.entries(state.value!.sizes)
          .map(([k, size]) => [k, k === colName ? width : size])
      ) as Record<ColumnName, number>
    }
  }

  // Scale sizes when got new viewport width
  const rescale = (newViewportWidth: number) => {
    if (!state.value) throw new Error('Uninitialized')
    const { viewportWidth: prevWidth, sizes, columns } = state.value
    const scale = (newViewportWidth - nonResizableWidth.value) / (prevWidth - nonResizableWidth.value)
    state.value = {
      ...state.value,
      viewportWidth: newViewportWidth,
      sizes: Object.fromEntries(
        (Object.entries(sizes) as [ColumnName, number][])
          .map(([colName, width]) => {
            const isResizable = columns[colName]!.resize ?? true
            return [colName, isResizable ? width * scale : width];
          })
      ) as Record<ColumnName, number>
    }
  }

  // Return readonly handle to the state and functions to mutate it
  return {
    state: readonly(state) as unknown as ComputedRef<State<ColumnName> | null>,
    init,
    setResizeState,
    resizeColumn,
    rescale,
  }
}

// Vue composable that manages all resizing functionality
export const useResizeTable = <ColumnName extends string>({
  tableOrWrapperRef,
  columns,
  columnHeaderSelector = ':scope > thead > tr > th',
  tableId
}: {
  tableOrWrapperRef: Ref<HTMLElement | ComponentPublicInstance | null>,
  columns: MaybeRefOrGetter<{ name: ColumnName, resize?: boolean }[]>,
  columnHeaderSelector?: string,
  tableId: string,
}) => {
  // State is isolated in a nested composable
  const {
    state,
    init,
    setResizeState,
    resizeColumn,
    rescale,
  } = useState<ColumnName>({ tableId })

  // Init (when args change)
  watch(
    // When table ref or columns definition changes
    () => [toValue(tableOrWrapperRef), toValue(columns)] as const,

    // Initialize state
    ([tableWrapper, columns]) => {
      const table = getTable(tableWrapper)
      if (!table) return

      const headers = getHeaders({
        table,
        columns,
        columnHeaderSelector
      })
      const columnsLookup = columns.reduce((lookup, colDef) => {
        lookup[colDef.name] = colDef
        return lookup
      }, {} as Record<ColumnName, ColumnDef<ColumnName>>)

      init({
        columns: columnsLookup,
        table: markRaw(table),
        headers: Object.fromEntries(
          [...headers.entries()]
            .map(([col, cell]) =>
              [col, markRaw(cell)])
        ) as Record<ColumnName, HTMLTableCellElement>,
        sizes: Object.fromEntries(
          [...headers.entries()]
            .map(([col, cell]) =>
              [col, cell.getBoundingClientRect().width])
        ) as Record<ColumnName, number>,
        viewportWidth: document.documentElement.clientWidth,
      })
    },

    // Execute at once
    { deep: true, immediate: true }
  )

  // Event handlers may access DOM and state,
  // but they only mutate state
  const getOnMouseDown = (colName: ColumnName) => (e: MouseEvent) => {
    const header = state.value!.headers[colName]!
    setResizeState({
      colName,
      startWidth: header.getBoundingClientRect().width,
      startPageX: e.pageX,
    })
  }

  const onMouseUp = () => setResizeState(null)
  useEventListener(document, 'mouseup', onMouseUp)

  const onMouseMove: (e: MouseEvent) => unknown =
    async (e: MouseEvent) => {
      await nextTick()
      const resizeState = state.value!.resizeState
      if (!resizeState) return
      const { colName, startWidth, startPageX } = resizeState
      const deltaX = e.pageX - startPageX
      resizeColumn(colName, startWidth + deltaX)
    }
  useEventListener(document, 'mousemove', onMouseMove)

  // Source of change are not restricted to events,
  // even though here DOM event is the final origin of the change,
  // a library helper is used to compute viewport size instead,
  // which can be watched in order to react to data changes.
  const { width: viewportWidth } = useWindowSize({ includeScrollbar: false })
  watch(viewportWidth, (newWidth) => rescale(newWidth))

  // stack with removeEventListener calls
  const onUnmount: (() => void)[] = []
  onUnmounted(() => {
    let unsub
    // eslint-disable-next-line no-cond-assign
    while (unsub = onUnmount.pop()) unsub()
  })

  // Reconciliation
  watch(
    // On any changes to the state
    state,

    // Update DOM
    (state) => {

      if (!state) return
      const { table, columns, sizes, headers } = state

      // All the changes to DOM happen here and only here
      let totalWidth = 0
      for (const [colName, width] of Object.entries(sizes) as [ColumnName, number][]) {
        const { resize: isResizable = true } = columns[colName]!
        totalWidth += width
        const header = headers[colName]!
        if (isResizable) {
          const maybeRemoveListener = attachResizeHandle({
            header,
            onMouseDown: getOnMouseDown(colName),
          })
          if (maybeRemoveListener) onUnmount.push(maybeRemoveListener)
          header.style.width = `${width.toFixed(10)}px`
        }
      }

      table.classList.add(TABLE_CLASS)
      table.style.width = `${totalWidth.toFixed(10)}px`
    }
  )

  // You can easily return state for debug purposes
  // return { resizeInnerState: state }
}
export default useResizeTable
