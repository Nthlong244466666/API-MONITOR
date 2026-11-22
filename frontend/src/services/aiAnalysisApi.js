const id=(value)=>encodeURIComponent(value);
export function createAiAnalysisApi(apiFetch) {
  return {
    analyze(incidentId) {return apiFetch(`/incidents/${id(incidentId)}/analyze`,{method:'POST',body:{}});},
    list(incidentId,{limit=10,cursor}={}) {
      const params=new URLSearchParams({limit:String(limit)});
      if(cursor)params.set('cursor',cursor);
      return apiFetch(`/incidents/${id(incidentId)}/analyses?${params}`);
    },
    get(incidentId,analysisId) {return apiFetch(`/incidents/${id(incidentId)}/analyses/${id(analysisId)}`);},
  };
}
