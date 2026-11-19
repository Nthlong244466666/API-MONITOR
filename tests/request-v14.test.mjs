import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = join(import.meta.dirname, '../frontend/src');
async function loadSource(path) {
  return import(`data:text/javascript,${encodeURIComponent(readFileSync(join(root, path), 'utf8'))}`);
}
const { createRequestApi } = await loadSource('services/requestApi.js');
const { assertionPayload, validJsonPath } = await loadSource('components/requests/assertionPayload.js');
const calls = [];
const api = createRequestApi(async (...args) => { calls.push(args); return {}; });
const base = '/workspaces/w/projects/p/requests/r';
test('Assertion routes point at correct nested request', async () => {
  await api.listAssertions('w','p','r'); assert.equal(calls.at(-1)[0],base+'/assertions');
  await api.createAssertion('w','p','r',{ type:'STATUS',operator:'EQ',expectedValue:200 });
  assert.deepEqual(calls.at(-1),[base+'/assertions',{method:'POST',body:{type:'STATUS',operator:'EQ',expectedValue:200}}]);
  await api.updateAssertion('w','p','r','a/1',{isEnabled:false});
  assert.deepEqual(calls.at(-1),[base+'/assertions/a%2F1',{method:'PATCH',body:{isEnabled:false}}]);
  await api.deleteAssertion('w','p','r','a');
  assert.deepEqual(calls.at(-1),[base+'/assertions/a',{method:'DELETE'}]);
});
test('History filtering and cursor are correctly encoded', async () => {
  await api.listExecutions('w','p','r',{limit:2,success:false,cursor:'uuid'});
  assert.equal(calls.at(-1)[0],base+'/executions?limit=2&success=false&cursor=uuid');
  await api.getExecution('w','p','r','ex/1');
  assert.equal(calls.at(-1)[0],base+'/executions/ex%2F1');
});
test('STATUS expected value bounds', () => {
  assert.deepEqual(assertionPayload({ type:'STATUS',operator:'EQ',expectedText:'404',isEnabled:true }), {type:'STATUS',operator:'EQ',isEnabled:true,expectedValue:404});
  assert.throws(()=>assertionPayload({type:'STATUS',operator:'EQ',expectedText:'999',isEnabled:true}));
});
test('LATENCY numerical bounds', () => {
  assert.equal(assertionPayload({type:'LATENCY',operator:'LTE',expectedText:'1000',isEnabled:true}).expectedValue,1000);
  assert.throws(()=>assertionPayload({type:'LATENCY',operator:'LT',expectedText:'0',isEnabled:true}));
});
test('JSON EXISTS never includes expectedValue', () => {
  assert.deepEqual(assertionPayload({type:'JSON',operator:'EXISTS',target:'data.id',expectedText:'secret',isEnabled:true}), {type:'JSON',operator:'EXISTS',isEnabled:true,target:'data.id'});
});
test('JSON EQ preserves primitive JSON types, rejects composite/null', () => {
  assert.equal(assertionPayload({type:'JSON',operator:'EQ',target:'active',expectedText:'true',isEnabled:true}).expectedValue,true);
  assert.equal(assertionPayload({type:'JSON',operator:'EQ',target:'id',expectedText:'"hello"',isEnabled:true}).expectedValue,'hello');
  for (const value of ['null','{}','[]']) assert.throws(()=>assertionPayload({type:'JSON',operator:'EQ',target:'id',expectedText:value,isEnabled:true}));
});
test('JSON paths prohibit prototype paths and array notation? syntax only', () => {
  assert.ok(validJsonPath('data.id'));
  assert.equal(validJsonPath('data[0]'),false);
  assert.equal(validJsonPath('a.'.repeat(16)+'b'),false);
});
