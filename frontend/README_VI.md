# API Monitor — Frontend v1.4: Assertions & Execution History

## Phạm vi

Đây là bản cập nhật **Frontend** cho API Monitor đã có Backend v1.4 hoạt động và đã PASS 13/13 test tích hợp. Không cài lại Backend, không migrate Prisma, không cài thêm dependency.

Các file **SỬA**:

- `frontend/src/pages/RequestStudio.jsx`: bổ sung hai tab Assertions và History, cập nhật History sau Send, cảnh báo GET/HEAD có Body.
- `frontend/src/services/requestApi.js`: kết nối đúng 6 endpoint Assertions/History của Backend v1.4.

Các file **MỚI**:

- `frontend/src/components/requests/AssertionPanel.jsx`: tạo/sửa/bật tắt/xóa Assertions.
- `frontend/src/components/requests/assertionPayload.js`: kiểm tra cấu hình assertions trước khi gọi API.
- `frontend/src/components/requests/ExecutionHistoryPanel.jsx`: phân trang bằng cursor, bộ lọc PASS/FAIL, chi tiết History.

Các file **test** (chỉ dùng để kiểm tra cục bộ, không phải code frontend):

- `tests/request-api.test.mjs` (bộ test cũ)
- `tests/request-v14.test.mjs` (bộ test mới)

`RequestTable.jsx`, `App.jsx`, `AuthContext.jsx`, `ProjectRequests.jsx`, `Requests.jsx`, `RequestForm.jsx` và toàn bộ Backend **KHÔNG ĐỔI**.

## Cài đặt

1. Sao lưu các file Frontend hiện tại trước khi cập nhật.
2. Giải nén ZIP. Chép đúng **5 file** bên dưới `frontend/src/` vào thư mục `D:\wordspace\Project API Monitor\frontend\src\` tương ứng, giữ nguyên cấu trúc thư mục.
3. Đảm bảo Backend v1.4 đang chạy ở terminal Backend; Frontend đang kết nối đúng Backend.
4. Trong terminal Frontend chạy:

```powershell
cd "D:\wordspace\Project API Monitor\frontend"
npm run build
npm run dev
```

5. Mở `http://localhost:5173` → Login → API Requests → Workspace → Project → Open API Library → nhấn **Studio** ở Request `Execution Test`.

### Unit tests (tùy chọn)

Các test được đặt trong thư mục `tests/` cạnh thư mục `frontend/` trong ZIP. Chạy từ thư mục **giải nén ZIP**:

```powershell
node --test tests/request-api.test.mjs tests/request-v14.test.mjs
```

Tổng cộng 12 bài test helper/validation đã PASS trong môi trường tạo mã. Chúng không thay thế `npm run build` hoặc các kiểm thử tích hợp dưới đây.

## Nguyên tắc quan trọng

- `POST /execute` chỉ chạy Request đã lưu. Nếu sửa URL/Method/Headers/Body, bấm **Save Changes** trước **Send**.
- Cấu hình Assertions được lưu riêng trong tab **Assertions**. Không cần Save Changes ở đầu trang sau khi thêm/sửa assertion.
- JSON Path dùng dạng `id` hoặc `data.id`, không hỗ trợ `data[0].id`.
- JSON EQ Expected phải nhập như **giá trị JSON**: `true`, `123`, hoặc `"hello"` (có dấu nháy kép để biểu diễn chuỗi).
- STATUS chỉ hỗ trợ EQ 100–599; LATENCY hỗ trợ LT/LTE 1–120000 ms; JSON hỗ trợ EXISTS/EQ.
- Không nhập API key hoặc password thật vào Assertion target/expectedValue; Backend hiện chưa mã hóa hai trường này.
- History được ẩn response body và JSON secrets theo Backend. `HTTP 404` vẫn có thể `PASS` khi có `STATUS EQ 404`.

## Test case Frontend v1.4 — Tiếng Việt

### FE14-01 — Mở hai tab mới

- **Ở đâu**: API Monitor → API Requests → chọn Project → Open API Library → Studio `Execution Test`.
- **Làm gì**: Trong hàng tab dưới form URL, nhấn **Assertions**, rồi **History**.
- **Xem ở đâu**: Ngay vùng nội dung tab của Request Studio.
- **PASS**: Assertions có tiêu đề và nút Thêm, History có bộ lọc Kết quả và Số dòng/trang; không xuất hiện lỗi tải trang.

### FE14-02 — Tạo STATUS EQ 404

- **Ở đâu**: Studio → tab **Assertions** → **Thêm**.
- **Nhập**: Loại `HTTP Status`; toán tử `EQ`; giá trị kỳ vọng `404`; bật điều kiện.
- **Thao tác**: Bấm **Tạo assertion**.
- **Xem ở đâu**: Danh sách ngay trong tab Assertions (có thể bấm Tải lại).
- **PASS**: Có một dòng `STATUS EQ`, `Expected: 404`, trạng thái `Đang bật`.

### FE14-03 — Assertion làm HTTP 404 thành PASS

- **Ở đâu**: Studio → ô **Method** chọn GET; ô **URL** nhập `https://httpbin.org/status/404`. Tab Body → Remove saved body nếu cần.
- **Thao tác**: **Save Changes** (trên form Request) → **Send**.
- **Xem ở đâu**: Phần **Execution Result** dưới các tab.
- **PASS**: `HTTP 404` và `PASS` nếu tất cả assertion khác đang bật cũng đạt. Nếu có STATUS EQ 200 cũ, tắt nó trước.

### FE14-04 — Tắt/Bật Assertion

- **Ở đâu**: Studio → tab Assertions → dòng STATUS EQ 404.
- **Thao tác**: Bỏ tick **Bật** → quay lại nhấn **Send** với URL 404 → xem Execution Result; sau đó tick **Bật** lại → Send lại.
- **PASS**: Khi tắt và không có status assertion khác, HTTP 404 là FAIL. Khi bật lại, HTTP 404 là PASS (nếu các assertion khác không thất bại).

### FE14-05 — Sửa Assertion

- **Ở đâu**: Studio → Assertions → nhấn biểu tượng bút chì tại dòng STATUS.
- **Thao tác**: Sửa Expected từ `404` thành `200` → **Lưu thay đổi**. Sau đó ở form URL đầu trang, đổi thành `https://jsonplaceholder.typicode.com/todos/1`, Method GET, Body đã xóa → Save Changes → Send.
- **Xem ở đâu**: Tab Assertions xác nhận `Expected: 200`; Execution Result.
- **PASS**: Có STATUS EQ 200 trong danh sách và HTTP 200 PASS (nếu assertion khác cũng đạt).

### FE14-06 — Tạo LATENCY và JSON EXISTS

- **Ở đâu**: Studio → Assertions → **Thêm**.
- **Lần 1**: Loại `Response Time (ms)`, toán tử `LTE`, ngưỡng `120000` → Tạo.
- **Lần 2**: Loại `JSON Path`, toán tử `EXISTS`, JSON Path `id` → Tạo.
- **Thao tác**: Giữ URL JSONPlaceholder từ FE14-05 → Send.
- **Xem ở đâu**: Tab Assertions có LATENCY/JSON; Execution Result → Assertions.
- **PASS**: Cả hai điều kiện được đánh giá PASS.

### FE14-07 — Validation JSON EQ

- **Ở đâu**: Studio → Assertions → Thêm → loại `JSON Path`, toán tử `EQ`, JSON Path `completed`.
- **Lần 1**: Expected nhập `{"a":1}` → nhấn Tạo.
- **PASS phần A**: Form báo lỗi; assertion chưa được tạo.
- **Lần 2**: Expected nhập `false` (không dấu nháy) → nhấn Tạo.
- **PASS phần B**: Tạo thành công, danh sách có `JSON EQ completed`, Expected `false`. Để test sau không bị ảnh hưởng, có thể xóa assertion này.

### FE14-08 — Xóa Assertion

- **Ở đâu**: Studio → Assertions → dòng `JSON EQ completed` của FE14-07.
- **Thao tác**: Nhấn icon thùng rác → xác nhận hộp thoại trình duyệt.
- **Xem ở đâu**: Danh sách assertions sau khi tự tải lại.
- **PASS**: Dòng vừa xóa biến mất. Các assertion khác còn nguyên.

### FE14-09 — Xem History và bộ lọc

- **Ở đâu**: Studio → tab **History**.
- **Thao tác**: Bấm **Tải lại**; ở bộ lọc **Kết quả** lần lượt chọn `Tất cả`, `PASS`, `FAIL`.
- **Xem ở đâu**: Bảng History các cột Thời gian / HTTP / Latency / Kết quả / Chi tiết.
- **PASS**: Tất cả hiển thị lẫn PASS/FAIL khi có dữ liệu; lọc PASS chỉ hiện PASS, lọc FAIL chỉ hiện FAIL; không lẫn dữ liệu giữa các bộ lọc. Nếu chưa có FAIL, tạo một lượt Execute HTTP 404 trong lúc assertion STATUS EQ 200 đang bật.

### FE14-10 — Pagination (tải thêm)

- **Ở đâu**: Studio → History → Kết quả `Tất cả`, Số dòng/trang `5`.
- **Chuẩn bị**: Đảm bảo Request có ít nhất 6 executions; có thể bấm Send nhiều lần (đợi lượt trước xong).
- **Thao tác**: Nhấn **Tải lại** → kiểm tra số dòng đầu là 5 → bấm **Tải thêm lịch sử**.
- **PASS**: Bảng có nhiều hơn 5 dòng, các Execution ID không bị trùng (kiểm tra bằng nút Xem); nếu lịch sử đúng 6 lượt thì có 6 dòng. Backend quyết định thứ tự mới nhất trước.

### FE14-11 — Xem chi tiết History bảo mật

- **Ở đâu**: Studio → History → chọn một dòng → bấm **Xem**.
- **Xem ở đâu**: Khối **Execution Detail** ngay bên dưới bảng.
- **PASS**: Có Execution ID, ngày giờ, HTTP status, latency, kết quả, Assertions. Không lộ raw response body, Authorization, Cookie, JSON actual/expected thô.

### FE14-12 — Regression & Build

- **Ở đâu**: Studio → form URL/Method, tab Params/Headers/Body; API Library và terminal Frontend.
- **Thao tác**: GET `https://jsonplaceholder.typicode.com/todos/1`, Body đã xóa → Save → Send; tạo/sửa/xóa Request phụ trong Library; F5; chạy `npm run build`.
- **PASS**: Các chức năng v1.3 vẫn hoạt động, giữ đăng nhập sau F5, không lỗi build. Nếu GET còn Body, Studio hiển thị cảnh báo.

## Lưu ý về kiểm thử

- Nếu bấm Send không được, kiểm tra có chỉnh sửa chưa Save Changes không.
- Nếu GET trả `INVALID_REQUEST_CONFIG`, vào tab Body → chọn Remove saved body → Save Changes → Send.
- Nếu API trả `INVALID_TOKEN`, đăng nhập lại hoặc để session refresh, không dùng `Bearer DEMO_SECRET` để xác thực API Monitor.
- Nếu assertion STATUS EQ 200 và STATUS EQ 404 cùng bật, một lượt Execute không thể đạt cả hai; tắt/xóa điều kiện không dùng.
- Tránh lưu secrets thật vào tài khoản demo hoặc ảnh chụp màn hình.

## Giới hạn & nghiệm thu

- Đã chạy 12/12 unit tests helper/validation và kiểm tra cú pháp JSX/JS trong môi trường tạo mã.
- **Chưa chạy `npm run build` với node_modules của máy người dùng, chưa chạy browser integration với Backend/PostgreSQL thật.** Mày cần chạy 12 case FE14-01–FE14-12 trên máy mày rồi gửi PASS/FAIL.
- Lịch sử đang dùng tải thêm cursor (không dùng số trang vì Backend dùng cursor).
- Không có sửa đổi Database, không có migrate; không có Response Inspector body thô để tránh rò rỉ secrets.
