import test from 'node:test';
import assert from 'node:assert/strict';
import { createIncidentApi, buildIncidentQuery, incidentDetailPath } from '../frontend/src/services/incidentApi.js';
import { createNotificationApi, buildNotificationQuery } from '../frontend/src/services/notificationApi.js';

test('incident query default', () => assert.equal(buildIncidentQuery(), '/incidents?limit=20'));
test('incident filter status and monitor', () => assert.equal(buildIncidentQuery({status:'OPEN',monitorId:'abc',limit:10}), '/incidents?limit=10&status=OPEN&monitorId=abc'));
test('incident cursor escapes', () => assert.match(buildIncidentQuery({cursor:'a/b'}), /cursor=a%2Fb/));
test('incident detail encodes id', () => assert.equal(incidentDetailPath('a/b'), '/incidents/a%2Fb'));
test('incident get uses correct endpoint', async () => {
 const req=[];const api=createIncidentApi(async (...args)=>{req.push(args);return {ok:true}});await api.get('abc');assert.equal(req[0][0],'/incidents/abc');
});
test('incident list sends filters',async()=>{const req=[];const api=createIncidentApi(async (path)=>{req.push(path)});await api.list({status:'RESOLVED'});assert.match(req[0],/status=RESOLVED/)});
test('notification query default',()=> assert.equal(buildNotificationQuery(),'/notifications?limit=20'));
test('notification unread query',()=>assert.equal(buildNotificationQuery({isRead:'false'}),'/notifications?limit=20&isRead=false'));
test('notification pagination cursor',()=>assert.match(buildNotificationQuery({cursor:'x/y'}),/cursor=x%2Fy/));
test('notification unread count endpoint',async()=>{let path;await createNotificationApi(async p=>{path=p}).unreadCount();assert.equal(path,'/notifications/unread-count')});
test('mark one notification sends PATCH',async()=>{let args;await createNotificationApi(async (...a)=>{args=a}).markRead('abc');assert.deepEqual(args,['/notifications/abc/read',{method:'PATCH'}])});
test('mark all sends PATCH',async()=>{let args;await createNotificationApi(async (...a)=>{args=a}).markAllRead();assert.deepEqual(args,['/notifications/read-all',{method:'PATCH'}])});
