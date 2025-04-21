<template>
  <q-table
    ref="table"
    v-model:selected="selectedColumns"
    :columns="columns"
    :rows="users"
    :pagination="{ rowsPerPage: 100 }"
    class="users-table"
    selection="multiple"
  />
</template>

<script lang="ts" setup>
import type { ComponentPublicInstance, Ref } from "vue";
import { useTemplateRef, ref } from "vue";
import type { QTableProps } from "quasar";

import { users } from 'src/mocks/users';
import { useResizeTable } from 'src/composables/useResizeTable'

type Columns = Exclude<QTableProps['columns'], undefined>[number] & { resize?: boolean }
const columns: Columns[] = [
  {
    name: 'id',
    label: 'ID',
    field: 'id',
    align: 'center',
  },
  {
    name: 'firstName',
    label: 'First Name',
    field: 'firstName',
    align: 'center',
  },
  {
    name: 'lastName',
    label: 'Last Name',
    field: 'lastName',
    align: 'center',
  },
  {
    name: 'email',
    label: 'Email',
    field: 'email',
    align: 'center',
  },
  {
    name: 'catchPhrase',
    label: 'Catch-Phrase',
    field: 'catchPhrase',
    align: 'center',
  },
  {
    name: 'ipAddressV4',
    label: 'IPv4',
    field: 'ipAddressV4',
    align: 'center',
  },
  {
    name: 'ipAddressV6',
    label: 'IPv6',
    field: 'ipAddressV6',
    align: 'center',
  },
  {
    name: 'ua',
    label: 'User-Agent',
    field: 'ua',
    align: 'center',
  },
  {
    name: 'actions',
    label: 'Actions',
    field: '_dummy',
    align: 'center',
    format: () => '✎ 🗑',
    resize: false,
    headerStyle: 'width: 64px',
  },
]

const selectedColumns: Ref<number[]> = ref([])
const tableRef = useTemplateRef('table') as Ref<ComponentPublicInstance | null>
useResizeTable({
  tableOrWrapperRef: tableRef,
  columns: [{ name: 'checkboxes', resize: false }, ...columns],
  tableId: 'quasar-table',
})
</script>

<style lang="scss" scoped>
.users-table {
  // height: calc(100vh - 50px - 6lh);
  height: calc(100vh - 50px);

  :deep(td), :deep(th) {
    user-select: none;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  :deep(.q-table--col-auto-width) {
    width: 48px;
    overflow: visible;
  }
}
</style>
