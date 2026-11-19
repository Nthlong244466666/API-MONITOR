export function validJsonPath(value) {
  return typeof value === "string" && value.length <= 256 && /^[a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*){0,15}$/.test(value);
}

export function assertionPayload(form) {
  const payload = { type: form.type, operator: form.operator, isEnabled: form.isEnabled };
  if (form.type === "STATUS" || form.type === "LATENCY") {
    const value = form.expectedText.trim();
    if (!/^\d+$/.test(value)) throw new Error("Giá trị kỳ vọng phải là số nguyên dương.");
    const n = Number(value);
    const min = form.type === "STATUS" ? 100 : 1;
    const max = form.type === "STATUS" ? 599 : 120000;
    if (!Number.isSafeInteger(n) || n < min || n > max) {
      throw new Error(`Giá trị kỳ vọng phải nằm trong khoảng ${min}–${max}.`);
    }
    payload.expectedValue = n;
  } else {
    if (!validJsonPath(form.target.trim())) throw new Error("JSON Path không hợp lệ. Ví dụ: data.id (tối đa 16 cấp).");
    payload.target = form.target.trim();
    if (form.operator === "EQ") {
      let value;
      try { value = JSON.parse(form.expectedText); }
      catch { throw new Error('JSON EQ cần một giá trị JSON hợp lệ, ví dụ: true, 123 hoặc "hello".'); }
      if (!(["string", "number", "boolean"].includes(typeof value)) ||
          (typeof value === "string" && value.length > 512) ||
          (typeof value === "number" && !Number.isFinite(value))) {
        throw new Error("JSON EQ chỉ hỗ trợ string tối đa 512 ký tự, số hữu hạn hoặc boolean; không hỗ trợ null, array, object.");
      }
      payload.expectedValue = value;
    }
  }
  return payload;
}

