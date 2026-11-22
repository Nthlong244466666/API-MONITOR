# API Monitor v3.0 — Gemini Free Tier (Backend + Frontend)

## 0. Kết quả và giới hạn

- Đã chạy **18/18 unit tests** về bảo vệ metadata và chuẩn hóa AI output; đã kiểm tra `node --check` các file JS Backend. Đã thử script vá Prisma schema trên schema mẫu.
- **Chưa chạy integration** với PostgreSQL, Prisma CLI, Vite của máy bạn hoặc gọi Gemini API thật (không có API key). Do đó chưa thể nhận xét AI trả lời đúng với sự cố thực tế.
- Mặc định AI chạy **on-demand**, tối đa **5 phân tích mỗi Incident**, **ít nhất 60 giây** giữa hai lần, ngăn phân tích đồng thời cùng một Incident trong cùng process. Đây là mức giới hạn phục vụ demo, không thay thế distributed rate limit/billing guard khi triển khai production.
- Context chỉ gửi status, reason (mã cho phép), thời điểm, thông số monitoring và tối đa 12 MonitorCheck: HTTP code, latency, boolean, error code whitelist. **Không gửi URL, tên Monitor, headers, body, tokens, request payload**. Nội dung AI là giả thuyết và hướng chẩn đoán.

## 1. File trong ZIP

```text
backend/
  .env.ai.example                         MỚI (ví dụ, không chứa key thật)
  scripts/apply-ai-schema.mjs             MỚI (thêm model vào schema hiện có)
  src/lib/aiDiagnosis.js                 MỚI
  src/services/aiProvider.service.js     MỚI
  src/services/incidentAnalysis.service.js MỚI
  src/validators/aiAnalysis.validator.js MỚI
  src/controllers/aiAnalysis.controller.js MỚI
  src/routes/incident.routes.js          SỬA
  test/aiDiagnosis.test.js               MỚI
frontend/
  src/pages/IncidentDetail.jsx           SỬA
  src/services/aiAnalysisApi.js           MỚI
  src/components/ai/AiDiagnosis.jsx       MỚI
  src/components/ai/IncidentAiPanel.jsx   MỚI
```

Các file còn lại không bị thay đổi. **Không copy nguyên thư mục `backend`/`frontend` đè lên dự án**; chỉ gộp các file được liệt kê. Sao lưu `incident.routes.js`, `IncidentDetail.jsx` và database trước.

## 2. Thiết lập Backend

**2.1.** Giải nén ZIP, copy thư mục `backend/src`, `backend/scripts`, `backend/test` vào thư mục Backend trong dự án. Copy `.env.ai.example` chỉ để tham khảo; **không thay file `.env` hiện có**.

**2.2.** Trong `backend/.env` hiện có, bổ sung các dòng (thay `YOUR_GEMINI_API_KEY` bằng key Gemini Free Tier của bạn, không gửi key vào chat):

```dotenv
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
GEMINI_MODEL=gemini-2.5-flash
AI_TIMEOUT_MS=25000
```

Chọn Google AI Studio project ở **Free Tier**, KHÔNG liên kết billing/nâng cấp Paid Tier. Kiểm tra model và quota hiện có trên AI Studio trước khi chạy. Key không tự chứng minh project thuộc Free Tier; Free Tier có quota và có thể không khả dụng với một số account/khu vực/model. Nếu bị 403/404/429, xem bảng lỗi bên dưới thay vì nâng cấp trả phí. Đừng commit `.env` lên Git. Khởi động lại Backend sau khi sửa `.env`.

**2.3.** DỪNG Backend (Ctrl+C). Mở PowerShell terminal ở `D:\wordspace\Project API Monitor\backend`:

```powershell
cd "D:\wordspace\Project API Monitor\backend"
node scripts/apply-ai-schema.mjs
npx prisma validate
npx prisma migrate dev --name ai_incident_analysis
npx prisma generate
node --test test/aiDiagnosis.test.js test/geminiProvider.test.js
npm run dev
```

Script schema chỉ thêm quan hệ `Incident.analyses` và model `IncidentAnalysis` vào **schema hiện tại**; không thay các model khác. Script tạo backup `prisma/schema.prisma.before-ai-v3.bak`. Lệnh `migrate dev` sẽ tạo migration PostgreSQL; **kiểm tra trạng thái migration và backup DB** trước khi chạy (không dùng `db push --force-reset`). Nếu Prisma báo drift hoặc yêu cầu reset DB, **KHÔNG xác nhận reset**, giữ nguyên database và gửi lỗi.

Nếu lệnh `node scripts/apply-ai-schema.mjs` báo đã tồn tại `IncidentAnalysis`, có thể chạy validate/migration bình thường.

Nếu API trả `AI_NOT_CONFIGURED`, kiểm tra GEMINI_API_KEY tại Backend và khởi động lại server; không cần cung cấp key cho Frontend.

## 3. Thiết lập Frontend

Copy gộp các file `frontend/src` từ ZIP vào `D:\wordspace\Project API Monitor\frontend\src`, sao lưu `src/pages/IncidentDetail.jsx` trước.

```powershell
cd "D:\wordspace\Project API Monitor\frontend"
npm run build
npm run dev
```

Đăng nhập, mở `http://localhost:5173/incidents`, bấm một Incident → trang chi tiết có phần **AI Incident Analysis**. Nút **Analyze with AI** gọi Backend, **không lưu key vào Frontend**. Sau khi phân tích thành công, kết quả và lịch sử được hiển thị.

## 4. API mới

Cần Bearer JWT từ API Monitor; Response do `apiFetch` tự unwrap `{success:true,data}`.

| Method | URL | Response |
|---|---|---|
| POST | `/api/v1/incidents/:incidentId/analyze` | 201, `{id,incidentId,model,diagnosis,createdAt}` |
| GET | `/api/v1/incidents/:incidentId/analyses?limit=10` | 200, `{items,hasMore,nextCursor}` |
| GET | `/api/v1/incidents/:incidentId/analyses/:analysisId` | 200, một phân tích |

`diagnosis` gồm `summary`, `confidence`, `possibleCauses`, `recommendedActions`, `evidence`, `limitations`. Các trường văn bản là thông tin AI đưa ra, không phải kết luận hệ thống đã xác thực.

Lỗi dự kiến: `INCIDENT_NOT_FOUND`/`AI_RESOURCE_NOT_FOUND` (404), `AI_NOT_CONFIGURED` (503), `AI_COOLDOWN`/`AI_LIMIT_REACHED` (429), `AI_ANALYSIS_IN_PROGRESS` (409), `AI_RATE_LIMITED` (429), `AI_ACCESS_DENIED` (502), `AI_MODEL_UNAVAILABLE` (502), `AI_PROVIDER_ERROR`/`AI_PROVIDER_UNAVAILABLE`/`AI_RESPONSE_INVALID` (502), `VALIDATION_ERROR` (400). Lỗi nhà cung cấp không phản hồi thẳng raw response.

## 5. Bộ test tổng v3.0

**Chuẩn bị:** Backend + Frontend + PostgreSQL chạy, đã migrate/generate, có 1 Incident (trạng thái OPEN hoặc RESOLVED), đã đăng nhập. Gọi AI dùng hạn mức Free Tier nếu project thực sự ở cấp miễn phí; KHÔNG bật billing. Kiểm tra tối thiểu 1 phân tích thành công, không cần cố gọi đủ 5 lần chỉ để kiểm tra hạn mức.

| ID | Thao tác chính | PASS khi |
|---|---|---|
| AI30-01 | `npx prisma validate`, `migrate dev`, `generate` | Database có bảng `incident_analyses`, không mất bảng cũ |
| AI30-02 | `node --test test/aiDiagnosis.test.js test/geminiProvider.test.js` | 18/18 PASS (trong đó có provider mock tests) |
| AI30-03 | `npm run build`, mở Incident Detail | Build thành công, panel hiện và các trường Incident v2.1 giữ nguyên |
| AI30-04 | Truy cập Incident đã có, chưa phân tích | Có empty state lịch sử |
| AI30-05 | Bấm **Analyze with AI** (tài khoản có API key/hạn mức) | 201, xuất hiện `summary` và bước xử lý rõ ràng |
| AI30-06 | Sau khi tạo, reload Incident Detail | Lịch sử còn lưu trong PostgreSQL |
| AI30-07 | Click kết quả trong lịch sử | Chuyển đúng nội dung phân tích tương ứng |
| AI30-08 | Thunder Client GET `.../incidents/INCIDENT_ID/analyses?limit=1` | 200, cấu trúc `{items,hasMore,nextCursor}` |
| AI30-09 | Thunder Client GET `.../incidents/INCIDENT_ID/analyses/ANALYSIS_ID` | ID và Incident ID chính xác |
| AI30-10 | Bấm lại ngay dưới 60 giây | HTTP 429 `AI_COOLDOWN`, không tiêu thêm lượt gọi Gemini |
| AI30-11 | Đổi tạm GEMINI_API_KEY thành trống, restart Backend, bấm phân tích cho Incident chưa có lịch sử | 503 `AI_NOT_CONFIGURED`; khôi phục key sau test |
| AI30-12 | GET `/api/v1/incidents/INVALID_UUID/analyses` | 404, không lộ dữ liệu |
| AI30-13 | GET `/api/v1/incidents/INCIDENT_ID/analyses?limit=999` | 400 `VALIDATION_ERROR` |
| AI30-14 | Gửi request thiếu JWT tới API AI | 401, không lấy được lịch sử |
| AI30-15 | Prisma Studio → bảng `IncidentAnalysis` → xem diagnosis | Không có token, URL, header, body, credentials trong **input metadata lưu vào history** (lưu ý đầu ra AI là văn bản tự sinh) |
| AI30-16 | Mở app trên màn hình 375px (Chrome DevTools Ctrl+Shift+M) | Panel, các list và nút không vỡ bố cục |
| AI30-17 | Regression: Monitor UP/DOWN, Incident OPEN/RESOLVED, Notifications, Analytics | Không chức năng cũ nào hỏng |
| AI30-18 | Tài khoản khác truy cập Incident/analysis của chủ sở hữu | 404; có thể tạm hoãn cho demo nhưng không được coi PASS |

**Cách quan sát request:** Chrome F12 → Network → Fetch/XHR → nhấn Analyze → chọn `/api/v1/incidents/<ID>/analyze` → Response. **Cách quan sát DB:** ở terminal Backend chạy `npx prisma studio` rồi xem `IncidentAnalysis`. API key chỉ nằm trong `.env` và request Backend → Gemini, **không có trong DevTools Network của Frontend**.

**Kịch bản demo cuối cùng:** API 200 → đổi Request Studio sang 503 → Monitor chuyển DOWN → Incident OPEN → Notification OPENED → mở Incident Detail và bấm Analyze with AI → AI phân tích 503, gợi ý kiểm tra log/upstream → phục hồi URL 200 → Incident RESOLVED. Nếu đã phân tích Incident, phần History vẫn xem được sau khi phục hồi.

## 6. Lưu ý trước khi đưa lên internet

- Giới hạn hiện dùng `Set` trong một Node process, không chống đồng thời nhiều replica. Cần dùng DB lock/job queue/limits theo user và billing quotas nếu triển khai công khai.
- Chỉ dùng Gemini Free Tier, không bật billing. Nếu sau này đổi sang trả phí, cần rate limit và budget cap. Giữ key ở Backend, không log key.
- Phân tích chỉ theo metadata; không phải log ứng dụng nên AI **không thể xác định chắc root cause**. Không tự sửa code hay chạy lệnh.
- Khi xóa Monitor thì Incident và analyses sẽ cascade theo schema hiện hành.
- Nếu có lỗi migration, không reset DB để thử. Kiểm tra và sửa migration an toàn trước.


## 6. Lưu ý riêng cho bản Gemini Free

- File ZIP này **đã thay** `backend/src/services/aiProvider.service.js` từ OpenAI Responses API sang Google Gemini `generateContent` REST, và cập nhật `.env.ai.example`. Không cần cài thư viện npm mới. Phần còn lại (schema, backend routes, frontend) giữ nguyên so với gói AI v3.0.
- Chỉ thêm cấu hình `GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_TIMEOUT_MS` vào file **`backend/.env` đang có**. Không tạo `.env` thứ hai, không copy đè `.env`, không gửi key cho người khác.
- **Tạo project Free Tier chưa gắn thanh toán** trên https://aistudio.google.com/apikey . Model `gemini-2.5-flash` có mức Free Tier được ghi trong bảng giá Google, nhưng tình trạng model/quota thực tế tùy project; tài khoản mới có thể bị 404 hoặc 403. Không có failover tự động sang dịch vụ tính phí.
- Nếu model mặc định không dùng được, kiểm tra model Free Tier được cấp trong Google AI Studio rồi đổi `GEMINI_MODEL` trong `.env` (không sửa source).
- Lỗi `AI_RATE_LIMITED` nghĩa là quota đã hết: dừng thử, chờ quota reset, **không nâng cấp Paid Tier**. `AI_MODEL_UNAVAILABLE` là model không khả dụng với project; `AI_ACCESS_DENIED` thường liên quan key/quyền/Free Tier.
- **Không thể đảm bảo 0đ chỉ bằng code** nếu project được nâng cấp billing về sau. Để tránh phát sinh phí, không bật billing và chỉ sử dụng project Free Tier.
- Tài liệu chính thức về Free Tier: https://ai.google.dev/gemini-api/docs/pricing . Google cho biết nội dung Free Tier có thể được sử dụng để cải thiện sản phẩm; hệ thống chỉ truyền metadata đã lọc và không gửi dữ liệu nhạy cảm.
- Test provider không cần mạng và không tiêu quota: `node --test test/geminiProvider.test.js`. Test tích hợp AI thật vẫn phải chạy với key chính chủ.
