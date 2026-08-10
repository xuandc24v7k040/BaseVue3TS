import atomicHabitsCover from "@/assets/client/home/books/atomic-habits.svg";
import cayCamNgotCover from "@/assets/client/home/books/cay-cam-ngot-cua-toi.svg";
import dacNhanTamCover from "@/assets/client/home/books/dac-nhan-tam.svg";
import hanhTrinhCover from "@/assets/client/home/books/hanh-trinh-ve-phuong-dong.svg";
import khiHoiThoCover from "@/assets/client/home/books/khi-hoi-tho-hoa-thinh-khong.svg";
import muonKiepCover from "@/assets/client/home/books/muon-kiep-nhan-sinh.svg";
import nhaGiaKimCover from "@/assets/client/home/books/nha-gia-kim.svg";
import sapiensCover from "@/assets/client/home/books/sapiens.svg";
import tamLyHocVeTienCover from "@/assets/client/home/books/tam-ly-hoc-ve-tien.svg";
import thinkAgainCover from "@/assets/client/home/books/think-again.svg";

export type HomeCategoryIcon =
  | "book"
  | "chart"
  | "sprout"
  | "teddy"
  | "brain"
  | "atom"
  | "landmark"
  | "grid";

export interface HomeCategoryMock {
  id: string;
  name: string;
  icon: HomeCategoryIcon;
  href: string;
}

export interface HomeBookMock {
  id: string;
  title: string;
  author: string;
  currentPrice: number;
  originalPrice?: number;
  discountPercent?: number;
  cover: string;
  href: string;
  rank?: number;
}

export interface UpcomingBookMock {
  id: string;
  title: string;
  author: string;
  releaseDate: string;
  cover: string;
  href: string;
}

export const homeCategories: HomeCategoryMock[] = [
  {
    id: "literature",
    name: "Văn học",
    icon: "book",
    href: "/san-pham?category=van-hoc",
  },
  {
    id: "business",
    name: "Kinh tế",
    icon: "chart",
    href: "/san-pham?category=kinh-te",
  },
  {
    id: "life-skills",
    name: "Kỹ năng sống",
    icon: "sprout",
    href: "/san-pham?category=ky-nang-song",
  },
  {
    id: "children",
    name: "Thiếu nhi",
    icon: "teddy",
    href: "/san-pham?category=thieu-nhi",
  },
  {
    id: "psychology",
    name: "Tâm lý",
    icon: "brain",
    href: "/san-pham?category=tam-ly",
  },
  {
    id: "science",
    name: "Khoa học",
    icon: "atom",
    href: "/san-pham?category=khoa-hoc",
  },
  {
    id: "history",
    name: "Lịch sử",
    icon: "landmark",
    href: "/san-pham?category=lich-su",
  },
  { id: "all", name: "Xem tất cả", icon: "grid", href: "/san-pham" },
];

export const bestSellerBooks: HomeBookMock[] = [
  {
    id: "dac-nhan-tam",
    title: "Đắc Nhân Tâm",
    author: "Dale Carnegie",
    currentPrice: 79000,
    originalPrice: 119000,
    discountPercent: 34,
    cover: dacNhanTamCover,
    href: "/san-pham/dac-nhan-tam",
    rank: 1,
  },
  {
    id: "nha-gia-kim",
    title: "Nhà Giả Kim",
    author: "Paulo Coelho",
    currentPrice: 55000,
    originalPrice: 79000,
    discountPercent: 30,
    cover: nhaGiaKimCover,
    href: "/san-pham/nha-gia-kim",
    rank: 2,
  },
  {
    id: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    currentPrice: 119000,
    originalPrice: 169000,
    discountPercent: 30,
    cover: atomicHabitsCover,
    href: "/san-pham/atomic-habits",
    rank: 3,
  },
  {
    id: "sapiens",
    title: "Sapiens: Lược Sử Loài Người",
    author: "Yuval Noah Harari",
    currentPrice: 119000,
    originalPrice: 159000,
    discountPercent: 25,
    cover: sapiensCover,
    href: "/san-pham/sapiens",
    rank: 4,
  },
  {
    id: "think-again",
    title: "Think Again",
    author: "Adam Grant",
    currentPrice: 99000,
    originalPrice: 139000,
    discountPercent: 29,
    cover: thinkAgainCover,
    href: "/san-pham/think-again",
    rank: 5,
  },
];

export const newBooks: HomeBookMock[] = [
  {
    id: "tam-ly-hoc-ve-tien",
    title: "Tâm Lý Học Về Tiền",
    author: "Morgan Housel",
    currentPrice: 108000,
    originalPrice: 159000,
    discountPercent: 32,
    cover: tamLyHocVeTienCover,
    href: "/san-pham/tam-ly-hoc-ve-tien",
  },
  {
    id: "hanh-trinh-ve-phuong-dong",
    title: "Hành Trình Về Phương Đông",
    author: "Baird T. Spalding",
    currentPrice: 86000,
    originalPrice: 118000,
    discountPercent: 27,
    cover: hanhTrinhCover,
    href: "/san-pham/hanh-trinh-ve-phuong-dong",
  },
  {
    id: "muon-kiep-nhan-sinh",
    title: "Muôn Kiếp Nhân Sinh",
    author: "Nguyên Phong",
    currentPrice: 128000,
    originalPrice: 168000,
    discountPercent: 24,
    cover: muonKiepCover,
    href: "/san-pham/muon-kiep-nhan-sinh",
  },
  {
    id: "cay-cam-ngot-cua-toi",
    title: "Cây Cam Ngọt Của Tôi",
    author: "José Mauro",
    currentPrice: 76000,
    originalPrice: 108000,
    discountPercent: 30,
    cover: cayCamNgotCover,
    href: "/san-pham/cay-cam-ngot-cua-toi",
  },
  {
    id: "khi-hoi-tho-hoa-thinh-khong",
    title: "Khi Hơi Thở Hóa Thinh Không",
    author: "Paul Kalanithi",
    currentPrice: 92000,
    originalPrice: 129000,
    discountPercent: 29,
    cover: khiHoiThoCover,
    href: "/san-pham/khi-hoi-tho-hoa-thinh-khong",
  },
];

export const upcomingBooks: UpcomingBookMock[] = [
  {
    id: "upcoming-1",
    title: "Hành Trình Về Phương Đông",
    author: "Baird T. Spalding",
    releaseDate: "15.08.2026",
    cover: hanhTrinhCover,
    href: "/san-pham/hanh-trinh-ve-phuong-dong",
  },
  {
    id: "upcoming-2",
    title: "Muôn Kiếp Nhân Sinh",
    author: "Nguyên Phong",
    releaseDate: "20.08.2026",
    cover: muonKiepCover,
    href: "/san-pham/muon-kiep-nhan-sinh",
  },
  {
    id: "upcoming-3",
    title: "Khi Hơi Thở Hóa Thinh Không",
    author: "Paul Kalanithi",
    releaseDate: "25.08.2026",
    cover: khiHoiThoCover,
    href: "/san-pham/khi-hoi-tho-hoa-thinh-khong",
  },
];
