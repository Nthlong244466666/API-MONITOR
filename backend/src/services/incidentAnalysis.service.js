import { prisma } from '../lib/prisma.js';
import { getIncident } from './incident.service.js';
import { buildAiContext } from '../lib/aiDiagnosis.js';
import { requestDiagnosis } from './aiProvider.service.js';
import { HttpError } from '../utils/HttpError.js';

const analysisSelect = {
  id:true, incidentId:true, model:true, diagnosis:true, createdAt:true,
};
const active = new Set();
const MAX_ANALYSES_PER_INCIDENT = 5;

export async function analyzeIncident(userId, incidentId) {
  await getIncident(userId, incidentId); // Authorization before provider call.
  const key = `${userId}:${incidentId}`;
  if (active.has(key)) throw new HttpError(409,'AI_ANALYSIS_IN_PROGRESS','An analysis is already running');
  active.add(key);
  try {
    // Fetch full but narrowly selected non-secret data after ownership guard.
    const incident = await prisma.incident.findFirst({
      where: {id:incidentId, ...{monitor:{is:{request:{is:{project:{is:{workspace:{is:{ownerId:userId}}}}}}}}}},
      select: { status:true, reason:true, startedAt:true, resolvedAt:true, monitorId:true,
        monitor:{select:{status:true, failureThreshold:true,recoveryThreshold:true, intervalSeconds:true}},
      },
    });
    if (!incident) throw new HttpError(404,'INCIDENT_NOT_FOUND','Incident not found');
    const prior = await prisma.incidentAnalysis.findFirst({ where:{ incidentId }, orderBy:{createdAt:'desc'}, select:{createdAt:true} });
    if (prior && Date.now()-prior.createdAt.getTime() < 60_000)
      throw new HttpError(429,'AI_COOLDOWN','Wait at least 60 seconds between analyses');
    const total = await prisma.incidentAnalysis.count({where:{incidentId}});
    if (total >= MAX_ANALYSES_PER_INCIDENT) throw new HttpError(429,'AI_LIMIT_REACHED','Analysis limit reached for this incident');
    const checks = await prisma.monitorCheck.findMany({
      where:{monitorId:incident.monitorId,checkedAt:{gte:incident.startedAt}},
      orderBy:[{checkedAt:'asc'},{id:'asc'}],take:12,
      select:{checkedAt:true,statusCode:true,responseTimeMs:true,isSuccess:true,errorMessage:true},
    });
    const context = buildAiContext(incident, checks);
    let answer;
    try { answer = await requestDiagnosis(context); }
    catch (e) {
      if (e instanceof HttpError) throw e;
      const status = e.code === 'AI_RATE_LIMITED' ? 429 : e.code === 'AI_NOT_CONFIGURED' ? 503 : 502;
      throw new HttpError(status, e.code || 'AI_PROVIDER_ERROR', 'AI analysis unavailable; retry later');
    }
    // Guard incident ownership again, in case it was deleted while provider was running.
    const stillOwned = await prisma.incident.findFirst({where:{id:incidentId,monitor:{is:{request:{is:{project:{is:{workspace:{is:{ownerId:userId}}}}}}}}}, select:{id:true}});
    if (!stillOwned) throw new HttpError(404,'INCIDENT_NOT_FOUND','Incident not found');
    return prisma.incidentAnalysis.create({data:{incidentId,model:answer.model,diagnosis:answer.diagnosis}, select:analysisSelect});
  } finally { active.delete(key); }
}
export async function listAnalyses(userId, incidentId, {limit,cursor}) {
  await getIncident(userId,incidentId);
  const where = {incidentId};
  if (cursor) {
    const found = await prisma.incidentAnalysis.findFirst({where:{id:cursor,...where},select:{id:true}});
    if (!found) throw new HttpError(400,'INVALID_CURSOR','Invalid analysis cursor');
  }
  const rows=await prisma.incidentAnalysis.findMany({where,orderBy:[{createdAt:'desc'},{id:'desc'}],
    ...(cursor?{cursor:{id:cursor},skip:1}:{}),take:limit+1,select:analysisSelect});
  const items=rows.slice(0,limit);
  return {items,hasMore:rows.length>limit,nextCursor:rows.length>limit?items.at(-1)?.id??null:null};
}
export async function getAnalysis(userId,incidentId,analysisId) {
  await getIncident(userId,incidentId);
  const item=await prisma.incidentAnalysis.findFirst({where:{id:analysisId,incidentId},select:analysisSelect});
  if (!item) throw new HttpError(404,'AI_ANALYSIS_NOT_FOUND','Analysis not found');
  return item;
}
