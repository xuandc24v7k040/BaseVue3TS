<script setup lang="ts">
import { computed, h, ref } from "vue";
import {
  Ban,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sliders,
  Trash2,
  Truck,
} from "@lucide/vue";
import { toast } from "vue-sonner";
import type { Column, Table } from "@tanstack/vue-table";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  type DataTableConfig,
  type ColumnHeaderMode,
  type DataTableDateColumn,
  type DataTableFilterableColumn,
  type DataTableGlobalSearch,
  type DataTableQuery,
  type DataTableSearchableColumn,
  defineDataTableColumns,
} from "@/components/admin/table/interface";

import DataTable from "@/components/admin/table/DataTable.vue";
import DataTableActions from "@/components/admin/table/DataTableActions.vue";
import DataTableColumnHeader from "@/components/admin/table/DataTableColumnHeader.vue";
import { createDataTableApiQueryAdapter } from "@/components/admin/table/adapters";

// 1. Interfaces
interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Order {
  id: string;
  customerName: string;
  email: string;
  totalAmount: number;
  status: "pending" | "processing" | "shipping" | "completed" | "cancelled";
  createdAt: string;
  items: OrderItem[];
  subOrders?: Order[];
}

type PriceFilterValue = "under-1m" | "1m-5m" | "over-5m";

interface OrderApiParams extends Record<string, unknown> {
  page: number;
  limit: number;
  search?: string;
  searchBy?: string[];
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  status?: Order["status"][];
  customerName?: string;
  totalAmount?: PriceFilterValue;
  createdAtFrom?: string;
  createdAtTo?: string;
}

interface OrderApiResult {
  items: Order[];
  total: number;
  pageCount: number;
}

// 2. Mock Data (with Tree-structured installment Sub-orders)
const initialMockOrders: Order[] = [
  {
    id: "ORD-001",
    customerName: "Nguyễn Văn An",
    email: "an.nguyen@gmail.com",
    totalAmount: 1250000,
    status: "completed",
    createdAt: "2026-06-01",
    items: [
      {
        id: "it-1",
        productName: "Điện thoại Samsung Galaxy A54",
        quantity: 1,
        price: 1250000,
      },
    ],
  },
  {
    id: "ORD-002",
    customerName: "Trần Thị Bình",
    email: "binh.tran@yahoo.com",
    totalAmount: 450000,
    status: "processing",
    createdAt: "2026-06-02",
    items: [
      {
        id: "it-2",
        productName: "Tai nghe Bluetooth không dây",
        quantity: 2,
        price: 225000,
      },
    ],
  },
  {
    id: "ORD-003",
    customerName: "Lê Hoàng Cường",
    email: "cuong.le@outlook.com",
    totalAmount: 8900000,
    status: "pending",
    createdAt: "2026-06-03",
    items: [
      {
        id: "it-3",
        productName: "Laptop Asus Vivobook 15",
        quantity: 1,
        price: 8900000,
      },
    ],
    subOrders: [
      {
        id: "ORD-003-A",
        customerName: "Lê Hoàng Cường (Giao hàng đợt 1)",
        email: "cuong.le@outlook.com",
        totalAmount: 4900000,
        status: "completed",
        createdAt: "2026-06-03",
        items: [
          {
            id: "it-3a",
            productName: "Laptop Asus Vivobook 15 (Part A)",
            quantity: 1,
            price: 4900000,
          },
        ],
      },
      {
        id: "ORD-003-B",
        customerName: "Lê Hoàng Cường (Giao hàng đợt 2)",
        email: "cuong.le@outlook.com",
        totalAmount: 4000000,
        status: "pending",
        createdAt: "2026-06-03",
        items: [
          {
            id: "it-3b",
            productName: "Laptop Asus Vivobook 15 (Part B)",
            quantity: 1,
            price: 4000000,
          },
        ],
      },
    ],
  },
  {
    id: "ORD-004",
    customerName: "Phạm Minh Đức",
    email: "duc.pham@hotmail.com",
    totalAmount: 320000,
    status: "shipping",
    createdAt: "2026-06-04",
    items: [
      {
        id: "it-4",
        productName: "Bàn phím cơ Bosston T100",
        quantity: 1,
        price: 320000,
      },
    ],
  },
  {
    id: "ORD-005",
    customerName: "Vũ Thị Hồng",
    email: "hong.vu@gmail.com",
    totalAmount: 1500000,
    status: "cancelled",
    createdAt: "2026-06-05",
    items: [
      {
        id: "it-5",
        productName: "Chuột Gaming không dây Logitech G304",
        quantity: 3,
        price: 500000,
      },
    ],
  },
  {
    id: "ORD-006",
    customerName: "Nguyễn Thị Hương",
    email: "huong.nguyen@gmail.com",
    totalAmount: 2350000,
    status: "completed",
    createdAt: "2026-05-15",
    items: [
      {
        id: "it-6",
        productName: "Lò vi sóng Sharp 20L",
        quantity: 1,
        price: 2350000,
      },
    ],
  },
  {
    id: "ORD-007",
    customerName: "Hoàng Văn Huy",
    email: "huy.hoang@gmail.com",
    totalAmount: 780000,
    status: "processing",
    createdAt: "2026-05-20",
    items: [
      {
        id: "it-7",
        productName: "Nồi chiên không dầu Lock&Lock",
        quantity: 1,
        price: 780000,
      },
    ],
    subOrders: [
      {
        id: "ORD-007-A",
        customerName: "Hoàng Văn Huy (Hóa đơn phụ)",
        email: "huy.hoang@gmail.com",
        totalAmount: 780000,
        status: "processing",
        createdAt: "2026-05-20",
        items: [
          {
            id: "it-7a",
            productName: "Nồi chiên không dầu Lock&Lock",
            quantity: 1,
            price: 780000,
          },
        ],
      },
    ],
  },
  {
    id: "ORD-008",
    customerName: "Đỗ Thị Kim",
    email: "kim.do@yahoo.com",
    totalAmount: 120000,
    status: "completed",
    createdAt: "2026-05-22",
    items: [
      {
        id: "it-8",
        productName: "Đèn bàn học chống cận LED",
        quantity: 1,
        price: 120000,
      },
    ],
  },
  {
    id: "ORD-009",
    customerName: "Bùi Hoàng Long",
    email: "long.bui@gmail.com",
    totalAmount: 19900000,
    status: "pending",
    createdAt: "2026-05-25",
    items: [
      {
        id: "it-9",
        productName: "iPhone 15 Pro 128GB",
        quantity: 1,
        price: 19900000,
      },
    ],
  },
  {
    id: "ORD-010",
    customerName: "Ngô Quốc Nam",
    email: "nam.ngo@outlook.com",
    totalAmount: 550000,
    status: "shipping",
    createdAt: "2026-05-28",
    items: [
      {
        id: "it-10",
        productName: "Quạt đứng Tefal",
        quantity: 1,
        price: 550000,
      },
    ],
  },
  {
    id: "ORD-011",
    customerName: "Dương Thị Ngọc",
    email: "ngoc.duong@gmail.com",
    totalAmount: 1450000,
    status: "completed",
    createdAt: "2026-06-01",
    items: [
      {
        id: "it-11",
        productName: "Máy xay sinh tố Philips",
        quantity: 1,
        price: 1450000,
      },
    ],
  },
  {
    id: "ORD-012",
    customerName: "Phan Văn Phú",
    email: "phu.phan@gmail.com",
    totalAmount: 3500000,
    status: "processing",
    createdAt: "2026-06-02",
    items: [
      {
        id: "it-12",
        productName: "Máy lọc nước Karofi 8 lõi",
        quantity: 1,
        price: 3500000,
      },
    ],
  },
  {
    id: "ORD-013",
    customerName: "Lý Hồng Quân",
    email: "quan.ly@hotmail.com",
    totalAmount: 95000,
    status: "completed",
    createdAt: "2026-06-03",
    items: [
      {
        id: "it-13",
        productName: "Cáp sạc nhanh USB-C Anker 0.9m",
        quantity: 1,
        price: 95000,
      },
    ],
  },
  {
    id: "ORD-014",
    customerName: "Mai Thị Quỳnh",
    email: "quynh.mai@gmail.com",
    totalAmount: 2200000,
    status: "cancelled",
    createdAt: "2026-06-04",
    items: [
      {
        id: "it-14",
        productName: "Nồi cơm điện cao tần Toshiba",
        quantity: 1,
        price: 2200000,
      },
    ],
  },
  {
    id: "ORD-015",
    customerName: "Lâm Văn Sáng",
    email: "sang.lam@gmail.com",
    totalAmount: 640000,
    status: "shipping",
    createdAt: "2026-06-05",
    items: [
      {
        id: "it-15",
        productName: "Ấm siêu tốc thủy tinh Electrolux",
        quantity: 2,
        price: 320000,
      },
    ],
  },
  {
    id: "ORD-016",
    customerName: "Đặng Minh Tâm",
    email: "tam.dang@gmail.com",
    totalAmount: 4800000,
    status: "completed",
    createdAt: "2026-06-06",
    items: [
      {
        id: "it-16",
        productName: "Màn hình máy tính Dell 24 inch",
        quantity: 1,
        price: 4800000,
      },
    ],
  },
  {
    id: "ORD-017",
    customerName: "Lương Minh Trí",
    email: "tri.luong@yahoo.com",
    totalAmount: 250000,
    status: "pending",
    createdAt: "2026-06-06",
    items: [
      {
        id: "it-17",
        productName: "Balo laptop chống nước Xiaomi",
        quantity: 1,
        price: 250000,
      },
    ],
  },
  {
    id: "ORD-018",
    customerName: "Vương Thị Uyên",
    email: "uyen.vuong@gmail.com",
    totalAmount: 1800000,
    status: "processing",
    createdAt: "2026-06-07",
    items: [
      {
        id: "it-18",
        productName: "Bàn là hơi nước đứng Rowenta",
        quantity: 1,
        price: 1800000,
      },
    ],
  },
  {
    id: "ORD-019",
    customerName: "Tô Văn Việt",
    email: "viet.to@gmail.com",
    totalAmount: 950000,
    status: "shipping",
    createdAt: "2026-06-07",
    items: [
      {
        id: "it-19",
        productName: "Ổ cứng di động SSD WD 500GB",
        quantity: 1,
        price: 950000,
      },
    ],
  },
  {
    id: "ORD-020",
    customerName: "Trịnh Hoài Xuân",
    email: "xuan.trinh@gmail.com",
    totalAmount: 150000,
    status: "completed",
    createdAt: "2026-06-07",
    items: [
      {
        id: "it-20",
        productName: "Thẻ nhớ MicroSD Sandisk 64GB",
        quantity: 10,
        price: 15000,
      },
    ],
  },
];

const mockOrders = ref<Order[]>([...initialMockOrders]);

// 3. Faceted Filter Status Definitions
const statusOptions = [
  { label: "Chờ xử lý", value: "pending", icon: Clock, variant: "warning" },
  {
    label: "Đang xử lý",
    value: "processing",
    icon: Loader2,
    variant: "secondary",
  },
  { label: "Đang giao", value: "shipping", icon: Truck, variant: "muted" },
  {
    label: "Hoàn thành",
    value: "completed",
    icon: CheckCircle2,
    variant: "success",
  },
  { label: "Đã hủy", value: "cancelled", icon: Ban, variant: "destructive" },
] as const;

function renderOrderColumnHeader(
  column: Column<Order, unknown>,
  mode: ColumnHeaderMode = { type: "sort" },
) {
  return h(DataTableColumnHeader<Order>, {
    column,
    title: column.columnDef.meta?.title ?? column.id,
    mode,
  });
}

const paymentMethods = ["cod", "bank", "ewallet", "card"] as const;
type PaymentMethod = (typeof paymentMethods)[number];

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cod: "COD",
  bank: "Chuyển khoản",
  ewallet: "Ví điện tử",
  card: "Thẻ nội địa",
};

const orderChannels = ["website", "mobile", "marketplace", "counter"] as const;
type OrderChannel = (typeof orderChannels)[number];

const orderChannelLabels: Record<OrderChannel, string> = {
  website: "Website",
  mobile: "Ứng dụng",
  marketplace: "Sàn TMĐT",
  counter: "Tại quầy",
};

const paymentStatusLabels = {
  paid: "Đã thanh toán",
  unpaid: "Chưa thanh toán",
  partial: "Thanh toán một phần",
  refunded: "Đã hoàn tiền",
} as const;
type PaymentStatus = keyof typeof paymentStatusLabels;

const shippingCities = [
  "Cần Thơ",
  "Hậu Giang",
  "TP. Hồ Chí Minh",
  "Đà Nẵng",
  "Hà Nội",
  "An Giang",
] as const;

const deliveryWindows = [
  "08:00 - 10:00",
  "10:00 - 12:00",
  "13:00 - 15:00",
  "15:00 - 17:00",
] as const;

function getOrderSeed(orderId: string): number {
  return Array.from(orderId).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function pickOrderMeta<TValue>(orderId: string, values: readonly TValue[]): TValue {
  return values[getOrderSeed(orderId) % values.length] ?? values[0];
}

function formatDateOnly(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getOrderUpdatedAt(order: Order): string {
  const [year, month, day] = order.createdAt.split("-").map(Number);
  if (!year || !month || !day) return order.createdAt;

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + (getOrderSeed(order.id) % 4));
  return formatDateOnly(date);
}

function getPaymentStatus(order: Order): PaymentStatus {
  if (order.status === "completed" || order.status === "shipping") return "paid";
  if (order.status === "cancelled") return "refunded";
  if (order.status === "pending") return "unpaid";
  return order.totalAmount > 5000000 ? "partial" : "unpaid";
}

function getPaymentMethod(order: Order): PaymentMethod {
  return pickOrderMeta(order.id, paymentMethods);
}

function getOrderChannel(order: Order): OrderChannel {
  return pickOrderMeta(order.id, orderChannels);
}

function getShippingCity(order: Order): string {
  return pickOrderMeta(order.id, shippingCities);
}

function getDeliveryWindow(order: Order): string {
  return pickOrderMeta(order.id, deliveryWindows);
}

function getFulfillmentCode(order: Order): string {
  const warehouse = (getOrderSeed(order.id) % 4) + 1;
  return `WH-${warehouse} / ${order.id.slice(-3)}`;
}

function getOrderSortValue(order: Order, columnId: string): string | number {
  if (columnId === "paymentMethod") return paymentMethodLabels[getPaymentMethod(order)];
  if (columnId === "paymentStatus") return paymentStatusLabels[getPaymentStatus(order)];
  if (columnId === "orderChannel") return orderChannelLabels[getOrderChannel(order)];
  if (columnId === "shippingCity") return getShippingCity(order);
  if (columnId === "deliveryWindow") return getDeliveryWindow(order);
  if (columnId === "fulfillmentCode") return getFulfillmentCode(order);
  if (columnId === "updatedAt") return getOrderUpdatedAt(order);

  const value = order[columnId as keyof Order];
  if (typeof value === "number" || typeof value === "string") return value;
  return String(value ?? "");
}

// 4. Columns Def
const columns = defineDataTableColumns<Order>([
  {
    accessorKey: "id",
    size: 148,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h(
        "span",
        { class: "font-mono font-bold text-primary" },
        row.getValue("id"),
      ),
    meta: { title: "Mã đơn hàng", sticky: "left" },
  },
  {
    accessorKey: "customerName",
    size: 232,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h("div", { class: "flex max-w-56 flex-col gap-0.5" }, [
        h(
          "span",
          { class: "truncate font-medium text-foreground" },
          row.original.customerName,
        ),
        h(
          "span",
          { class: "truncate text-xs text-muted-foreground" },
          row.original.email,
        ),
      ]),
    meta: { title: "Khách hàng" },
  },
  {
    id: "primaryItem",
    accessorFn: (row) => row.items[0]?.productName ?? "",
    size: 240,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h("div", { class: "max-w-60" }, [
        h(
          "p",
          { class: "truncate font-medium text-foreground" },
          row.original.items[0]?.productName ?? "Không có sản phẩm",
        ),
        h(
          "p",
          { class: "text-xs text-muted-foreground" },
          `${row.original.items.length} mặt hàng trong đơn`,
        ),
      ]),
    meta: { title: "Sản phẩm" },
  },
  {
    id: "itemCount",
    accessorFn: (row) => row.items.reduce((sum, item) => sum + item.quantity, 0),
    size: 110,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h(
        "span",
        { class: "font-mono text-muted-foreground" },
        String(row.original.items.reduce((sum, item) => sum + item.quantity, 0)),
      ),
    meta: { title: "Số lượng" },
  },
  {
    accessorKey: "totalAmount",
    size: 170,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) => {
      const amount = Number(row.getValue("totalAmount") ?? 0);
      const formatted = new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
      }).format(amount);
      return h(
        "span",
        { class: "font-medium font-mono text-right" },
        formatted,
      );
    },
    meta: { title: "Tổng tiền" },
  },
  {
    id: "paymentMethod",
    accessorFn: (row) => paymentMethodLabels[getPaymentMethod(row)],
    size: 158,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h("span", { class: "text-sm text-foreground" }, paymentMethodLabels[getPaymentMethod(row.original)]),
    meta: { title: "Phương thức TT" },
  },
  {
    id: "paymentStatus",
    accessorFn: (row) => paymentStatusLabels[getPaymentStatus(row)],
    size: 180,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) => {
      const paymentStatus = getPaymentStatus(row.original);
      const classByStatus: Record<PaymentStatus, string> = {
        paid: "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        unpaid: "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        partial: "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
        refunded: "border-slate-500/20 bg-slate-500/10 text-slate-600 dark:text-slate-400",
      };

      return h(
        "span",
        {
          class: `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${classByStatus[paymentStatus]}`,
        },
        paymentStatusLabels[paymentStatus],
      );
    },
    meta: { title: "Trạng thái TT" },
  },
  {
    id: "orderChannel",
    accessorFn: (row) => orderChannelLabels[getOrderChannel(row)],
    size: 150,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h("span", { class: "text-sm text-muted-foreground" }, orderChannelLabels[getOrderChannel(row.original)]),
    meta: { title: "Kênh bán" },
  },
  {
    id: "fulfillmentCode",
    accessorFn: (row) => getFulfillmentCode(row),
    size: 154,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h("span", { class: "font-mono text-xs text-muted-foreground" }, getFulfillmentCode(row.original)),
    meta: { title: "Kho xử lý" },
  },
  {
    id: "shippingCity",
    accessorFn: (row) => getShippingCity(row),
    size: 160,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h("span", { class: "text-sm text-foreground" }, getShippingCity(row.original)),
    meta: { title: "Khu vực giao" },
  },
  {
    id: "deliveryWindow",
    accessorFn: (row) => getDeliveryWindow(row),
    size: 156,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h("span", { class: "font-mono text-xs text-muted-foreground" }, getDeliveryWindow(row.original)),
    meta: { title: "Khung giờ giao" },
  },
  {
    id: "updatedAt",
    accessorFn: (row) => getOrderUpdatedAt(row),
    size: 148,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) =>
      h("span", { class: "text-sm text-muted-foreground" }, getOrderUpdatedAt(row.original)),
    meta: { title: "Cập nhật cuối" },
  },
  {
    accessorKey: "status",
    size: 168,
    header: ({ column }) =>
      renderOrderColumnHeader(column, {
        type: "filter",
        options: [...statusOptions],
      }),
    cell: ({ row }) => {
      const status = row.getValue("status") as Order["status"];
      const option = statusOptions.find((o) => o.value === status);

      const variantClasses = {
        success:
          "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
        warning:
          "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
        destructive:
          "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
        secondary:
          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
        muted:
          "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        default:
          "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
        outline: "border border-border text-foreground",
      };
      const variantClass = variantClasses[option?.variant ?? "default"];

      return h(
        "span",
        {
          class: `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${variantClass}`,
        },
        [
          option?.icon && h(option.icon, { class: "h-3 w-3 shrink-0" }),
          h("span", {}, option?.label || status),
        ],
      );
    },
    meta: { title: "Trạng thái" },
  },
  {
    accessorKey: "createdAt",
    size: 140,
    header: ({ column }) => renderOrderColumnHeader(column),
    cell: ({ row }) => {
      const dateStr = row.getValue("createdAt") as string;
      return h("span", { class: "text-sm text-muted-foreground" }, dateStr);
    },
    meta: { title: "Ngày tạo" },
  },
]);

// 5. Test Configuration Panel Refs
const showSettings = ref(false);
const forceLoading = ref(false);
const selectedErrorOption = ref("none");
const mockError = computed(() => {
  if (selectedErrorOption.value === "string")
    return "Không thể kết nối với máy chủ API. (Mock String Error)";
  if (selectedErrorOption.value === "object")
    return new Error("SQLSTATE[HY000]: General error. (Mock Error Object)");
  return null;
});

const enableRowSelectionSetting = ref(true);
const enableMultiRowSelectionSetting = ref(true);
const clearSelectionOnPageChangeSetting = ref(true);
const clearSelectionOnQueryChangeSetting = ref(true);
const enableExpandingSetting = ref(true);
const expansionModeSetting = ref<"tree" | "detail">("tree");
const expandOnRowClickSetting = ref(false);
const autoExpandAllSetting = ref(false);
const autoExpandOnFilterIdsSetting = ref(false);
const emitInitialQuerySetting = ref(true);
const maxPageSizeSetting = ref(100);
const queryDebounceSetting = ref(300);

const persistenceEnabledSetting = ref(true);
const persistencePageSizeSetting = ref(true);
const persistenceColumnsSetting = ref(true);
const persistenceSortingSetting = ref(true);

const routeSyncEnabledSetting = ref(true);
const routeSyncModeSetting = ref<"compact" | "namespaced">("compact");
const routeSyncKeyPrefixSetting = ref("ord");
const routeSyncReplaceSetting = ref(true);

const dateFilterModeSetting = ref<
  "single" | "range" | "single-datetime" | "range-datetime"
>("range");
const dateFilterPresetsSetting = ref(true);
const dateFilterStyleSetting = ref<
  "full" | "long" | "medium" | "short" | "dd/mm/yyyy"
>("medium");
const dateFilterDisableFutureSetting = ref(true);
const dateFilterDisablePastSetting = ref(false);

const tableConfig = computed<DataTableConfig<Order>>(() => ({
  tableId: "orders-test-view",
  rowIdKey: "id",
  getRowId: (row) => row.id,
  getRowAriaLabel: (row) =>
    `Đơn hàng ${row.id} của khách hàng ${row.customerName}`,
  enableRowClick: true,
  pageSize: 10,
  maxPageSize: maxPageSizeSetting.value,
  enableRowSelection: enableRowSelectionSetting.value,
  enableMultiRowSelection: enableMultiRowSelectionSetting.value,
  stickySelectionColumn: true,
  stickyExpansionColumn: true,
  stickyActionColumn: true,
  enableColumnSticky: true,
  initialColumnVisibility: {
    fulfillmentCode: false,
    shippingCity: false,
    deliveryWindow: false,
    updatedAt: false,
    status: false,
    createdAt: false,
  },
  clearSelectionOnPageChange: clearSelectionOnPageChangeSetting.value,
  clearSelectionOnQueryChange: clearSelectionOnQueryChangeSetting.value,
  enableExpanding: enableExpandingSetting.value,
  expandOnRowClick: expandOnRowClickSetting.value,
  autoExpandAll:
    autoExpandAllSetting.value || autoExpandOnFilterIdsSetting.value,
  autoExpandOnFilterIds: autoExpandOnFilterIdsSetting.value
    ? ["status"]
    : undefined,
  emitInitialQuery: emitInitialQuerySetting.value,
  queryDebounce: queryDebounceSetting.value,
  getSubRows:
    enableExpandingSetting.value && expansionModeSetting.value === "tree"
      ? (row) => row.subOrders
      : undefined,
  persistence: persistenceEnabledSetting.value
    ? {
        key: "persisted-orders-table",
        version: 2,
        pageSize: persistencePageSizeSetting.value,
        columns: persistenceColumnsSetting.value,
        sorting: persistenceSortingSetting.value,
      }
    : false,
  routeSync: routeSyncEnabledSetting.value
    ? {
        enabled: true,
        mode: routeSyncModeSetting.value,
        keyPrefix: routeSyncKeyPrefixSetting.value || undefined,
        replace: routeSyncReplaceSetting.value,
        filterIds: ["totalAmount"],
        stringFilterIds: ["totalAmount"],
      }
    : false,
}));

// 6. DataTable Filters Props
const globalSearch = ref<DataTableGlobalSearch>({
  columnIds: ["id", "customerName"],
  placeholder: "Tìm theo mã hoặc tên khách...",
});

const searchableColumns = ref<DataTableSearchableColumn[]>([
  {
    id: "customerName",
    title: "Tên khách hàng",
    placeholder: "Lọc tên khách...",
  },
]);

const filterableColumns = ref<DataTableFilterableColumn[]>([
  {
    id: "status",
    title: "Trạng thái đơn",
    options: [...statusOptions],
  },
]);

const dateColumns = computed<DataTableDateColumn[]>(() => [
  {
    id: "createdAt",
    title: "Ngày tạo",
    placeholder: dateFilterModeSetting.value.includes("range")
      ? "Khoảng ngày tạo"
      : "Chọn ngày tạo",
    mode: dateFilterModeSetting.value,
    enablePresets: dateFilterPresetsSetting.value,
    disableFutureDates: dateFilterDisableFutureSetting.value,
    disablePastDates: dateFilterDisablePastSetting.value,
    dateStyle:
      dateFilterStyleSetting.value === "dd/mm/yyyy"
        ? undefined
        : dateFilterStyleSetting.value,
    dateFormatPattern:
      dateFilterStyleSetting.value === "dd/mm/yyyy" ? "DD/MM/YYYY" : undefined,
  },
]);

const ORDER_STATUS_VALUES: Order["status"][] = [
  "pending",
  "processing",
  "shipping",
  "completed",
  "cancelled",
];
const APP_TIMEZONE_OFFSET = "+07:00";

function isOrderStatus(value: string): value is Order["status"] {
  return ORDER_STATUS_VALUES.includes(value as Order["status"]);
}

function isPriceFilterValue(value: unknown): value is PriceFilterValue {
  return value === "under-1m" || value === "1m-5m" || value === "over-5m";
}

function isDateRangeValue(value: unknown): value is { start?: string; end?: string } {
  return Boolean(value && typeof value === "object" && ("start" in value || "end" in value));
}

function getDateOnly(value: string | undefined) {
  if (!value) return undefined;
  return (value.includes("T") ? value.split("T")[0] : value) || value;
}

function toApiDateBound(value: string | undefined, bound: "start" | "end") {
  if (!value) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const time = bound === "start" ? "00:00:00.000" : "23:59:59.999";
    return `${value}T${time}${APP_TIMEZONE_OFFSET}`;
  }

  return `${value}:00.000${APP_TIMEZONE_OFFSET}`;
}

const toOrderApiParams = createDataTableApiQueryAdapter<OrderApiParams>({
  pageKey: "page",
  pageSizeKey: "limit",
  serializeFilters(query) {
    const params: Partial<OrderApiParams> = {};

    for (const filter of query.filters ?? []) {
      const { id, value } = filter;

      if (id === "status" && Array.isArray(value)) {
        const statuses = value.map(String).filter(isOrderStatus);
        if (statuses.length > 0) params.status = statuses;
      }

      if (id === "customerName" && typeof value === "string" && value.trim()) {
        params.customerName = value.trim();
      }

      if (id === "createdAt") {
        if (typeof value === "string" && value !== "") {
          params.createdAtFrom = toApiDateBound(value, "start");
          params.createdAtTo = toApiDateBound(value, "end");
        } else if (isDateRangeValue(value)) {
          params.createdAtFrom = toApiDateBound(value.start, "start");
          params.createdAtTo = toApiDateBound(value.end, "end");
        }
      }

      if (id === "totalAmount" && isPriceFilterValue(value)) {
        params.totalAmount = value;
      }
    }

    return params;
  },
  map(params) {
    return params as OrderApiParams;
  },
});

// 7. Pagination and Live API Query State
const displayData = ref<Order[]>([]);
const pageCount = ref(1);
const totalRows = ref(0);
const isLoading = ref(false);
const selectedRowIds = ref<string[]>([]);
const latestQueryJson = ref("");
const latestApiParamsJson = ref("");

let latestRequestId = 0;

function fetchMockOrders(params: OrderApiParams): Promise<OrderApiResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      let result = [...mockOrders.value];

      // A. Global Search Filter
      if (params.search) {
        const searchVal = params.search.toLowerCase().trim();
        const searchCols = params.searchBy?.length
          ? params.searchBy
          : ["id", "customerName"];
        result = result.filter((row) =>
          searchCols.some((colId) => {
            const val = row[colId as keyof Order];
            return String(val ?? "")
              .toLowerCase()
              .includes(searchVal);
          }),
        );
      }

      if (params.status?.length) {
        result = result.filter((row) => params.status?.includes(row.status));
      }

      if (params.customerName) {
        const customerName = params.customerName.toLowerCase().trim();
        result = result.filter((row) =>
          row.customerName.toLowerCase().includes(customerName),
        );
      }

      const createdAtFrom = getDateOnly(params.createdAtFrom);
      const createdAtTo = getDateOnly(params.createdAtTo);
      if (createdAtFrom) {
        result = result.filter((row) => row.createdAt >= createdAtFrom);
      }
      if (createdAtTo) {
        result = result.filter((row) => row.createdAt <= createdAtTo);
      }

      if (params.totalAmount === "under-1m") {
        result = result.filter((row) => row.totalAmount < 1000000);
      } else if (params.totalAmount === "1m-5m") {
        result = result.filter(
          (row) => row.totalAmount >= 1000000 && row.totalAmount <= 5000000,
        );
      } else if (params.totalAmount === "over-5m") {
        result = result.filter((row) => row.totalAmount > 5000000);
      }

      // C. Sorting
      if (params.sortBy) {
        const id = params.sortBy;
        const desc = params.sortOrder === "desc";
        result.sort((a, b) => {
          const aVal = getOrderSortValue(a, id);
          const bVal = getOrderSortValue(b, id);

          if (typeof aVal === "number" && typeof bVal === "number") {
            return desc ? bVal - aVal : aVal - bVal;
          }

          return desc
            ? String(bVal).localeCompare(String(aVal))
            : String(aVal).localeCompare(String(bVal));
        });
      }

      const limit = Math.max(Number(params.limit) || 10, 1);
      const page = Math.max(Number(params.page) || 1, 1);
      const total = result.length;
      const startIdx = (page - 1) * limit;
      const endIdx = startIdx + limit;

      resolve({
        items: result.slice(startIdx, endIdx),
        total,
        pageCount: Math.max(Math.ceil(total / limit), 1),
      });

    }, 350);
  });
}

const handleQueryChange = async (query: DataTableQuery) => {
  const requestId = ++latestRequestId;
  const params = toOrderApiParams(query);

  latestQueryJson.value = JSON.stringify(query, null, 2);
  latestApiParamsJson.value = JSON.stringify(params, null, 2);
  isLoading.value = true;

  try {
    const response = await fetchMockOrders(params);
    if (requestId !== latestRequestId) return;

    displayData.value = response.items;
    totalRows.value = response.total;
    pageCount.value = response.pageCount;

    toast.success(
      `Đã đồng bộ ${response.total} đơn hàng (Trang ${params.page}/${response.pageCount || 1})`,
      {
        id: "table-fetch-notification",
      },
    );
  } finally {
    if (requestId === latestRequestId) {
      isLoading.value = false;
    }
  }
};

// 8. Custom filter handler for totalAmount
function getPriceFilterValue(table: Table<Order>) {
  const value = table.getColumn("totalAmount")?.getFilterValue();
  return isPriceFilterValue(value) ? value : "all";
}

function handlePriceFilterChange(table: Table<Order>, val: unknown) {
  const stringVal = String(val ?? "all");
  table
    .getColumn("totalAmount")
    ?.setFilterValue(stringVal === "all" ? undefined : stringVal);
}

function refreshTable() {
  if (latestQueryJson.value) {
    try {
      handleQueryChange(JSON.parse(latestQueryJson.value));
    } catch {
      handleQueryChange({ page: 1, pageSize: 10 });
    }
  } else {
    handleQueryChange({ page: 1, pageSize: 10 });
  }
}

interface OrdersDataTableExpose {
  table: Table<Order>;
  resetAllTableState: () => void;
  resetPersistenceToDefaults: () => void;
}

const dataTableRef = ref<OrdersDataTableExpose | null>(null);

function generateMockOrders(count: number) {
  const statuses: Order["status"][] = [
    "pending",
    "processing",
    "shipping",
    "completed",
    "cancelled",
  ];
  const customerNames = [
    "Phan Thanh Hải",
    "Trần Hữu Nam",
    "Nguyễn Thị Mai",
    "Lê Hữu Phước",
    "Nguyễn Văn Trỗi",
    "Phạm Quỳnh Chi",
    "Trần Thu Thảo",
    "Vũ Anh Tuấn",
    "Hoàng Minh Khang",
    "Lê Quỳnh Anh",
  ];
  const productNames = [
    "Chuột Gaming Razer DeathAdder V3",
    "Bàn phím cơ Keychron K2",
    "Tai nghe Sony WH-1000XM5",
    "Màn hình LG DualUp 28 inch",
    "Củ sạc nhanh Anker GaN 65W",
    "Bàn di chuột SteelSeries",
    "Loa Bluetooth JBL Charge 5",
    "Đồng hồ thông minh Apple Watch SE",
    "Tay cầm chơi game DualSense PS5",
  ];

  const newOrders: Order[] = [];
  const startId = mockOrders.value.length + 1;

  for (let i = 0; i < count; i++) {
    const idNum = startId + i;
    const id = `ORD-${String(idNum).padStart(3, "0")}`;
    const name =
      customerNames[Math.floor(Math.random() * customerNames.length)] +
      ` (Mock ${idNum})`;
    const email = `${name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "")}@gmail.com`;
    const quantity = Math.floor(Math.random() * 3) + 1;
    const price = (Math.floor(Math.random() * 15) + 1) * 100000;
    const totalAmount = quantity * price;
    const status =
      statuses[Math.floor(Math.random() * statuses.length)] ?? "pending";

    const date = new Date(
      Date.now() - Math.floor(Math.random() * 30) * 24 * 3600 * 1000,
    );
    const createdAt = date.toISOString().split("T")[0] ?? "";

    newOrders.push({
      id,
      customerName: name,
      email,
      totalAmount,
      status,
      createdAt,
      items: [
        {
          id: `it-${idNum}`,
          productName:
            productNames[Math.floor(Math.random() * productNames.length)] ??
            "Sản phẩm mẫu",
          quantity,
          price,
        },
      ],
    });
  }

  mockOrders.value.push(...newOrders);
  toast.success(`Đã tạo thêm ${count} đơn hàng mẫu thành công!`);
  refreshTable();
}

function resetTableState() {
  if (dataTableRef.value) {
    dataTableRef.value.resetAllTableState();
    toast.success("Đã reset toàn bộ trạng thái bảng về mặc định.");
  } else {
    toast.error("Không tìm thấy instance của bảng!");
  }
}

// 9. Row Action Menu
const getRowActions = (rowData: Order) => [
  {
    label: "Xem chi tiết",
    icon: Eye,
    onClick: () =>
      toast.info(
        `Chi tiết đơn: ${rowData.id}\nKhách hàng: ${rowData.customerName}\nSố tiền: ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(rowData.totalAmount)}`,
      ),
  },
  {
    label: "Sửa số tiền",
    icon: Sliders,
    onClick: () => {
      const newAmount = prompt(
        `Cập nhật tổng số tiền cho đơn ${rowData.id}:`,
        String(rowData.totalAmount),
      );
      if (newAmount !== null) {
        const parsed = parseFloat(newAmount);
        if (!isNaN(parsed) && parsed >= 0) {
          rowData.totalAmount = parsed;
          toast.success(
            `Đã sửa tổng số tiền đơn ${rowData.id} thành ${new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(parsed)}`,
          );
          refreshTable();
        } else {
          toast.error("Số tiền nhập vào không hợp lệ!");
        }
      }
    },
  },
  {
    label: "Tải hóa đơn PDF",
    icon: FileText,
    onClick: () => toast.success(`Đang tạo hóa đơn PDF cho ${rowData.id}...`),
  },
  {
    label: "Hủy đơn hàng",
    icon: Ban,
    variant: "destructive" as const,
    disabled: rowData.status === "completed" || rowData.status === "cancelled",
    separator: true,
    onClick: () => {
      rowData.status = "cancelled";
      toast.error(`Đã hủy thành công đơn hàng: ${rowData.id}`);
      refreshTable();
    },
  },
];

// 10. Bulk Actions
const handleBulkDelete = (_rows: Order[], ids: string[]) => {
  mockOrders.value = mockOrders.value.filter((o) => !ids.includes(o.id));
  selectedRowIds.value = [];
  toast.error(`Đã xóa thành công ${ids.length} đơn hàng.`);
  refreshTable();
};

const handleBulkExport = (rows: Order[], ids: string[]) => {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(rows, null, 2));
  const downloadAnchor = document.createElement("a");
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `orders_export_${Date.now()}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
  toast.success(`Đã xuất dữ liệu Excel/JSON cho ${ids.length} đơn hàng.`);
};

function handleRowClick(row: Order) {
  toast.info(`Click chọn dòng: ${row.id}`);
}
</script>

<template>
  <div class="flex w-full min-w-0 max-w-full flex-col gap-5 overflow-x-hidden p-4 sm:gap-6 sm:p-6">
    <!-- Page Header -->
    <div
      class="flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between"
    >
      <div class="min-w-0">
        <h1
          class="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl md:text-4xl"
        >
          Bảng thử nghiệm DataTable
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          Trang kiểm thử đầy đủ mọi tính năng, cấu hình và vị trí slots của
          custom DataTable Component.
        </p>
      </div>

      <div class="flex w-full min-w-0 flex-wrap items-center gap-2 md:w-auto md:shrink-0 md:justify-end">
        <Button
          variant="outline"
          size="sm"
          class="max-w-full"
          @click="showSettings = !showSettings"
        >
          <Sliders class="mr-2 h-4 w-4" />
          {{ showSettings ? "Ẩn bảng điều khiển" : "Hiển thị bảng điều khiển" }}
        </Button>
        <Button variant="outline" size="sm" class="max-w-full" @click="refreshTable">
          <RefreshCw class="mr-2 h-4 w-4" />
          Làm mới
        </Button>
        <Button variant="outline" size="sm" class="max-w-full" @click="resetTableState">
          <Ban class="mr-2 h-4 w-4 text-muted-foreground" />
          Reset Bảng
        </Button>
        <Button size="sm" class="max-w-full" @click="generateMockOrders(1)">
          <Plus class="mr-2 h-4 w-4" />
          Tạo đơn nhanh
        </Button>
      </div>
    </div>

    <!-- Collapsible Interactive Settings Panel -->
    <Card
      v-if="showSettings"
      class="min-w-0 overflow-hidden border bg-card text-card-foreground shadow-sm transition-all duration-300"
    >
      <CardHeader class="pb-3">
        <CardTitle class="text-lg font-bold flex items-center gap-2">
          <span>⚙️ Bảng cấu hình kiểm thử DataTable</span>
        </CardTitle>
        <CardDescription>
          Thay đổi trạng thái dưới đây để quan sát hành vi lập tức của component
          bảng custom.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid min-w-0 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <!-- 1. Trạng thái Overlay & Trình giả lập -->
        <div class="space-y-4">
          <h3 class="text-sm font-semibold text-primary">
            1. Trình giả lập trạng thái
          </h3>
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <Checkbox id="force-loading" v-model="forceLoading" />
            <Label for="force-loading" class="cursor-pointer"
              >Cưỡng bức Loading</Label
            >
          </div>
          <div class="space-y-1.5">
            <Label for="mock-error-select">Lỗi giả lập</Label>
            <Select v-model="selectedErrorOption">
              <SelectTrigger id="mock-error-select" class="h-8">
                <SelectValue placeholder="Không lỗi" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Không lỗi (Bình thường)</SelectItem>
                <SelectItem value="string">Lỗi dạng Chuỗi (String)</SelectItem>
                <SelectItem value="object"
                  >Lỗi đối tượng Error (Object)</SelectItem
                >
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5 pt-1">
            <Label class="text-xs">Dữ liệu mẫu (Thử tải & Phân trang)</Label>
            <div class="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                class="h-8 flex-1 text-xs px-2"
                @click="generateMockOrders(10)"
              >
                +10 Đơn hàng
              </Button>
              <Button
                variant="outline"
                size="sm"
                class="h-8 flex-1 text-xs px-2"
                @click="generateMockOrders(50)"
              >
                +50 Đơn hàng
              </Button>
            </div>
          </div>
        </div>

        <!-- 2. Cấu hình Row Selection & Expansion -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-primary">
            2. Chọn dòng & Bung rộng
          </h3>
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <Checkbox
              id="enable-selection"
              v-model="enableRowSelectionSetting"
            />
            <Label for="enable-selection" class="cursor-pointer"
              >Cho phép chọn dòng</Label
            >
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="enable-multi-selection"
              v-model="enableMultiRowSelectionSetting"
              :disabled="!enableRowSelectionSetting"
            />
            <Label for="enable-multi-selection" class="cursor-pointer"
              >Chọn nhiều dòng (Multi)</Label
            >
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="clear-page-change"
              v-model="clearSelectionOnPageChangeSetting"
              :disabled="!enableRowSelectionSetting"
            />
            <Label for="clear-page-change" class="cursor-pointer"
              >Xóa chọn khi đổi trang</Label
            >
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="clear-query-change"
              v-model="clearSelectionOnQueryChangeSetting"
              :disabled="!enableRowSelectionSetting"
            />
            <Label for="clear-query-change" class="cursor-pointer"
              >Xóa chọn khi lọc/tìm kiếm</Label
            >
          </div>
          <div class="flex items-center gap-2">
            <Checkbox id="enable-expanding" v-model="enableExpandingSetting" />
            <Label for="enable-expanding" class="cursor-pointer"
              >Bật mở rộng dòng (Tree / Slot)</Label
            >
          </div>
          <div class="space-y-1.5 pl-4">
            <Label
              for="expansion-mode-select"
              class="text-xs font-medium text-muted-foreground"
              >Chế độ mở rộng</Label
            >
            <Select
              v-model="expansionModeSetting"
              :disabled="!enableExpandingSetting"
            >
              <SelectTrigger id="expansion-mode-select" class="h-8">
                <SelectValue placeholder="Chọn chế độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tree">Dữ liệu cây (Sub-orders)</SelectItem>
                <SelectItem value="detail">Khung chi tiết (Slot)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="expand-click"
              v-model="expandOnRowClickSetting"
              :disabled="!enableExpandingSetting"
            />
            <Label for="expand-click" class="cursor-pointer"
              >Bung rộng khi click dòng</Label
            >
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="auto-expand"
              v-model="autoExpandAllSetting"
              :disabled="!enableExpandingSetting"
            />
            <Label for="auto-expand" class="cursor-pointer"
              >Tự động bung hết dòng</Label
            >
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="auto-expand-filter"
              v-model="autoExpandOnFilterIdsSetting"
              :disabled="!enableExpandingSetting"
            />
            <Label for="auto-expand-filter" class="cursor-pointer"
              >Bung dòng khi lọc Status</Label
            >
          </div>
        </div>

        <!-- 3. Persistence & Debounce -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-primary">
            3. Lưu trạng thái & Độ trễ
          </h3>
          <div class="flex items-center gap-2">
            <Checkbox
              id="persistence-enabled"
              v-model="persistenceEnabledSetting"
            />
            <Label for="persistence-enabled" class="cursor-pointer"
              >Lưu trạng thái (Persistence)</Label
            >
          </div>
          <div class="flex items-center gap-2 pl-4">
            <Checkbox
              id="persist-page"
              v-model="persistencePageSizeSetting"
              :disabled="!persistenceEnabledSetting"
            />
            <Label for="persist-page" class="cursor-pointer"
              >Lưu Page Size</Label
            >
          </div>
          <div class="flex items-center gap-2 pl-4">
            <Checkbox
              id="persist-columns"
              v-model="persistenceColumnsSetting"
              :disabled="!persistenceEnabledSetting"
            />
            <Label for="persist-columns" class="cursor-pointer"
              >Lưu Ẩn/Hiện cột</Label
            >
          </div>
          <div class="flex items-center gap-2 pl-4">
            <Checkbox
              id="persist-sort"
              v-model="persistenceSortingSetting"
              :disabled="!persistenceEnabledSetting"
            />
            <Label for="persist-sort" class="cursor-pointer"
              >Lưu Sắp xếp (Sorting)</Label
            >
          </div>
          <div class="space-y-1">
            <Label for="max-page-size" class="text-xs">Max Page Size</Label>
            <Input
              id="max-page-size"
              type="number"
              v-model="maxPageSizeSetting"
              class="h-8"
            />
          </div>
          <div class="space-y-1">
            <Label for="query-debounce" class="text-xs"
              >Query Debounce (ms)</Label
            >
            <Input
              id="query-debounce"
              type="number"
              v-model="queryDebounceSetting"
              class="h-8"
            />
          </div>
          <div class="flex items-center gap-2 pt-1">
            <Checkbox id="emit-initial" v-model="emitInitialQuerySetting" />
            <Label for="emit-initial" class="cursor-pointer"
              >Phát Query ban đầu</Label
            >
          </div>
        </div>

        <!-- 4. Route Synchronization (URL) -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-primary">4. Đồng bộ hóa URL</h3>
          <div class="flex items-center gap-2">
            <Checkbox
              id="route-sync-enabled"
              v-model="routeSyncEnabledSetting"
            />
            <Label for="route-sync-enabled" class="cursor-pointer"
              >Đồng bộ URL (RouteSync)</Label
            >
          </div>
          <div class="space-y-1.5">
            <Label for="route-mode-select" class="text-xs"
              >Chế độ đồng bộ</Label
            >
            <Select
              v-model="routeSyncModeSetting"
              :disabled="!routeSyncEnabledSetting"
            >
              <SelectTrigger id="route-mode-select" class="h-8">
                <SelectValue placeholder="Compact" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="compact">Compact (Sạch URL)</SelectItem>
                <SelectItem value="namespaced"
                  >Namespaced (Hỗ trợ đa bảng)</SelectItem
                >
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1">
            <Label for="route-prefix" class="text-xs"
              >Key Prefix (cho Namespaced)</Label
            >
            <Input
              id="route-prefix"
              v-model="routeSyncKeyPrefixSetting"
              class="h-8"
              :disabled="
                !routeSyncEnabledSetting || routeSyncModeSetting === 'compact'
              "
            />
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="route-replace"
              v-model="routeSyncReplaceSetting"
              :disabled="!routeSyncEnabledSetting"
            />
            <Label for="route-replace" class="cursor-pointer"
              >Dùng router.replace</Label
            >
          </div>
        </div>

        <!-- 5. Cấu hình Lọc Ngày -->
        <div class="space-y-3">
          <h3 class="text-sm font-semibold text-primary">
            5. Lọc ngày & gợi ý nhanh
          </h3>
          <div class="space-y-1.5">
            <Label for="date-mode-select" class="text-xs"
              >Chế độ lọc ngày</Label
            >
            <Select v-model="dateFilterModeSetting">
              <SelectTrigger id="date-mode-select" class="h-8">
                <SelectValue placeholder="Chọn chế độ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Chọn 1 ngày (Single)</SelectItem>
                <SelectItem value="range">Chọn khoảng (Range)</SelectItem>
                <SelectItem value="single-datetime"
                  >Ngày và giờ (Single Datetime)</SelectItem
                >
                <SelectItem value="range-datetime"
                  >Khoảng ngày giờ (Range Datetime)</SelectItem
                >
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5 pt-1">
            <Label for="date-style-select" class="text-xs"
              >Định dạng hiển thị</Label
            >
            <Select v-model="dateFilterStyleSetting">
              <SelectTrigger id="date-style-select" class="h-8">
                <SelectValue placeholder="Chọn định dạng" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dd/mm/yyyy"
                  >Định dạng 15/06/2026 (DD/MM/YYYY)</SelectItem
                >
                <SelectItem value="short"
                  >Ngắn gọn (Short - 15/6/26)</SelectItem
                >
                <SelectItem value="medium"
                  >Vừa phải (Medium - 15 thg 6, 2026)</SelectItem
                >
                <SelectItem value="long"
                  >Chi tiết (Long - 15 tháng 6 năm 2026)</SelectItem
                >
                <SelectItem value="full"
                  >Đầy đủ (Full - Thứ Hai, 15 tháng 6, 2026)</SelectItem
                >
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2 pt-1">
            <Checkbox
              id="date-presets-enabled"
              v-model="dateFilterPresetsSetting"
            />
            <Label for="date-presets-enabled" class="cursor-pointer"
              >Hiển thị gợi ý nhanh</Label
            >
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="date-disable-future"
              v-model="dateFilterDisableFutureSetting"
            />
            <Label for="date-disable-future" class="cursor-pointer"
              >Chặn ngày tương lai</Label
            >
          </div>
          <div class="flex items-center gap-2">
            <Checkbox
              id="date-disable-past"
              v-model="dateFilterDisablePastSetting"
            />
            <Label for="date-disable-past" class="cursor-pointer"
              >Chặn ngày quá khứ</Label
            >
          </div>
        </div>
      </CardContent>
    </Card>

    <!-- Live Debugging States Visualization -->
    <div v-if="showSettings" class="grid min-w-0 gap-4 xl:grid-cols-3">
      <Card class="min-w-0 overflow-hidden border">
        <CardHeader class="py-3">
          <CardTitle class="text-sm font-bold"
            >📡 Tham số truy vấn (DataTableQuery) nhận từ Bảng</CardTitle
          >
        </CardHeader>
        <CardContent class="py-2">
          <pre
            class="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs font-mono"
            >{{ latestQueryJson || "Chưa nhận sự kiện update:query" }}</pre
          >
        </CardContent>
      </Card>
      <Card class="min-w-0 overflow-hidden border">
        <CardHeader class="py-3">
          <CardTitle class="text-sm font-bold"
            >API params sau parent adapter</CardTitle
          >
        </CardHeader>
        <CardContent class="py-2">
          <pre
            class="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs font-mono"
            >{{ latestApiParamsJson || "Chưa có API params" }}</pre
          >
        </CardContent>
      </Card>
      <Card class="min-w-0 overflow-hidden border">
        <CardHeader class="py-3">
          <CardTitle
            class="text-sm font-bold flex items-center justify-between"
          >
            <span>✅ Trạng thái dòng được chọn</span>
            <Badge variant="outline" class="font-mono"
              >{{ selectedRowIds.length }} dòng</Badge
            >
          </CardTitle>
        </CardHeader>
        <CardContent class="py-2">
          <div
            class="max-h-40 overflow-auto rounded-md bg-muted p-3 text-xs font-mono"
          >
            <p
              v-if="selectedRowIds.length === 0"
              class="text-muted-foreground italic"
            >
              Chưa chọn đơn hàng nào.
            </p>
            <ul v-else class="list-disc pl-4 space-y-1">
              <li v-for="id in selectedRowIds" :key="id">
                ID đơn: <span class="font-bold text-primary">{{ id }}</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Main Table Container -->
    <div class="w-full min-w-0 max-w-full overflow-hidden rounded-xl border bg-card p-3 text-card-foreground shadow-sm sm:p-4">
      <DataTable
        ref="dataTableRef"
        :columns="columns"
        :data="displayData"
        :page-count="pageCount"
        :row-count="totalRows"
        :is-loading="isLoading || forceLoading"
        :error="mockError"
        :global-search="globalSearch"
        :searchable-columns="searchableColumns"
        :filterable-columns="filterableColumns"
        :date-columns="dateColumns"
        :config="tableConfig"
        v-model:selected-row-ids="selectedRowIds"
        @update:query="handleQueryChange"
        @row-click="handleRowClick"
        @retry="refreshTable"
      >
        <!-- A. Before Table Slot (Quick Stats) -->
        <template #before-table>
          <div class="my-2 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Card class="bg-muted/10 border-dashed">
              <CardContent class="flex flex-col gap-1 p-3 sm:p-4">
                <span class="text-xs text-muted-foreground font-medium"
                  >Tổng số đơn hàng</span
                >
                <span class="font-mono text-xl font-bold sm:text-2xl">{{
                  totalRows
                }}</span>
              </CardContent>
            </Card>
            <Card class="bg-muted/10 border-dashed">
              <CardContent class="flex flex-col gap-1 p-3 sm:p-4">
                <span class="text-xs text-muted-foreground font-medium"
                  >Doanh thu giả lập</span
                >
                <span class="break-words font-mono text-xl font-bold text-emerald-600 sm:text-2xl">
                  {{
                    new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                    }).format(
                      mockOrders.reduce((sum, r) => sum + r.totalAmount, 0),
                    )
                  }}
                </span>
              </CardContent>
            </Card>
            <Card class="bg-muted/10 border-dashed">
              <CardContent class="flex flex-col gap-1 p-3 sm:p-4">
                <span class="text-xs text-muted-foreground font-medium"
                  >Đơn chờ xử lý</span
                >
                <span class="font-mono text-xl font-bold text-amber-500 sm:text-2xl">
                  {{ mockOrders.filter((r) => r.status === "pending").length }}
                </span>
              </CardContent>
            </Card>
            <Card class="bg-muted/10 border-dashed">
              <CardContent class="flex flex-col gap-1 p-3 sm:p-4">
                <span class="text-xs text-muted-foreground font-medium"
                  >Đơn hoàn thành</span
                >
                <span class="font-mono text-xl font-bold text-emerald-500 sm:text-2xl">
                  {{
                    mockOrders.filter((r) => r.status === "completed").length
                  }}
                </span>
              </CardContent>
            </Card>
          </div>
        </template>

        <!-- B. Filters Slot Override (Plug custom price filter) -->
        <template #filters="{ table }">
          <div class="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto">
            <Select
              :model-value="getPriceFilterValue(table)"
              @update:model-value="(val) => handlePriceFilterChange(table, val)"
            >
              <SelectTrigger class="h-9 w-full min-w-0 sm:w-44">
                <SelectValue placeholder="Lọc theo số tiền..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả số tiền</SelectItem>
                <SelectItem value="under-1m">Dưới 1,000,000đ</SelectItem>
                <SelectItem value="1m-5m">1,000,000đ - 5,000,000đ</SelectItem>
                <SelectItem value="over-5m">Trên 5,000,000đ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </template>

        <!-- C. Toolbar Left Slot -->
        <template #toolbar-left>
          <div
            class="flex min-w-0 max-w-full items-center gap-1.5 px-1 text-sm font-semibold text-muted-foreground sm:px-2"
          >
            <span class="truncate">Danh sách đơn hàng thử nghiệm</span>
          </div>
        </template>

        <!-- D. Custom Row Actions Slot -->
        <template #row-actions="{ rowData }">
          <DataTableActions
            :actions="getRowActions(rowData)"
            label="Thao tác"
          />
        </template>

        <!-- E. Custom Bulk Actions Slot -->
        <template #bulk-actions="{ selectedIds, selectedCurrentPageRows }">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              class="h-8 max-w-full border-dashed border-destructive text-destructive hover:bg-destructive/10"
              @click="handleBulkDelete(selectedCurrentPageRows, selectedIds)"
            >
              <Trash2 class="mr-2 h-3.5 w-3.5" />
              Xóa đã chọn ({{ selectedIds.length }})
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="h-8 max-w-full border-dashed border-primary text-primary hover:bg-primary/10"
              @click="handleBulkExport(selectedCurrentPageRows, selectedIds)"
            >
              <Download class="mr-2 h-3.5 w-3.5" />
              Xuất Excel
            </Button>
            <span
              v-if="selectedIds.length > selectedCurrentPageRows.length"
              class="text-xs text-muted-foreground sm:ml-2"
            >
              (Trong đó có {{ selectedIds.length - selectedCurrentPageRows.length }} dòng ở
              trang khác)
            </span>
          </div>
        </template>

        <!-- F. Custom Expanded Detail Row Slot (Installment detailed view) -->
        <template
          v-if="enableExpandingSetting && expansionModeSetting === 'detail'"
          #expanded-row="{ rowData }"
        >
          <div class="p-4 bg-muted/20 border-y space-y-3">
            <div class="font-semibold text-sm text-foreground">
              Chi tiết mặt hàng trong đơn:
            </div>
            <div class="overflow-x-auto rounded-lg border bg-background">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-muted/50 border-b">
                    <th
                      class="py-2 px-4 text-left font-medium text-muted-foreground"
                    >
                      Sản phẩm
                    </th>
                    <th
                      class="py-2 px-4 text-center font-medium text-muted-foreground w-24"
                    >
                      Số lượng
                    </th>
                    <th
                      class="py-2 px-4 text-right font-medium text-muted-foreground w-36"
                    >
                      Đơn giá
                    </th>
                    <th
                      class="py-2 px-4 text-right font-medium text-muted-foreground w-40"
                    >
                      Thành tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="item in rowData.items"
                    :key="item.id"
                    class="border-b last:border-0 hover:bg-muted/10"
                  >
                    <td
                      class="py-2.5 px-4 text-left font-medium text-foreground"
                    >
                      {{ item.productName }}
                    </td>
                    <td class="py-2.5 px-4 text-center font-mono">
                      {{ item.quantity }}
                    </td>
                    <td
                      class="py-2.5 px-4 text-right font-mono text-muted-foreground"
                    >
                      {{
                        new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(item.price)
                      }}
                    </td>
                    <td
                      class="py-2.5 px-4 text-right font-mono font-semibold text-foreground"
                    >
                      {{
                        new Intl.NumberFormat("vi-VN", {
                          style: "currency",
                          currency: "VND",
                        }).format(item.price * item.quantity)
                      }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </template>

        <!-- G. Custom Error Slot -->
        <template #error="{ error, retry }">
          <div
            class="flex flex-col items-center justify-center gap-4 py-16 text-center"
          >
            <div
              class="rounded-full bg-destructive/10 p-3 text-destructive animate-bounce"
            >
              <Ban class="h-10 w-10" />
            </div>
            <div class="space-y-2 max-w-md">
              <h3 class="text-lg font-semibold text-foreground">
                Đã xảy ra lỗi tải dữ liệu từ API
              </h3>
              <p class="text-sm text-muted-foreground">
                {{ error instanceof Error ? error.message : String(error) }}
              </p>
            </div>
            <Button variant="outline" size="sm" @click="retry">
              <RefreshCw class="mr-2 h-4 w-4" />
              Thử lại ngay
            </Button>
          </div>
        </template>

        <!-- H. Custom Empty state Slot override -->
        <template #empty>
          <div
            class="flex flex-col items-center justify-center gap-3 py-12 text-muted-foreground"
          >
            <Clock class="h-10 w-10 text-muted-foreground/60" />
            <div class="space-y-1 text-center">
              <p class="text-sm font-semibold text-foreground">
                Không tìm thấy đơn hàng nào khớp
              </p>
              <p class="text-xs">
                Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm khác xem sao.
              </p>
            </div>
          </div>
        </template>
      </DataTable>
    </div>
  </div>
</template>
