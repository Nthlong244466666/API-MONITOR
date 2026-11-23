# API Monitor v3.1 — Web Push Notifications (Backend + Frontend)

## Mục tiêu & giới hạn

- Gửi thông báo hệ thống khi Incident OPENED và RESOLVED, ngay cả khi tab đã đóng nếu trình duyệt/hệ điều hành hỗ trợ background Push.
- Miễn phí: dùng Browser Push API + VAPID + `web-push`, không dùng SMS, email, Firebase paid hay Gemini cho bước gửi.
- Backend/Scheduler/PostgreSQL phải luôn hoạt động và laptop không Sleep. Khi click notification để mở trang chi tiết trên `localhost:5173`, Frontend Vite cũng phải đang chạy (hoặc bản build được phục vụ tại cùng origin). Push còn phụ thuộc kết nối mạng, quyền trình duyệt, chính sách Windows và dịch vụ push bên ngoài; không cam kết thời gian tức thì tuyệt đối.
- **Đừng đăng xuất** để test đóng tab: đăng xuất sẽ tự hủy subscription để bảo vệ tài khoản trên máy dùng chung.
- Chrome `http://localhost:5173` thường hoạt động vì localhost là secure context. Truy cập `http://192.168.x.x` từ điện thoại thường KHÔNG hoạt động (cần HTTPS); iOS yêu cầu Home Screen web app theo hỗ trợ nền tảng.

## Các file trong ZIP

**Sửa**:
- `backend/src/app.js` — thêm `/api/v1/push` và khởi động worker
- `backend/src/services/monitorRunner.service.js` — queue PushDelivery cùng transaction tạo Notification, không gọi mạng trong transaction
- `frontend/src/pages/Notifications.jsx` — thêm PushSettings
- `frontend/src/contexts/AuthContext.jsx` — hủy subscription khi sign out

**Thêm**:
- `backend/src/lib/pushRules.js`, `validators/push.validator.js`, `services/pushSubscription.service.js`, `controllers/push.controller.js`, `routes/push.routes.js`, `jobs/pushDelivery.js`
- `backend/scripts/apply-push-schema.mjs`, `backend/test/pushRules.test.js`, `backend/.env.push.example`
- `frontend/src/services/pushApi.js`, `services/pushClient.js`, `components/push/PushSettings.jsx`, `frontend/public/push-sw.js`

**Không sửa** `notification.service.js`: hệ thống Notification v2.1 đang PASS được giữ nguyên. **Không sửa** Prisma schema bằng ghi đè: script vá thêm hai model.

## Cài đặt từng bước (máy Windows 11)

### 1. Sao lưu và copy

1. Dừng Backend & Frontend, sao lưu code project và PostgreSQL.
2. Giải nén ZIP. Copy **gộp** hai thư mục `backend/` và `frontend/` vào `D:\wordspace\Project API Monitor\`, ghi đè đúng 4 file liệt kê ở trên; KHÔNG xóa các thư mục có sẵn.
3. Đừng copy đè file `.env` thực tế. File `.env.push.example` chỉ là mẫu.

### 2. Cài dependency, tạo VAPID một lần

```powershell
cd "D:\wordspace\Project API Monitor\backend"
npm install web-push
npx web-push generate-vapid-keys --json
```

Lệnh sẽ in một cặp `publicKey` và `privateKey`; giữ private key bí mật, **không gửi vào chat**. Chỉ tạo một cặp cho hệ thống này; thay key sau khi user đã đăng ký sẽ yêu cầu bật Push lại.

Thêm **ba dòng** này vào `backend/.env` hiện có (giữ tất cả cấu hình cũ):

```dotenv
VAPID_PUBLIC_KEY=KEY_PUBLIC_VUA_TAO
VAPID_PRIVATE_KEY=KEY_PRIVATE_VUA_TAO
VAPID_SUBJECT=mailto:email-cua-may@example.com
```

`VAPID_SUBJECT` cần là địa chỉ liên hệ dạng `mailto:` hợp lệ của mày. Không ghi `https://localhost` vào subject.

### 3. Prisma migration (giữ data)

```powershell
cd "D:\wordspace\Project API Monitor\backend"
node scripts/apply-push-schema.mjs
npx prisma validate
npx prisma migrate dev --name web_push_v31
npx prisma generate
```

Script lưu `prisma/schema.prisma.before-push-v31.bak` và bổ sung `PushSubscription`, `PushDelivery` + enum `PushDeliveryStatus`, quan hệ `User` và `Notification`. Chạy lại script không nhân đôi model.

**Nếu Prisma yêu cầu reset DB: KHÔNG đồng ý.** Gửi nguyên log để xử lý an toàn. Chỉ chạy migration khi AI v3.0 đã migrate và chạy bình thường.

### 4. Chạy và bật Push

```powershell
cd "D:\wordspace\Project API Monitor\backend"
node --test test/pushRules.test.js
npm run dev
```

Terminal khác:

```powershell
cd "D:\wordspace\Project API Monitor\frontend"
npm run build
npm run dev
```

Mở Chrome `http://localhost:5173/notifications`, đăng nhập. Ở đầu trang, bấm **Bật cảnh báo Push** -> **Allow** khi Chrome hỏi quyền. Badge chuyển **Đã bật**.

Không nên mở giao diện bằng `http://127.0.0.1:5173` rồi lúc khác `localhost:5173`, vì Push subscription gắn với **origin** (domain + port).

## Hợp đồng API mới

Mọi API cần JWT và trả `{success:true,data}` theo apiFetch đang dùng.

```http
GET    /api/v1/push/vapid-public-key
POST   /api/v1/push/subscriptions
DELETE /api/v1/push/subscriptions
```

Payload đăng ký gửi từ browser `PushSubscription.toJSON()`: `{endpoint,expirationTime,keys:{p256dh,auth}}`. Payload xóa: `{endpoint}`. Server chỉ nhận push endpoints thuộc FCM, Firefox Push hoặc Apple Push và từ chối URL tùy ý/localhost nhằm giảm nguy cơ SSRF. Mỗi tài khoản tối đa 10 subscription.

## 14 test case tích hợp (PUSH31)

| ID | Cách làm | PASS khi |
|---|---|---|
| PUSH31-01 | Chạy `node --test test/pushRules.test.js` | 12/12 PASS |
| PUSH31-02 | Chạy Prisma validate, migrate, generate | `PushSubscription`, `PushDelivery` có trong Prisma Studio |
| PUSH31-03 | Chạy `npm run build` & `npm run dev` cho Backend | Build OK, không báo `PUSH_NOT_CONFIGURED` |
| PUSH31-04 | Mở `/notifications`, nhấn **Bật cảnh báo Push**, cho phép Chrome | UI “Đã bật”, Prisma Studio có `PushSubscription` |
| PUSH31-05 | Tạo Monitor từ GET `/status/200`, để status UP | Không có thông báo DOWN giả |
| PUSH31-06 | Đổi URL sang `https://httpbin.org/status/503`, chờ failure threshold | Incident OPEN, Notification OPENED, Push hiện ở góc Windows |
| PUSH31-07 | Đóng TAB website sau khi bật Push, giữ Chrome/system hỗ trợ Push & Backend chạy; tạo một sự cố mới | Có thông báo desktop dù tab đóng |
| PUSH31-08 | Click Push mới đến | Mở `/incidents/<id>`, yêu cầu đăng nhập nếu chưa có session |
| PUSH31-09 | Đổi URL lại `/status/200`, chờ recovery threshold | Incident RESOLVED và Push phục hồi |
| PUSH31-10 | Giữ Monitor ở DOWN ít nhất 3 lần check nữa | Không phát Push OPENED trùng cho cùng Incident |
| PUSH31-11 | Bấm **Tắt cảnh báo** trong Notifications, sau đó tạo một Incident mới | `PushSubscription` bị xóa, không phát Push, In-app Notification vẫn có |
| PUSH31-12 | Bật lại, **Sign out** | Subscription được hủy, không tiếp tục nhận cảnh báo tài khoản cũ (nếu mạng hoạt động) |
| PUSH31-13 | Test sai `endpoint` dùng Thunder Client với JWT | HTTP 400 `INVALID_PUSH_SUBSCRIPTION` |
| PUSH31-14 | Tắt Backend 30 giây sau khi có queue PENDING; khởi động lại và quan sát | Job còn trong DB, worker xử lý lại. Kiểm tra `PushDelivery.status` |

**Cách tạo sự cố mới ở PUSH31-07:** Monitor đang DOWN sẽ không phát OPENED lần nữa. Trước tiên phục hồi UP, sau đó đổi sang 503 để tạo Incident mới. Có thể dùng Monitor thứ hai để tránh ảnh hưởng test cũ.

### SQL / Prisma Studio chẩn đoán

Dùng `npx prisma studio`, xem:
- `PushSubscription`: dòng subscription của thiết bị đã đăng ký
- `PushDelivery`: trạng thái `PENDING` → `PROCESSING` → `SENT`; lỗi `FAILED` xem `lastError` (chỉ lưu mã trạng thái không lưu secrets)
- `Notification`: OPENED/RESOLVED gắn với Incident

`SENT` nghĩa là dịch vụ Push đã chấp nhận thông báo, **không đảm bảo** Windows/trình duyệt đã hiển thị. Nếu Windows bật Do Not Disturb / Chrome chặn notifications, có thể nhận được ở Notification Center thay vì toast.

### Các giới hạn thực tế

1. Backend phải chạy. Nếu laptop Sleep/tắt, không có sự kiện Monitor/Push.
2. Mỗi browser/device phải tự bật thông báo. Nếu xóa site data, cần đăng ký lại.
3. Khi đóng tab, một số trình duyệt có thể nhận Push; khi **thoát hẳn Chrome**, hành vi tùy phiên bản, hệ điều hành và background mode, cần test riêng.
4. Không gửi API URL, request headers, body, secrets hoặc kết quả Gemini ra Push; chỉ thông báo sự cố và link Incident.
5. Worker thực thi retry tối đa 4 lượt, sử dụng hàng đợi PostgreSQL. Nếu chết tiến trình sau khi dịch vụ Push chấp nhận nhưng trước khi ghi SENT, có thể gửi lại (at-least-once); notification `tag` giúp trình duyệt thay thế bản trước thay vì hiện nhiều toast trong phần lớn trường hợp.
6. Không gửi lại thông báo cũ cho người đăng ký mới; PushDelivery chỉ tạo cùng transaction với Notification khi subscription đã bật.
7. Nên dùng Chrome localhost để demo; chưa kiểm thử trên iOS Safari. Trên iPhone nhận Web Push thường đòi hỏi app được thêm vào Home Screen và host HTTPS thật.

## Regression cần kiểm tra

Monitoring UP/DOWN; Notification In-app; Incident OPEN/RESOLVED; Gemini Analyze; Analytics Dashboard; auth/logout; lịch sử; Worker restart. Cơ chế Push độc lập với việc gọi AI, nên không làm phát sinh phí Gemini.
