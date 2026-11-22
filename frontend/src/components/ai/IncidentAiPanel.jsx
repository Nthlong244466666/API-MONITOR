import {useCallback,useEffect,useMemo,useState} from 'react';
import {Sparkles,RefreshCw} from 'lucide-react';
import {useAuth} from '../../contexts/AuthContext';
import {createAiAnalysisApi} from '../../services/aiAnalysisApi';
import AiDiagnosis from './AiDiagnosis';
export default function IncidentAiPanel({incidentId}) {
  const {apiFetch}=useAuth();
  const api=useMemo(()=>createAiAnalysisApi(apiFetch),[apiFetch]);
  const [history,setHistory]=useState([]);
  const [selected,setSelected]=useState(null);
  const [cursor,setCursor]=useState(null);
  const [hasMore,setHasMore]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const load=useCallback(async (nextCursor=null,append=false)=>{
    setLoading(true);setError('');
    try {
      const page=await api.list(incidentId,{limit:10,...(nextCursor?{cursor:nextCursor}:{})});
      setHistory(prev=>append?[...prev,...page.items]:page.items);
      setCursor(page.nextCursor);setHasMore(page.hasMore);
      if(!append)setSelected(page.items[0]??null);
    }catch(e){setError(e?.message??'Không tải được lịch sử AI.');}
    finally{setLoading(false);}
  },[api,incidentId]);
  useEffect(()=>{let active=true; // async load handles state; unmount guard through parent key
    if(active)void load();return()=>{active=false;};},[load]);
  async function analyze(){
    setBusy(true);setError('');
    try{const result=await api.analyze(incidentId);await load();setSelected(result);}
    catch(e){setError(e?.message??'AI không khả dụng. Kiểm tra cấu hình Backend.');}
    finally{setBusy(false);}
  }
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-lg font-semibold text-ink">AI Incident Analysis</h2><p className="text-xs text-muted">Phân tích dựa trên metadata MonitorCheck, không gửi URL và secret.</p></div><button type="button" onClick={analyze} disabled={busy||loading} className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><Sparkles size={16}/>{busy?'Đang phân tích...':'Analyze with AI'}</button></div>
    {error&&<p role="alert" className="rounded-lg border border-down/40 bg-down/10 p-3 text-sm text-down">{error}</p>}
    {selected&&<AiDiagnosis analysis={selected}/>}
    {!selected&&!loading&&<p className="text-sm text-muted">Chưa có phân tích AI. Nhấn Analyze with AI để bắt đầu.</p>}
    <div className="rounded-xl border border-line bg-panel p-4"><div className="mb-3 flex items-center justify-between"><h3 className="text-sm font-semibold text-ink">Lịch sử phân tích ({history.length}{hasMore?'+':''})</h3><button type="button" disabled={loading} onClick={()=>load()} aria-label="Làm mới lịch sử AI" className="rounded-lg p-2 text-muted hover:bg-panel-hover"><RefreshCw size={16}/></button></div>
      <div className="flex flex-wrap gap-2">{history.map((item)=><button key={item.id} type="button" onClick={()=>setSelected(item)} className={`rounded-lg border px-3 py-2 text-xs ${selected?.id===item.id?'border-brand text-brand':'border-line text-muted hover:text-ink'}`}>{new Date(item.createdAt).toLocaleString('vi-VN')}</button>)}</div>
      {loading&&<p className="mt-2 text-xs text-muted">Đang tải...</p>}
      {hasMore&&<button type="button" disabled={loading} onClick={()=>load(cursor,true)} className="mt-3 rounded-lg border border-line px-3 py-2 text-xs text-ink disabled:opacity-50">Tải thêm</button>}
    </div>
  </section>;
}
