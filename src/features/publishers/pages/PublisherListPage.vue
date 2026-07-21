<script setup lang="ts">
import { computed, ref } from "vue";
import {
  keepPreviousData,
  useQuery,
  useQueryClient,
} from "@tanstack/vue-query";
import { BookOpen, Plus, RefreshCcw } from "@lucide/vue";
import { useRouter } from "vue-router";
import { toast } from "vue-sonner";
import type {
  PublisherResponseDto,
  PublishersListParams,
  PublishersListSortBy,
  PublishersListSortOrder,
} from "@/api/generated/models";
import { ADMIN_PERMISSIONS } from "@/authorization/admin-permissions";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb.vue";
import DataTable from "@/components/admin/table/DataTable.vue";
import type {
  DataTableDateColumn,
  DataTableFilterableColumn,
  DataTableQuery,
} from "@/components/admin/table/interface";
import PermissionGate from "@/components/authorization/PermissionGate.vue";
import { Button } from "@/components/ui/button";
import { useAdminPermissions } from "@/composables/use-admin-permissions";
import MasterDataActionsMenu from "@/features/product-master-data/components/MasterDataActionsMenu.vue";
import MasterDataDeleteDialog from "@/features/product-master-data/components/MasterDataDeleteDialog.vue";
import NamedMasterDataFormDialog from "@/features/product-master-data/components/NamedMasterDataFormDialog.vue";
import { createNamedMasterDataColumns } from "@/features/product-master-data/components/named-master-data-columns";
import { masterDataErrorMessage } from "@/features/product-master-data/utils/master-data-errors";
import { toPublisherListParams } from "../adapters/publisher-list-query.adapter";
import {
  createPublisher,
  deletePublisher,
  listPublishers,
  updatePublisher,
} from "../api/publisher-api";
import { publisherKeys } from "../api/publisher-query-keys";
const router = useRouter(),
  client = useQueryClient(),
  { can } = useAdminPermissions(),
  columns =
    createNamedMasterDataColumns<PublisherResponseDto>("Tên nhà xuất bản");
const page = ref(1),
  limit = ref(10),
  search = ref(""),
  usage = ref<PublishersListParams["usageStatus"]>(),
  from = ref<string>(),
  to = ref<string>(),
  sortBy = ref<PublishersListSortBy>("createdAt"),
  sortOrder = ref<PublishersListSortOrder>("desc"),
  formOpen = ref(false),
  editing = ref<PublisherResponseDto | null>(null),
  deleteOpen = ref(false),
  deleting = ref<PublisherResponseDto | null>(null),
  pending = ref(false);
const params = computed<PublishersListParams>(() => ({
  page: page.value,
  limit: limit.value,
  ...(search.value ? { search: search.value } : {}),
  ...(usage.value ? { usageStatus: usage.value } : {}),
  ...(from.value ? { createdFrom: from.value } : {}),
  ...(to.value ? { createdTo: to.value } : {}),
  sortBy: sortBy.value,
  sortOrder: sortOrder.value,
}));
const query = useQuery({
    queryKey: computed(() => publisherKeys.list(params.value)),
    queryFn: ({ signal }) => listPublishers(params.value, undefined, signal),
    placeholderData: keepPreviousData,
  }),
  rows = computed(() => query.data.value?.data ?? []),
  meta = computed(() => query.data.value?.meta),
  hasFilters = computed(() =>
    Boolean(search.value || usage.value || from.value || to.value),
  );
const filters: DataTableFilterableColumn[] = [
    {
      id: "usageCount",
      title: "Trạng thái sử dụng",
      operator: "in",
      options: [
        { label: "Đang được sử dụng", value: "USED" },
        { label: "Chưa được sử dụng", value: "UNUSED" },
      ],
    },
  ],
  dates: DataTableDateColumn[] = [
    {
      id: "createdAt",
      title: "Ngày tạo",
      placeholder: "Khoảng ngày tạo",
      mode: "range",
      enablePresets: true,
      disableFutureDates: true,
      dateFormatPattern: "DD/MM/YYYY",
    },
  ];
function onQuery(q: DataTableQuery) {
  const n = toPublisherListParams(q);
  page.value = n.page ?? 1;
  limit.value = n.limit ?? 10;
  search.value = n.search ?? "";
  usage.value = n.usageStatus;
  from.value = n.createdFrom;
  to.value = n.createdTo;
  sortBy.value = n.sortBy ?? "createdAt";
  sortOrder.value = n.sortOrder ?? "desc";
}
function create() {
  editing.value = null;
  formOpen.value = true;
}
function edit(r: PublisherResponseDto) {
  editing.value = r;
  formOpen.value = true;
}
function openDelete(r: PublisherResponseDto) {
  deleting.value = r;
  deleteOpen.value = true;
}
async function saved() {
  await client.invalidateQueries({ queryKey: publisherKeys.all });
}
async function remove() {
  if (!deleting.value || pending.value) return;
  pending.value = true;
  try {
    await deletePublisher(deleting.value.id);
    await saved();
    toast.success("Xóa nhà xuất bản thành công.");
    deleteOpen.value = false;
  } catch (e) {
    toast.error(masterDataErrorMessage(e, "Không thể xóa nhà xuất bản."));
    await query.refetch();
  } finally {
    pending.value = false;
  }
}
</script>
<template>
  <section class="min-w-0 space-y-6">
    <AdminBreadcrumb
      group-label="Quản lý sản phẩm"
      :group-to="{ name: 'super-admin-categories' }"
      section-label="Nhà xuất bản"
    />
    <div
      class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    >
      <div>
        <h1 class="text-2xl font-semibold sm:text-3xl">Nhà xuất bản</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Quản lý nhà xuất bản dùng chung trên toàn hệ thống.
        </p>
      </div>
      <PermissionGate :all-of="[ADMIN_PERMISSIONS.PUBLISHERS_CREATE]"
        ><Button @click="create"
          ><Plus class="mr-2 h-4 w-4" />Thêm nhà xuất bản</Button
        ></PermissionGate
      >
    </div>
    <DataTable
      :columns="columns"
      :data="rows"
      :page-count="meta?.lastPage"
      :row-count="meta?.total"
      :is-loading="query.isFetching.value"
      :error="query.error.value"
      :global-search="{
        columnIds: ['name'],
        placeholder: 'Tìm theo tên nhà xuất bản...',
        title: 'Tìm kiếm',
      }"
      :filterable-columns="filters"
      :date-columns="dates"
      :config="{
        tableId: 'publisher-management',
        rowIdKey: 'id',
        pageSize: 10,
        maxPageSize: 100,
        searchDebounce: 400,
        emitInitialQuery: true,
        initialSorting: [{ id: 'createdAt', desc: true }],
        initialColumnVisibility: { updatedAt: false },
        enableColumnVisibility: true,
        stickyActionColumn: true,
        routeSync: {
          mode: 'compact',
          page: true,
          pageSize: true,
          search: true,
          sorting: true,
          filters: true,
          filterIds: ['usageCount', 'createdAt'],
          filterParamMap: { usageCount: 'usageStatus' },
          arrayFilterIds: ['usageCount'],
          stringFilterIds: ['usageCount'],
          replace: true,
        },
      }"
      @update:query="onQuery"
      @retry="query.refetch()"
      ><template #toolbar-right
        ><Button size="sm" variant="outline" @click="query.refetch()"
          ><RefreshCcw class="mr-2 h-4 w-4" />Tải lại</Button
        ></template
      ><template #row-actions="{ rowData }"
        ><MasterDataActionsMenu
          :can-update="can(ADMIN_PERMISSIONS.PUBLISHERS_UPDATE)"
          :can-delete="can(ADMIN_PERMISSIONS.PUBLISHERS_DELETE)"
          :delete-disabled="rowData.usageCount > 0"
          @view="
            router.push({
              name: 'super-admin-publisher-detail',
              params: { id: rowData.id },
            })
          "
          @edit="edit(rowData)"
          @delete="openDelete(rowData)" /></template
      ><template #empty
        ><div
          class="flex flex-col items-center gap-2 py-12 text-center text-muted-foreground"
        >
          <BookOpen class="h-9 w-9" />
          <p class="font-medium text-foreground">
            {{
              hasFilters
                ? "Không tìm thấy nhà xuất bản phù hợp"
                : "Chưa có nhà xuất bản"
            }}
          </p>
        </div></template
      ></DataTable
    >
  </section>
  <NamedMasterDataFormDialog
    v-model:open="formOpen"
    :mode="editing ? 'update' : 'create'"
    :record="editing"
    entity-label="nhà xuất bản"
    description="Slug do backend tự động quản lý theo tên."
    :duplicate-codes="[
      'PUBLISHER_NAME_ALREADY_EXISTS',
      'PUBLISHER_SLUG_ALREADY_EXISTS',
    ]"
    :create-action="createPublisher"
    :update-action="updatePublisher"
    @saved="saved"
  /><MasterDataDeleteDialog
    v-model:open="deleteOpen"
    :name="deleting?.name ?? ''"
    title="Xóa nhà xuất bản?"
    description="Chỉ có thể xóa khi nhà xuất bản chưa được sản phẩm nào sử dụng. Hành động này không thể hoàn tác."
    :pending="pending"
    @confirm="remove"
  />
</template>
