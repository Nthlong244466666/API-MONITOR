export default function AiDiagnosis({ analysis }) {
  const data=analysis?.diagnosis;
  if(!data)return null;
  const blocks=[['Giả thuyết nguyên nhân',data.possibleCauses],['Bước kiểm tra và khắc phục',data.recommendedActions],['Bằng chứng',data.evidence],['Giới hạn dữ liệu',data.limitations]];
  return <article className="space-y-4 rounded-xl border border-line bg-panel p-5">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-lg font-semibold text-ink">AI Diagnosis</h3><span className="rounded-lg border border-line px-2 py-1 text-xs text-muted">Độ tin cậy: {data.confidence ?? 'LOW'}</span></div>
    <p className="whitespace-pre-wrap break-words text-sm text-ink">{data.summary}</p>
    {blocks.map(([title,items])=><section key={title} className="space-y-2"><h4 className="text-sm font-semibold text-ink">{title}</h4>{Array.isArray(items)&&items.length?<ul className="list-disc space-y-1 pl-5 text-sm text-muted">{items.map((item,i)=><li className="break-words" key={i}>{item}</li>)}</ul>:<p className="text-xs text-muted">Chưa có dữ liệu.</p>}</section>)}
    <p className="border-t border-line pt-3 text-xs text-muted">AI đưa ra giả thuyết, không xác nhận nguyên nhân gốc hoặc tự sửa hệ thống. Model: {analysis.model}. {new Date(analysis.createdAt).toLocaleString('vi-VN')}</p>
  </article>;
}
