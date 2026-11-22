import test from 'node:test';
import assert from 'node:assert/strict';
import { requestDiagnosis } from '../src/services/aiProvider.service.js';

const good = {
  summary: 'API trả 503', confidence: 'LOW', possibleCauses: ['Máy chủ quá tải'],
  recommendedActions: ['Kiểm tra log'], evidence: ['HTTP 503'], limitations: ['Không có log server'],
};
const originalFetch = globalThis.fetch;
const originalKey = process.env.GEMINI_API_KEY;
const originalModel = process.env.GEMINI_MODEL;
const context = { incident: { status: 'OPEN' }, checks: [{ statusCode: 503 }] };

test('Gemini provider: missing key', async () => {
  delete process.env.GEMINI_API_KEY;
  await assert.rejects(requestDiagnosis(context), { code: 'AI_NOT_CONFIGURED' });
});

test('Gemini provider: sends safe structured request and parses JSON', async () => {
  process.env.GEMINI_API_KEY = 'fake-key-for-local-tests';
  process.env.GEMINI_MODEL = 'gemini-2.5-flash';
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    assert.equal(options.headers['x-goog-api-key'], 'fake-key-for-local-tests');
    const request = JSON.parse(options.body);
    assert.equal(request.generationConfig.responseMimeType, 'application/json');
    assert.equal(request.generationConfig.responseJsonSchema.type, 'object');
    assert.deepEqual(JSON.parse(request.contents[0].parts[0].text), context);
    assert.ok(!JSON.stringify(request).includes('OPENAI_API_KEY'));
    return { ok: true, json: async () => ({ candidates: [{content:{parts:[{text:JSON.stringify(good)}]}}] }) };
  };
  const result = await requestDiagnosis(context);
  assert.equal(result.model, 'gemini-2.5-flash');
  assert.equal(result.diagnosis.summary, 'API trả 503');
});

test('Gemini provider: 429 becomes AI_RATE_LIMITED', async () => {
  globalThis.fetch = async () => ({ok:false,status:429});
  await assert.rejects(requestDiagnosis(context), {code:'AI_RATE_LIMITED'});
});

test('Gemini provider: forbidden is controlled error', async () => {
  globalThis.fetch = async () => ({ok:false,status:403});
  await assert.rejects(requestDiagnosis(context), {code:'AI_ACCESS_DENIED'});
});

test('Gemini provider: unavailable model is controlled error', async () => {
  globalThis.fetch = async () => ({ok:false,status:404});
  await assert.rejects(requestDiagnosis(context), {code:'AI_MODEL_UNAVAILABLE'});
});

test('Gemini provider: invalid JSON rejected', async () => {
  globalThis.fetch = async () => ({ok:true,json:async()=>({candidates:[{content:{parts:[{text:'bad'}]}}]})});
  await assert.rejects(requestDiagnosis(context), {code:'AI_RESPONSE_INVALID'});
});

test('Gemini provider: transport failure handled', async () => {
  globalThis.fetch = async () => { throw new Error('connection reset'); };
  await assert.rejects(requestDiagnosis(context), {code:'AI_PROVIDER_UNAVAILABLE'});
});

test('Gemini provider: model id validation', async () => {
  process.env.GEMINI_MODEL = '../evil';
  await assert.rejects(requestDiagnosis(context), {code:'AI_NOT_CONFIGURED'});
});

test.after(() => {
  globalThis.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL = originalModel;
});
