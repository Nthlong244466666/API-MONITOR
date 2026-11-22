import { parseId, parseAnalysisQuery } from '../validators/aiAnalysis.validator.js';
import { analyzeIncident,listAnalyses,getAnalysis } from '../services/incidentAnalysis.service.js';
function send(res,data,status=200) {res.setHeader('Cache-Control','no-store');return res.status(status).json({success:true,data});}
export async function analyze(req,res) {return send(res,await analyzeIncident(req.user.id,parseId(req.params.incidentId)),201);}
export async function index(req,res) {return send(res,await listAnalyses(req.user.id,parseId(req.params.incidentId),parseAnalysisQuery(req.query)));}
export async function show(req,res) {return send(res,await getAnalysis(req.user.id,parseId(req.params.incidentId),parseId(req.params.analysisId)));}
