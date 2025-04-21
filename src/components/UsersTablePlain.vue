<template>
  <div class="users-table-plain">
    <table
      ref="table"
      class="users-table-plain__table"
    >
      <thead>
        <tr>
          <th
            v-for="col in columns"
            :key="col.name"
            class="users-table-plain__header"
            :class="{ 'users-table-plain__header--resize': col.resize || col.resize === undefined }"
          >
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="user in users"
          :key="user.id"
        >
          <td
            v-for="col in columns"
            :key="col.name"
          >
            {{ col.field && user[col.field] }}
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts" setup>
import type { Ref } from "vue";
import { useTemplateRef } from "vue";

import { users } from 'src/mocks/users';
import { useResizeTable } from 'src/composables/useResizeTable'

type User = (typeof users)[number]

const columns: {
  name: string
  label: string
  field: keyof User | null
  resize?: boolean
}[] = [
  {
    name: 'id',
    label: 'ID',
    field: 'id',
  },
  {
    name: 'firstName',
    label: 'First Name',
    field: 'firstName',
  },
  {
    name: 'lastName',
    label: 'Last Name',
    field: 'lastName',
  },
  {
    name: 'email',
    label: 'Email',
    field: 'email',
  },
  {
    name: 'catchPhrase',
    label: 'Catch-Phrase',
    field: 'catchPhrase',
  },
  {
    name: 'ipAddressV4',
    label: 'IPv4',
    field: 'ipAddressV4',
  },
  {
    name: 'ipAddressV6',
    label: 'IPv6',
    field: 'ipAddressV6',
  },
  {
    name: 'ua',
    label: 'User-Agent',
    field: 'ua',
  },
  {
    name: 'actions',
    label: 'Actions',
    field: null,
    resize: false,
  },
]

const tableRef = useTemplateRef('table') as Ref<HTMLTableElement | null>
useResizeTable({
  tableOrWrapperRef: tableRef,
  columns,
  tableId: 'plain-table',
})
</script>

<style lang="scss" scoped>
.users-table-plain {
  height: calc(100vh - 50px);
  overflow: auto;

  &__table {
    border-collapse: collapse;
  }

  td, th {
    user-select: none;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    text-align: center;
    padding: 8px;
    border: 1px solid black;
  }

  th:last-child {
    width: 64px;
  }
}
</style>
