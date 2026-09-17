# CRM EDU – Student & Attendance Management System

Hệ thống quản trị Giáo dục & Điểm danh sinh viên **Tầng 1 (Student, Course, Enrollment & Attendance)** kết nối độc lập với **Frappe Framework** (Local hoặc Frappe Cloud) thông qua REST API chuẩn.

---

## 1. Tổng quan Dự án

CRM EDU là ứng dụng Single Page Application (SPA) viết bằng **React 18 + TypeScript + Vite + Tailwind CSS**, đóng vai trò là giao diện quản lý hiện đại cho hệ sinh thái Frappe Framework.

### Các nguyên tắc cốt lõi:
- **Frappe là Source of Truth**: Dữ liệu được lưu trữ và đồng bộ hóa qua 9 DocType chuẩn trên Frappe. Không tạo lại các DocType này.
- **Không hard-code thông tin nhạy cảm**: Hỗ trợ chuyển đổi linh hoạt giữa **Frappe Local** (`http://localhost:8000`) và **Frappe Cloud** (`https://yoursite.frappe.cloud`).
- **Giao diện Tiếng Việt toàn diện**: Tông màu chủ đạo **Trắng + Cam (#f97316)**, font chữ Inter / Be Vietnam Pro, trải nghiệm UX hiện đại.
- **Bảo mật**: API Secret được ẩn/mask trên giao diện (`••••••••`).

---

## 2. 9 DocType Tầng 1 Được Tích Hợp

| STT | DocType Frappe | Tên giao diện Tiếng Việt | Chức năng chính |
|:---:|:---|:---|:---|
| 1 | `Department` | Khoa / Bộ môn | Quản lý các khoa, viện, thông tin liên hệ và trưởng khoa |
| 2 | `Program` | Chương trình đào tạo | Các ngành đào tạo, trình độ (Cử nhân, Kỹ sư, Thạc sĩ), tổng tín chỉ |
| 3 | `Academic Term` | Học kỳ | Quản lý niên khóa, ngày bắt đầu/kết thúc, cờ học kỳ hiện tại |
| 4 | `Course` | Môn học | Quản lý môn học, số tín chỉ, môn tiên quyết, loại môn (Bắt buộc/Tự chọn) |
| 5 | `Student` | Sinh viên | Quản lý thông tin cá nhân, hồ sơ học vụ, trạng thái sinh viên |
| 6 | `Course Offering` | Lớp học phần | Quản lý lớp mở, giảng viên, phòng học, **Tổng số buổi (Total Slots)** |
| 7 | `Class Session` | Buổi học | **Nguồn dữ liệu thực tế** về buổi học (buổi số mấy, ngày giờ, ca học, phòng, chủ đề) |
| 8 | `Student Course Enrollment` | Đăng ký học phần | Ghi danh sinh viên vào lớp học phần, điểm kết thúc môn, tỷ lệ chuyên cần |
| 9 | `Student Attendance` | Điểm danh | Ghi nhận điểm danh từng buổi (Có mặt, Vắng, Đi trễ, Có phép, Nghỉ phép) |

---

## 3. Các Quy Tắc Nghiệp Vụ Quan Trọng

1. **Tổng số buổi (Total Slots)**: Chỉ thuộc `Course Offering`, tuyệt đối **không** nằm trong `Course`.
2. **Tổng giờ kế hoạch (Planned Hours)**: Tự động tính theo công thức `Planned Hours = Total Slots × Hours Per Slot`. Trường này chỉ đọc (read-only), không cho phép nhập tay.
3. **Session Generator (Tạo buổi học tự động)**: Cho phép tự động sinh đúng $N$ buổi học tương ứng với `total_slots` của lớp học phần theo lịch các thứ trong tuần.
4. **Điểm danh phải gắn với Buổi học (Class Session)**: Không cho phép tạo điểm danh độc lập mà không chọn buổi học. Khi chọn buổi học, hệ thống tự động điền các thông tin liên quan.
5. **Chống điểm danh trùng**: Mỗi cặp `Sinh viên + Buổi học` chỉ tồn tại tối đa một bản ghi điểm danh.
6. **Các chỉ số thống kê (GPA, Điểm danh %, Số buổi vắng)**: Được tính toán tự động từ dữ liệu điểm danh và đăng ký, hiển thị dạng KPI chỉ đọc.

---

## 4. Cài đặt & Khởi chạy Nhanh

### Yêu cầu môi trường:
- **Node.js**: Phiên bản 18+ (đã kiểm tra tương thích Node v24.21.0)
- **npm**: Phiên bản 9+ (đã kiểm tra tương thích npm v11.19.0)
- **Hệ điều hành**: Windows 10 / 11

### Cách 1: Khởi động bằng file Batch (Khuyên dùng)
- Nhấp đúp chuột vào file `start-crm-edu.bat` tại thư mục gốc `D:\CRM-EDU`.
- Script sẽ tự động kiểm tra Node.js, npm, cài đặt thư viện nếu cần và mở trình duyệt tại địa chỉ `http://localhost:5173`.
- Để dừng hệ thống: Nhấp đúp vào file `stop-crm-edu.bat`.

### Cách 2: Chạy thủ công bằng Terminal
```powershell
# Chuyển vào thư mục dự án
cd D:\CRM-EDU

# Cài đặt thư viện (nếu chưa có node_modules)
cmd /c "npm install"

# Chạy server phát triển
cmd /c "npm run dev"
```

---

## 5. Tài khoản Đăng nhập Mặc định

Trước khi vào hệ thống, ứng dụng yêu cầu đăng nhập:
- **Tên đăng nhập (Username)**: `admin`
- **Mật khẩu (Password)**: `admin`
- **Quyền**: Quản trị viên (Admin)

---

## 6. Hướng dẫn Kết nối Frappe (Local / Cloud)

1. Sau khi đăng nhập, truy cập menu **Hệ thống → Kết nối Frappe** (`/connection`).
2. Nhấn nút **"+ Thêm kết nối"** hoặc chỉnh sửa kết nối có sẵn.
3. Điền các thông số:
   - **Base URL**: `http://localhost:8000` (Local) hoặc `https://your-site.frappe.cloud` (Cloud).
   - **API Key** & **API Secret**: Lấy từ Frappe (vào trang quản trị Frappe → *User Administrator* → *API Access* → *Generate Keys*).
4. Nhấn **"Kiểm tra kết nối"**:
   - Nếu thành công: hiển thị biểu tượng xanh `● Đã kết nối`, phiên bản Frappe và độ trễ response.
   - Nhấn **"Kích hoạt"** để đặt làm instance làm việc hiện tại. Toàn bộ dữ liệu của hệ thống sẽ tự động chuyển sang đọc/ghi trên instance này.

---

## 7. Cấu trúc Thư mục

```
D:\CRM-EDU\
├── src\
│   ├── api\
│   │   ├── frappeClient.ts       # Axios client, xác thực token, profile manager, CRUD helpers
│   │   ├── doctypeConfig.ts      # Mapping tên DocType, nhãn tiếng Việt, màu sắc trạng thái
│   │   └── attendanceService.ts  # Tính toán thống kê điểm danh, kiểm tra trùng lặp
│   ├── components\
│   │   ├── ui\
│   │   │   ├── Toast.tsx         # Hệ thống thông báo toast nổi góc phải
│   │   │   ├── Modal.tsx         # Hộp thoại modal tái sử dụng
│   │   │   ├── ConfirmDialog.tsx # Hộp thoại xác nhận xóa/thao tác nguy hiểm
│   │   │   ├── EmptyState.tsx    # Giao diện khi chưa có dữ liệu
│   │   │   └── StatusBadge.tsx   # Huy hiệu trạng thái màu sắc chuẩn
│   │   ├── Header.tsx            # Thanh điều hướng trên cùng, chỉ báo kết nối Frappe, user menu
│   │   ├── Sidebar.tsx           # Thanh menu dọc phân nhóm, có thể thu gọn (collapsible)
│   │   └── Layout.tsx            # Bố cục trang bao bọc responsive
│   ├── context\
│   │   └── AuthContext.tsx       # Quản lý phiên đăng nhập cục bộ (admin / admin)
│   ├── hooks\
│   │   ├── useFetch.ts           # Hook gọi API có AbortController và cờ auto-refresh
│   │   └── useUtils.ts           # Debounce search, format date, currency
│   ├── pages\
│   │   ├── Login.tsx             # Giao diện đăng nhập hiện đại tone Trắng + Cam
│   │   ├── Dashboard.tsx         # Tổng quan KPI, biểu đồ Recharts, Top vắng, Buổi học sắp tới
│   │   ├── Connection.tsx        # Trình quản lý kết nối Frappe Local / Cloud, kiểm tra chẩn đoán
│   │   ├── StudentList.tsx       # Quản lý sinh viên, hồ sơ cá nhân, lịch sử chuyên cần
│   │   ├── Departments.tsx       # Quản lý Khoa / Bộ môn
│   │   ├── Programs.tsx          # Quản lý Chương trình đào tạo
│   │   ├── Terms.tsx             # Quản lý Học kỳ / Niên khóa
│   │   ├── Courses.tsx           # Quản lý Môn học & Tiên quyết
│   │   ├── Offerings.tsx         # Quản lý Lớp học phần & Trình sinh buổi học tự động
│   │   ├── Sessions.tsx          # Quản lý Buổi học chi tiết (Class Session)
│   │   ├── Enrollments.tsx       # Quản lý Đăng ký học phần của sinh viên
│   │   └── Attendance.tsx        # Điểm danh nhanh theo lớp & Lịch sử điểm danh
│   └── types\
│       └── models.ts             # Định nghĩa kiểu dữ liệu TypeScript cho 9 DocType
├── start-crm-edu.bat             # File khởi động nhanh hệ thống
├── stop-crm-edu.bat              # File tắt server nhanh
├── open-vscode.bat               # File mở nhanh trong VS Code
├── package.json
└── tailwind.config.js
```

---

## 8. Xử lý sự cố thường gặp (Troubleshooting)

- **Lỗi CORS khi gọi Frappe**:
  - Với Frappe Local: Trong file `sites/common_site_config.json`, thêm `"allow_cors": "*"` và khởi động lại bench.
- **Lỗi 401 Unauthorized**:
  - Kiểm tra xem API Key và API Secret đã được tạo đúng cho user có quyền (Administrator hoặc System Manager) hay chưa.
- **Lỗi cổng 5173 bị chiếm dụng**:
  - Chạy file `stop-crm-edu.bat` để tắt tiến trình nền đang chiếm cổng rồi mở lại.
