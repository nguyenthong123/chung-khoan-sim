# Vifun - Hệ thống mô phỏng giao dịch chứng khoán

Dự án này là một ứng dụng web hiện đại giúp người dùng thực hành giao dịch chứng khoán Việt Nam với dữ liệu thời gian thực.

## 🚀 Tính năng nổi bật

1.  **Dữ liệu thời gian thực**: Thay thế hàm `IMPORTXML` chậm chạp bằng cách gọi trực tiếp API JSON của VNDirect từ Google Apps Script.
2.  **Giao diện Premium**: Thiết kế Dark Mode chuyên nghiệp, tối giản theo phong cách Fintech hiện đại.
3.  **Lệnh LO/MP**: Hỗ trợ đặt lệnh giới hạn và lệnh thị trường với tính toán số tiền dự tính tức thì.
4.  **Quản lý danh mục**: Theo dõi lãi/lỗ (P&L) dựa trên giá vốn bình quân và giá thị trường hiện tại.
5.  **Ví ảo**: Nạp tiền không giới hạn để trải nghiệm các chiến thuật đầu tư.

## 🛠 Hướng dẫn cài đặt Backend (Google Apps Script)

Để ứng dụng có thể lưu trữ dữ liệu và lấy giá online, bạn cần thực hiện các bước sau:

1.  Truy cập vào [Google Sheets](https://docs.google.com/spreadsheets/d/11ndIWy9yteJQFuWO4rssp3_8YJ-rYZgpJ1cLuLVQuy8/edit).
2.  Mở **Tiện ích mở rộng** > **Apps Script**.
3.  Copy nội dung file `GAS/backend.gs` vào trình soạn thảo.
4.  Nhấn **Triển khai** > **Nội dung triển khai mới**.
5.  Chọn loại là **Ứng dụng Web**.
    *   Người có quyền truy cập: **Bất kỳ ai (Anyone)**.
6.  Copy URL nhận được (ví dụ: `https://script.google.com/macros/s/.../exec`).
7.  Mở file `src/api.js` trong code Frontend và dán URL vào biến `GAS_URL`.

## 💻 Chạy Frontend

```bash
npm install
npm run dev
```

## 📈 Cách lấy dữ liệu giá online (Giải đáp câu hỏi của bạn)

Trong file `GAS/backend.gs`, tôi đã sử dụng hàm `getStockData(symbol)`. Hàm này gọi tới:
`https://price-api.vndirect.com.vn/web/stock-prices?symbols=...`

Đây là API JSON chính thức từ bảng giá VNDirect, nó trả về dữ liệu nhanh và chính xác hơn rất nhiều so với việc dùng `IMPORTXML`. Bạn không cần phải copy link từng mã nữa, chỉ cần truyền mã (ví dụ: HPG, TCB) vào hàm là xong.
