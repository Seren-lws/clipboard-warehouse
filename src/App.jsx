import { useState, useEffect, useRef } from "react"
import {
  fetchRecords, createRecord, updateRecord, deleteRecord,
  fetchCustomTags, addCustomTag, deleteCustomTag,
  uploadImage,
  signIn, signOut, onAuthChange, getSession
} from "./lib/supabase"

const DEFAULT_TAGS = [
  "ai项目", "ai聊天梗", "llm魅力时刻", "灵感备忘", "觉察",
  "生活记录", "碎碎念", "梦", "小说", "工作"
]

const TAG_COLORS = {
  "ai项目": "#7C9CB5", "ai聊天梗": "#E8A87C", "llm魅力时刻": "#D4A5C9",
  "灵感备忘": "#95B8A2", "觉察": "#B5A1D4", "生活记录": "#E8C07C",
  "碎碎念": "#C9A5A5", "梦": "#A5B8D4", "小说": "#D4C9A5", "工作": "#8FBCBB",
}

const getTagColor = (tag) => TAG_COLORS[tag] || "#B5A1D4"

// Render **bold** and ==highlight== as React elements
function renderFormatted(text) {
  // Split by **bold** and ==highlight== patterns
  const parts = text.split(/(\*\*[^*]+\*\*|==[^=]+==%?)/)
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} style={{fontWeight:700}}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith("==") && part.endsWith("==")) {
      return <mark key={i} style={{background:"#FCEABB",color:"#5D4E60",borderRadius:3,padding:"0 2px"}}>{part.slice(2, -2)}</mark>
    }
    return part
  })
}

// Strip markdown markers for clean copy
function stripFormat(text) {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/==([^=]+)==/g, "$1")
}

function fmt(iso) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(d.getDate()).padStart(2,"0")}`
}
function fmtTime(iso) {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`
}
function fmtFull(iso) { return `${fmt(iso)} ${fmtTime(iso)}` }

/* ====== Icons ====== */
const I = {
  Pin: ({f}) => <svg width="16" height="16" viewBox="0 0 24 24" fill={f?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5"/><path d="M9 2h6l-1 7h4l-7 8-7-8h4z"/></svg>,
  Copy: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>,
  Cal: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  Tag: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  Del: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>,
  Img: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>,
  Fmt: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></svg>,
  Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Export: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>,
  Left: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>,
  Right: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>,
  Close: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>,
  Heart: ({f}) => <svg width="15" height="15" viewBox="0 0 24 24" fill={f?"currentColor":"none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
  Ai: () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 16.4 5.7 21l2.3-7L2 9.4h7.6z"/></svg>,
}

/* ====== Toast ====== */
function Toast({ message, visible }) {
  return <div style={{
    position:"fixed",bottom:40,left:"50%",transform:`translateX(-50%) translateY(${visible?0:20}px)`,
    background:"#5D4E60",color:"#FFF8F0",padding:"10px 24px",borderRadius:20,fontSize:13,
    opacity:visible?1:0,transition:"all 0.3s",pointerEvents:"none",zIndex:999,fontWeight:500,
    boxShadow:"0 4px 20px rgba(93,78,96,0.25)"
  }}>{message}</div>
}

/* ====== Format Tools ====== */
function FormatTools({ text, onFormat }) {
  const [open, setOpen] = useState(false)
  const tools = [
    { label: "去除多余空行", fn: t => t.replace(/\n{3,}/g, "\n\n") },
    { label: "去除所有空行", fn: t => t.replace(/\n\s*\n/g, "\n") },
    { label: "去除行首尾空格", fn: t => t.split("\n").map(l=>l.trim()).join("\n") },
    { label: "合并连续空格", fn: t => t.replace(/ {2,}/g, " ") },
  ]
  return (
    <div style={{ position:"relative", display:"inline-block" }}>
      <button onClick={()=>setOpen(!open)} style={{
        background:"none",border:"none",cursor:"pointer",color:"#B39DAD",
        padding:6,borderRadius:8,display:"flex",alignItems:"center",gap:4,fontSize:12
      }}><I.Fmt/> 整理</button>
      {open && <div style={{
        position:"absolute",top:"100%",left:0,background:"#FFFBF7",
        border:"1px solid #F0E6DF",borderRadius:12,padding:4,
        boxShadow:"0 8px 30px rgba(180,160,170,0.15)",zIndex:50,minWidth:160
      }}>
        {tools.map((t,i) => <button key={i} onClick={()=>{onFormat(t.fn(text));setOpen(false)}}
          style={{display:"block",width:"100%",textAlign:"left",padding:"8px 12px",background:"none",
            border:"none",cursor:"pointer",fontSize:13,color:"#5D4E60",borderRadius:8}}
          onMouseEnter={e=>e.target.style.background="#F5EDE8"}
          onMouseLeave={e=>e.target.style.background="none"}
        >{t.label}</button>)}
      </div>}
    </div>
  )
}

/* ====== Tag Manager Modal ====== */
function TagManager({ tags, customTags, onAdd, onDelete, onClose }) {
  const [v, setV] = useState("")
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(93,78,96,0.3)",zIndex:100,
      display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#FFFBF7",borderRadius:20,padding:28,width:340,
        boxShadow:"0 20px 60px rgba(93,78,96,0.2)"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:16,color:"#5D4E60",fontWeight:600}}>管理标签</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#B39DAD"}}><I.Close/></button>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16}}>
          <input value={v} onChange={e=>setV(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&v.trim()){onAdd(v.trim());setV("")}}}
            placeholder="添加新标签…"
            style={{flex:1,padding:"8px 14px",borderRadius:10,border:"1.5px solid #EDE4DD",
              fontSize:13,outline:"none",background:"#FFF8F2",color:"#5D4E60",fontFamily:"inherit"}}
          />
          <button onClick={()=>{if(v.trim()){onAdd(v.trim());setV("")}}}
            style={{background:"#D4A5C9",color:"white",border:"none",borderRadius:10,
              padding:"8px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>添加</button>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,maxHeight:300,overflowY:"auto"}}>
          {tags.map(tag => (
            <div key={tag} style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",
              background:`${getTagColor(tag)}18`,borderRadius:10,fontSize:13,color:getTagColor(tag)}}>
              {tag}
              {customTags.includes(tag) && (
                <button onClick={()=>onDelete(tag)} style={{background:"none",border:"none",cursor:"pointer",
                  color:getTagColor(tag),padding:0,display:"flex",opacity:0.6}}>×</button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ====== Export Modal ====== */
function ExportModal({ records, filterTag, calendarDate, onClose }) {
  const getFiltered = () => records.filter(r => {
    if (filterTag && !r.tags.includes(filterTag)) return false
    if (calendarDate && fmt(r.created_at) !== calendarDate) return false
    return true
  })

  const buildTxt = (recs) => recs.map(r => {
    const tags = r.tags.length > 0 ? ` [${r.tags.join(", ")}]` : ""
    const pin = r.pinned ? " 📌" : ""
    const notes = r.notes ? `\n备注：${r.notes}` : ""
    return `--- ${fmtFull(r.created_at)}${pin}${tags} ---\n${r.content}${notes}`
  }).join("\n\n")

  const buildJson = (recs) => JSON.stringify(recs.map(r => ({
    content: r.content, tags: r.tags, pinned: r.pinned, notes: r.notes || "",
    created_at: r.created_at, images: r.images
  })), null, 2)

  const doExport = (scope, format) => {
    const recs = scope === "all" ? records : getFiltered()
    if (recs.length === 0) return
    const content = format === "txt" ? buildTxt(recs) : buildJson(recs)
    const mime = format === "txt" ? "text/plain" : "application/json"
    let label = "全部"
    if (scope === "filtered") {
      if (filterTag) label = `标签_${filterTag}`
      else if (calendarDate) label = `日期_${calendarDate.replace(/\//g, "-")}`
    }
    const blob = new Blob([content], { type: `${mime};charset=utf-8` })
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = `剪贴板仓库_${label}_${fmt(new Date().toISOString()).replace(/\//g, "-")}.${format}`
    a.click()
    URL.revokeObjectURL(a.href)
    onClose()
  }

  const filtered = getFiltered()
  const hasFilter = filterTag || calendarDate
  const filterLabel = filterTag ? `标签「${filterTag}」` : calendarDate || ""

  const btnStyle = (active) => ({
    flex:1,padding:"10px 0",borderRadius:12,border: active ? "1.5px solid #D4A5C9" : "1.5px solid #E8DFD8",
    background: active ? "linear-gradient(135deg, #D4A5C920, #C9A5D420)" : "white",
    cursor: active ? "pointer" : "default",fontSize:13,
    color: active ? "#5D4E60" : "#C9B8BF",fontWeight:500
  })

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(93,78,96,0.3)",zIndex:100,
      display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(4px)"
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#FFFBF7",borderRadius:20,padding:28,width:320,
        boxShadow:"0 20px 60px rgba(93,78,96,0.2)"
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h3 style={{margin:0,fontSize:16,color:"#5D4E60",fontWeight:600}}>导出记录</h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#B39DAD"}}><I.Close/></button>
        </div>
        <div style={{marginBottom: hasFilter ? 16 : 0}}>
          <div style={{fontSize:12,color:"#B39DAD",fontWeight:600,marginBottom:10}}>全部导出（{records.length}条）</div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>doExport("all","txt")} style={btnStyle(true)}>📄 TXT</button>
            <button onClick={()=>doExport("all","json")} style={btnStyle(true)}>📦 JSON</button>
          </div>
        </div>
        {hasFilter && <div style={{borderTop:"1px solid #F0EAE4",paddingTop:16}}>
          <div style={{fontSize:12,color:"#B39DAD",fontWeight:600,marginBottom:10}}>
            按当前筛选导出：{filterLabel}（{filtered.length}条）
          </div>
          <div style={{display:"flex",gap:8}}>
            <button onClick={()=>filtered.length>0&&doExport("filtered","txt")} style={btnStyle(filtered.length>0)}>📄 TXT</button>
            <button onClick={()=>filtered.length>0&&doExport("filtered","json")} style={btnStyle(filtered.length>0)}>📦 JSON</button>
          </div>
        </div>}
      </div>
    </div>
  )
}

/* ====== Calendar ====== */
function CalendarView({ records, onSelectDate, selectedDate }) {
  const [vd, setVd] = useState(new Date())
  const y = vd.getFullYear(), m = vd.getMonth()
  const dim = new Date(y, m+1, 0).getDate()
  const fd = new Date(y, m, 1).getDay()
  const wk = ["日","一","二","三","四","五","六"]

  const counts = {}
  records.forEach(r => { const k = fmt(r.created_at); counts[k] = (counts[k]||0)+1 })

  const days = []
  for (let i=0; i<fd; i++) days.push(null)
  for (let d=1; d<=dim; d++) days.push(d)

  return (
    <div style={{padding:"0 4px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <button onClick={()=>setVd(new Date(y,m-1,1))} style={{background:"none",border:"none",cursor:"pointer",color:"#B39DAD",padding:4}}><I.Left/></button>
        <span style={{fontSize:15,fontWeight:600,color:"#5D4E60"}}>{y}年{m+1}月</span>
        <button onClick={()=>setVd(new Date(y,m+1,1))} style={{background:"none",border:"none",cursor:"pointer",color:"#B39DAD",padding:4}}><I.Right/></button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:4,textAlign:"center"}}>
        {wk.map(w => <div key={w} style={{fontSize:11,color:"#B39DAD",padding:"4px 0",fontWeight:500}}>{w}</div>)}
        {days.map((d,i) => {
          if (d===null) return <div key={`e${i}`}/>
          const dk = `${y}/${String(m+1).padStart(2,"0")}/${String(d).padStart(2,"0")}`
          const c = counts[dk]||0
          const sel = selectedDate===dk
          const today = dk === fmt(new Date().toISOString())
          return <button key={d} onClick={()=>c>0&&onSelectDate(dk)} style={{
            background: sel ? "#D4A5C9" : c>0 ? `rgba(212,165,201,${Math.min(0.15+c*0.08,0.45)})` : "transparent",
            border: today ? "2px solid #D4A5C9" : "2px solid transparent",
            borderRadius:10,padding:"8px 2px",cursor:c>0?"pointer":"default",
            color:sel?"white":"#5D4E60",fontSize:13,fontWeight:today?700:400,
            transition:"all 0.2s",minHeight:44,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",gap:2
          }}>
            <span>{d}</span>
            {c>0 && <span style={{fontSize:9,color:sel?"rgba(255,255,255,0.85)":"#D4A5C9",fontWeight:600}}>{c}条</span>}
          </button>
        })}
      </div>
    </div>
  )
}

/* ====== Record Card ====== */
function RecordCard({ record, onPin, onFavorite, onDelete, onCopy, onEdit, onPreview, sq }) {
  const [exp, setExp] = useState(false)
  const isLong = record.content.length > 150
  const txt = isLong && !exp ? record.content.slice(0,150)+"…" : record.content

  const hl = (text, q) => {
    if (!q) return text
    const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")})`, "gi"))
    return parts.map((p,i) => p.toLowerCase()===q.toLowerCase()
      ? <mark key={i} style={{background:"#F5D6EE",color:"#5D4E60",borderRadius:3,padding:"0 2px"}}>{p}</mark> : p)
  }

  return (
    <div style={{
      background:record.pinned?"#FFFBF7":"#FFFFFF",borderRadius:16,padding:"16px 18px",
      border:record.pinned?"1.5px solid #E8D5C4":"1px solid #F0EAE4",
      boxShadow:record.pinned?"0 4px 20px rgba(212,165,201,0.1)":"0 2px 8px rgba(180,160,170,0.06)",
      transition:"all 0.25s",position:"relative"
    }}>
      {record.pinned && <div style={{
        position:"absolute",top:-1,right:16,background:"#D4A5C9",color:"white",
        fontSize:9,padding:"2px 8px 4px",borderRadius:"0 0 6px 6px",fontWeight:600,letterSpacing:1
      }}>置顶</div>}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
        <span style={{fontSize:11,color:"#B5A1A8",fontWeight:500}}>{fmtFull(record.created_at)}</span>
        <div style={{display:"flex",gap:2}}>
          {[
            { icon: <I.Heart f={record.favorited}/>, fn: ()=>onFavorite(record.id, !record.favorited), c: record.favorited?"#E88CA5":"#C9B8BF", t: record.favorited?"取消收藏":"收藏" },
            { icon: <I.Edit/>, fn: ()=>onEdit(record), c: "#C9B8BF", t: "编辑" },
            { icon: <I.Pin f={record.pinned}/>, fn: ()=>onPin(record.id, !record.pinned), c: record.pinned?"#D4A5C9":"#C9B8BF", t: record.pinned?"取消置顶":"置顶" },
            { icon: <I.Copy/>, fn: ()=>onCopy(record.content), c: "#C9B8BF", t: "复制" },
            { icon: <I.Del/>, fn: ()=>onDelete(record.id), c: "#D4B8B8", t: "删除" },
          ].map((b,i) => <button key={i} onClick={b.fn} title={b.t} style={{
            background:"none",border:"none",cursor:"pointer",color:b.c,padding:4,borderRadius:6,display:"flex"
          }}>{b.icon}</button>)}
        </div>
      </div>
      <div style={{fontSize:14,lineHeight:1.75,color:"#4A3F4A",whiteSpace:"pre-wrap",wordBreak:"break-word",
        marginBottom: (record.tags.length>0||(record.images||[]).length>0)?10:0}}>
        {sq ? hl(txt, sq) : renderFormatted(txt)}
        {isLong && <button onClick={()=>setExp(!exp)} style={{
          background:"none",border:"none",color:"#D4A5C9",cursor:"pointer",fontSize:12,padding:"0 4px",fontWeight:500
        }}>{exp?"收起":"展开"}</button>}
      </div>
      {record.images && record.images.length > 0 && (
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:10}}>
          {record.images.map((img,i) => <img key={i} src={img} onClick={()=>onPreview(img)} style={{
            width:80,height:80,objectFit:"cover",borderRadius:10,border:"1px solid #F0E6DF",cursor:"pointer"
          }}/>)}
        </div>
      )}
      {record.notes && <div style={{fontSize:12,color:"#A89585",marginBottom:8,
        padding:"6px 10px",background:"#FAF6F0",borderRadius:8,borderLeft:"3px solid #E8C07C",
        lineHeight:1.5}}>✎ {record.notes}</div>}
      {record.tags.length > 0 && (
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {record.tags.map(tag => <span key={tag} style={{
            fontSize:11,padding:"3px 10px",borderRadius:8,
            background:`${getTagColor(tag)}15`,color:getTagColor(tag),fontWeight:500
          }}>{tag}</span>)}
        </div>
      )}
    </div>
  )
}

/* ====== AI Chat Modal ====== */
function AiChat({ records, allTags, onClose }) {
  const [aiTag, setAiTag] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [question, setQuestion] = useState("")
  const [reply, setReply] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const replyRef = useRef(null)

  const filtered = aiTag ? records.filter(r => r.tags.includes(aiTag)) : records
  const toggleSelect = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })
  const selectAll = () => setSelected(new Set(filtered.map(r => r.id)))
  const selectNone = () => setSelected(new Set())

  const handleSend = async () => {
    if (!question.trim() || selected.size === 0) return
    setLoading(true); setError(""); setReply("")
    const context = records
      .filter(r => selected.has(r.id))
      .map(r => {
        const meta = [`时间：${fmtFull(r.created_at)}`]
        if (r.tags.length) meta.push(`标签：${r.tags.join("、")}`)
        if (r.notes) meta.push(`备注：${r.notes}`)
        return `[${meta.join(" | ")}]\n${stripFormat(r.content)}`
      }).join("\n\n---\n\n")

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: "你是一个私人笔记助手。用户会给你一些笔记内容作为参考，请根据这些内容回答用户的问题。回答要简洁、有洞察力、温柔。如果笔记内容不足以回答问题，请如实说明。" },
            { role: "user", content: `以下是我选择的笔记内容：\n\n${context}\n\n---\n\n我的问题：${question}` }
          ]
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "请求失败")
      setReply(data.reply)
      setTimeout(() => replyRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
    } catch (e) {
      setError(e.message || "请求失败，请检查 API 配置")
    }
    setLoading(false)
  }

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(93,78,96,0.4)",zIndex:100,
      display:"flex",alignItems:"flex-end",justifyContent:"center",backdropFilter:"blur(4px)"
    }} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:"#FFFBF7",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:520,
        maxHeight:"90vh",display:"flex",flexDirection:"column",
        boxShadow:"0 -10px 40px rgba(93,78,96,0.15)"
      }}>
        {/* Header */}
        <div style={{padding:"18px 20px 12px",borderBottom:"1px solid #F0EAE4",
          display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
          <h3 style={{margin:0,fontSize:16,color:"#5D4E60",fontWeight:600,display:"flex",alignItems:"center",gap:6}}>
            <I.Ai/> AI 洞察
          </h3>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",color:"#B39DAD"}}><I.Close/></button>
        </div>

        {/* Scrollable content */}
        <div style={{flex:1,overflowY:"auto",padding:"12px 20px"}}>
          {/* Tag filter */}
          <div style={{marginBottom:12}}>
            <div style={{fontSize:11,color:"#B39DAD",fontWeight:600,marginBottom:8}}>选择标签</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              <button onClick={()=>{setAiTag(null);setSelected(new Set())}} style={{
                padding:"4px 12px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",
                background:aiTag===null?"#5D4E60":"#F0EAE4",color:aiTag===null?"white":"#8A7A6D"
              }}>全部</button>
              {allTags.filter(t => records.some(r => r.tags.includes(t))).map(tag => (
                <button key={tag} onClick={()=>{setAiTag(tag);setSelected(new Set())}} style={{
                  padding:"4px 12px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",
                  background:aiTag===tag?getTagColor(tag):`${getTagColor(tag)}15`,
                  color:aiTag===tag?"white":getTagColor(tag)
                }}>{tag}</button>
              ))}
            </div>
          </div>

          {/* Record selection */}
          <div style={{marginBottom:12}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <span style={{fontSize:11,color:"#B39DAD",fontWeight:600}}>
                选择内容（{selected.size}/{filtered.length}）
              </span>
              <div style={{display:"flex",gap:8}}>
                <button onClick={selectAll} style={{fontSize:11,color:"#D4A5C9",background:"none",border:"none",cursor:"pointer",fontWeight:500}}>全选</button>
                <button onClick={selectNone} style={{fontSize:11,color:"#B39DAD",background:"none",border:"none",cursor:"pointer",fontWeight:500}}>取消</button>
              </div>
            </div>
            <div style={{maxHeight:200,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
              {filtered.length === 0 ? (
                <div style={{textAlign:"center",padding:20,color:"#C9B8BF",fontSize:12}}>该标签下没有记录</div>
              ) : filtered.map(r => (
                <label key={r.id} style={{
                  display:"flex",gap:10,padding:"8px 12px",borderRadius:10,cursor:"pointer",
                  background:selected.has(r.id)?"#F5EDE8":"white",
                  border:selected.has(r.id)?"1.5px solid #D4A5C9":"1px solid #F0EAE4",
                  transition:"all 0.15s",alignItems:"flex-start"
                }}>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={()=>toggleSelect(r.id)}
                    style={{marginTop:2,accentColor:"#D4A5C9"}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:12,color:"#4A3F4A",lineHeight:1.5,
                      overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",
                      WebkitLineClamp:2,WebkitBoxOrient:"vertical"
                    }}>{stripFormat(r.content)}</div>
                    <div style={{fontSize:10,color:"#B5A1A8",marginTop:2}}>{fmtFull(r.created_at)}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* AI Reply */}
          {reply && <div ref={replyRef} style={{marginBottom:12,padding:"14px 16px",borderRadius:12,
            background:"linear-gradient(135deg, #F5EDE8, #FDF6FF)",border:"1px solid #E8DFD8",
            fontSize:13,lineHeight:1.8,color:"#4A3F4A",whiteSpace:"pre-wrap"}}>
            <div style={{fontSize:10,color:"#D4A5C9",fontWeight:600,marginBottom:8}}>✦ AI 回复</div>
            {reply}
          </div>}
          {error && <div style={{marginBottom:12,padding:"10px 14px",borderRadius:10,
            background:"#FFF0F0",border:"1px solid #F5D5D5",fontSize:12,color:"#C97070"}}>{error}</div>}
        </div>

        {/* Input area - fixed at bottom */}
        <div style={{padding:"12px 20px 20px",borderTop:"1px solid #F0EAE4",flexShrink:0,
          background:"#FFFBF7"}}>
          <div style={{display:"flex",gap:8}}>
            <input value={question} onChange={e=>setQuestion(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey&&!loading){e.preventDefault();handleSend()}}}
              placeholder={selected.size===0?"请先选择内容…":"问点什么吧…"}
              disabled={selected.size===0||loading}
              style={{flex:1,padding:"10px 14px",borderRadius:12,border:"1.5px solid #EDE4DD",
                fontSize:13,outline:"none",background:selected.size===0?"#F5F0EB":"white",
                color:"#5D4E60",fontFamily:"inherit"}}/>
            <button onClick={handleSend}
              disabled={!question.trim()||selected.size===0||loading}
              style={{
                padding:"10px 18px",borderRadius:12,border:"none",fontSize:13,fontWeight:600,
                background:question.trim()&&selected.size>0&&!loading
                  ?"linear-gradient(135deg, #B5A1D4, #D4A5C9)":"#E8DFD8",
                color:"white",cursor:question.trim()&&selected.size>0&&!loading?"pointer":"default",
                transition:"all 0.2s",minWidth:56
              }}>{loading ? "…" : "发送"}</button>
          </div>
          {selected.size > 0 && <div style={{fontSize:10,color:"#C9B8BF",marginTop:6,paddingLeft:4}}>
            已选 {selected.size} 条记录作为上下文
          </div>}
        </div>
      </div>
    </div>
  )
}

/* ====== Login Screen ====== */
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true); setError("")
    try {
      await signIn(email, password)
      onLogin()
    } catch (err) {
      setError("登录失败，请检查邮箱和密码")
    }
    setLoading(false)
  }

  return (
    <div style={{minHeight:"100vh",background:"#FBF6F1",display:"flex",alignItems:"center",
      justifyContent:"center",fontFamily:"'Noto Sans SC','PingFang SC',-apple-system,sans-serif",padding:20}}>
      <div style={{width:"100%",maxWidth:340,textAlign:"center"}}>
        <div style={{fontSize:48,marginBottom:8}}>✿</div>
        <h1 style={{fontSize:22,fontWeight:700,color:"#5D4E60",marginBottom:4}}>剪贴板仓库</h1>
        <p style={{fontSize:13,color:"#B39DAD",marginBottom:32}}>登录后开始使用</p>
        <div style={{background:"white",borderRadius:20,padding:28,
          boxShadow:"0 4px 24px rgba(180,160,170,0.1)",border:"1px solid #F0EAE4"}}>
          <div style={{marginBottom:16}}>
            <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="邮箱"
              style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1.5px solid #EDE4DD",
                fontSize:14,outline:"none",color:"#5D4E60",background:"#FFF8F2",fontFamily:"inherit",
                boxSizing:"border-box"}}/>
          </div>
          <div style={{marginBottom:20}}>
            <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="密码"
              onKeyDown={e=>{if(e.key==="Enter")handleLogin(e)}}
              style={{width:"100%",padding:"12px 16px",borderRadius:12,border:"1.5px solid #EDE4DD",
                fontSize:14,outline:"none",color:"#5D4E60",background:"#FFF8F2",fontFamily:"inherit",
                boxSizing:"border-box"}}/>
          </div>
          {error && <div style={{fontSize:12,color:"#C97070",marginBottom:12}}>{error}</div>}
          <button onClick={handleLogin} disabled={loading} style={{
            width:"100%",padding:"12px",borderRadius:12,border:"none",fontSize:14,fontWeight:600,
            background:loading?"#E8DFD8":"linear-gradient(135deg, #D4A5C9 0%, #C9A5D4 100%)",
            color:"white",cursor:loading?"default":"pointer",
            boxShadow:"0 4px 15px rgba(212,165,201,0.3)",transition:"all 0.2s"
          }}>{loading ? "登录中…" : "登录"}</button>
        </div>
      </div>
    </div>
  )
}

/* ====== Main App ====== */
function MainApp() {
  const [records, setRecords] = useState([])
  const [customTags, setCustomTags] = useState([])
  const [inputText, setInputText] = useState("")
  const [inputNotes, setInputNotes] = useState("")
  const [selectedTags, setSelectedTags] = useState([])
  const [showNotes, setShowNotes] = useState(false)
  const [imgFiles, setImgFiles] = useState([]) // { file, preview }
  const [view, setView] = useState("list")
  const [filterTag, setFilterTag] = useState(null)
  const [calendarDate, setCalendarDate] = useState(null)
  const [showTagPanel, setShowTagPanel] = useState(false)
  const [showTagManager, setShowTagManager] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [previewImg, setPreviewImg] = useState(null)
  const [showFavorites, setShowFavorites] = useState(false)
  const [showAi, setShowAi] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showSearch, setShowSearch] = useState(false)
  const [toast, setToast] = useState({ msg: "", show: false })
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const searchRef = useRef(null)
  const textareaRef = useRef(null)

  const allTags = [...DEFAULT_TAGS, ...customTags.filter(t => !DEFAULT_TAGS.includes(t))]

  // Load data
  useEffect(() => {
    (async () => {
      try {
        const [recs, ct] = await Promise.all([fetchRecords(), fetchCustomTags()])
        setRecords(recs)
        setCustomTags(ct)
      } catch (e) { console.error("Load error:", e) }
      setLoading(false)
    })()
  }, [])

  useEffect(() => { if (showSearch && searchRef.current) searchRef.current.focus() }, [showSearch])

  // Auto-resize textarea with max height and scrollbar
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = "0px"
    const sh = ta.scrollHeight
    const maxH = 300
    ta.style.height = Math.max(72, Math.min(sh, maxH)) + "px"
    ta.style.overflowY = sh > maxH ? "auto" : "hidden"
  }, [inputText])

  const flash = (msg) => {
    setToast({ msg, show: true })
    setTimeout(() => setToast(t => ({ ...t, show: false })), 1800)
  }

  const handleSave = async () => {
    if ((!inputText.trim() && imgFiles.length === 0) || saving) return
    setSaving(true)
    try {
      // Upload images
      const imageUrls = []
      for (const { file } of imgFiles) {
        const url = await uploadImage(file)
        imageUrls.push(url)
      }
      // Also keep existing images when editing
      const existingImages = editing?.images || []
      const allImages = [...existingImages, ...imageUrls]

      if (editing) {
        const updated = await updateRecord(editing.id, {
          content: inputText, tags: selectedTags, images: allImages, notes: inputNotes
        })
        setRecords(prev => prev.map(r => r.id === editing.id ? updated : r))
        setEditing(null)
        flash("已更新 ✨")
      } else {
        const rec = await createRecord({
          content: inputText, tags: selectedTags, images: allImages, notes: inputNotes
        })
        setRecords(prev => [rec, ...prev])
        flash("已保存 ✨")
      }
      setInputText(""); setInputNotes(""); setSelectedTags([]); setImgFiles([]); setShowNotes(false)
    } catch (e) {
      console.error("Save error:", e)
      flash("保存失败，请重试")
    }
    setSaving(false)
  }

  const handlePin = async (id, pinned) => {
    try {
      const updated = await updateRecord(id, { pinned })
      setRecords(prev => prev.map(r => r.id === id ? updated : r))
    } catch (e) { flash("操作失败") }
  }

  const handleFavorite = async (id, favorited) => {
    try {
      const updated = await updateRecord(id, { favorited })
      setRecords(prev => prev.map(r => r.id === id ? updated : r))
    } catch (e) { flash("操作失败") }
  }

  const handleDelete = async (id) => {
    try {
      await deleteRecord(id)
      setRecords(prev => prev.filter(r => r.id !== id))
      flash("已删除")
    } catch (e) { flash("删除失败") }
  }

  const handleCopy = async (text) => {
    try { await navigator.clipboard.writeText(stripFormat(text)); flash("已复制 📋") }
    catch { flash("复制失败") }
  }

  const insertFormat = (marker) => {
    const ta = textareaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end = ta.selectionEnd
    const text = inputText
    if (start === end) {
      // No selection - insert markers with placeholder
      const placeholder = marker === "**" ? "粗体文字" : "高亮文字"
      const newText = text.slice(0, start) + marker + placeholder + marker + text.slice(end)
      setInputText(newText)
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + marker.length, start + marker.length + placeholder.length) }, 0)
    } else {
      // Wrap selection
      const selected = text.slice(start, end)
      const newText = text.slice(0, start) + marker + selected + marker + text.slice(end)
      setInputText(newText)
      setTimeout(() => { ta.focus(); ta.setSelectionRange(start + marker.length, end + marker.length) }, 0)
    }
  }

  const handleEdit = (record) => {
    setEditing(record); setInputText(record.content); setInputNotes(record.notes || "")
    setSelectedTags([...record.tags]); setImgFiles([])
    if (record.notes) setShowNotes(true)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const handleImageUpload = (e) => {
    Array.from(e.target.files).forEach(file => {
      const preview = URL.createObjectURL(file)
      setImgFiles(prev => [...prev, { file, preview }])
    })
    e.target.value = ""
  }

  const toggleTag = (tag) => setSelectedTags(prev =>
    prev.includes(tag) ? prev.filter(t=>t!==tag) : [...prev, tag]
  )

  const cancelEdit = () => {
    setEditing(null); setInputText(""); setInputNotes(""); setSelectedTags([]); setImgFiles([]); setShowNotes(false)
  }

  const handleAddTag = async (name) => {
    if (allTags.includes(name)) return
    try {
      await addCustomTag(name)
      setCustomTags(prev => [...prev, name])
    } catch (e) { flash("添加失败") }
  }

  const handleDeleteTag = async (name) => {
    try {
      await deleteCustomTag(name)
      setCustomTags(prev => prev.filter(t => t !== name))
    } catch (e) { flash("删除失败") }
  }

  // Filter & sort
  const displayRecords = records
    .filter(r => {
      if (showFavorites && !r.favorited) return false
      if (filterTag && !r.tags.includes(filterTag)) return false
      if (calendarDate && fmt(r.created_at) !== calendarDate) return false
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase()
        if (!r.content.toLowerCase().includes(q) && !r.tags.some(t=>t.toLowerCase().includes(q))) return false
      }
      return true
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.created_at) - new Date(a.created_at)
    })

  const tagCounts = {}
  records.forEach(r => r.tags.forEach(t => { tagCounts[t] = (tagCounts[t]||0)+1 }))

  if (loading) {
    return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#FBF6F1"}}><div style={{color:"#D4A5C9",fontSize:14}}>加载中…</div></div>
  }

  const hasContent = inputText.trim() || imgFiles.length > 0

  return (
    <div style={{minHeight:"100vh",background:"#FBF6F1",maxWidth:520,margin:"0 auto",position:"relative"}}>
      {/* Header */}
      <div className="app-header" style={{
        padding:"20px 20px 0",background:"linear-gradient(180deg, #F5EDE8 0%, #FBF6F1 100%)",
        position:"sticky",top:0,zIndex:30
      }}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <h1 style={{margin:0,fontSize:22,fontWeight:700,color:"#5D4E60",letterSpacing:-0.5}}>✿ 剪贴板仓库</h1>
          <div style={{display:"flex",gap:4,alignItems:"center"}}>
            <button onClick={()=>{setShowSearch(!showSearch);if(showSearch)setSearchQuery("")}} style={{
              padding:"6px 8px",borderRadius:10,border:"none",
              background:showSearch?"#5D4E60":"transparent",color:showSearch?"white":"#B39DAD",
              cursor:"pointer",display:"flex",alignItems:"center",transition:"all 0.2s"
            }}><I.Search/></button>
            <button onClick={()=>setShowExport(true)} style={{
              padding:"6px 8px",borderRadius:10,border:"none",background:"transparent",
              color:"#B39DAD",cursor:"pointer",display:"flex",alignItems:"center"
            }}><I.Export/></button>
            <button onClick={()=>setShowAi(true)} style={{
              padding:"6px 8px",borderRadius:10,border:"none",
              background:"transparent",color:"#B39DAD",
              cursor:"pointer",display:"flex",alignItems:"center",transition:"all 0.2s"
            }}><I.Ai/></button>
          </div>
        </div>

        {showSearch && <div style={{marginBottom:12,animation:"slideIn 0.2s ease"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,background:"white",
            borderRadius:12,padding:"8px 14px",border:"1.5px solid #EDE4DD",
            boxShadow:"0 2px 10px rgba(180,160,170,0.08)"}}>
            <I.Search/>
            <input ref={searchRef} value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
              placeholder="搜索内容或标签…" style={{
                flex:1,border:"none",outline:"none",fontSize:14,color:"#5D4E60",
                background:"transparent",fontFamily:"inherit"}}/>
            {searchQuery && <button onClick={()=>setSearchQuery("")} style={{
              background:"none",border:"none",cursor:"pointer",color:"#C9B8BF",padding:2,display:"flex"
            }}><I.Close/></button>}
          </div>
          {searchQuery.trim() && <div style={{fontSize:11,color:"#B39DAD",marginTop:6,fontWeight:500,paddingLeft:4}}>
            找到 {displayRecords.length} 条结果
          </div>}
        </div>}

        <div style={{display:"flex",gap:4,marginBottom:8}}>
          <button onClick={()=>{setView("list");setCalendarDate(null);setShowFavorites(false)}} style={{
            padding:"6px 12px",borderRadius:10,border:"none",fontSize:12,
            background:view==="list"&&!showFavorites?"#5D4E60":"transparent",color:view==="list"&&!showFavorites?"white":"#B39DAD",
            cursor:"pointer",fontWeight:500,transition:"all 0.2s"}}>列表</button>
          <button onClick={()=>{setShowFavorites(!showFavorites);setView("list");setCalendarDate(null)}} style={{
            padding:"6px 12px",borderRadius:10,border:"none",fontSize:12,
            background:showFavorites?"#E88CA5":"transparent",color:showFavorites?"white":"#B39DAD",
            cursor:"pointer",fontWeight:500,transition:"all 0.2s"}}>♥ 收藏</button>
          <button onClick={()=>{if(view==="calendar"){setView("list");setCalendarDate(null)}else setView("calendar")}} style={{
            padding:"6px 12px",borderRadius:10,border:"none",fontSize:12,
            background:view==="calendar"?"#5D4E60":"transparent",color:view==="calendar"?"white":"#B39DAD",
            cursor:"pointer",fontWeight:500,display:"flex",alignItems:"center",gap:4,transition:"all 0.2s"
          }}><I.Cal/> 日历</button>
          <button onClick={()=>setShowTagPanel(!showTagPanel)} style={{
            padding:"6px 12px",borderRadius:10,border:"none",fontSize:12,
            background:showTagPanel?"#5D4E60":"transparent",color:showTagPanel?"white":"#B39DAD",
            cursor:"pointer",fontWeight:500,display:"flex",alignItems:"center",gap:4,transition:"all 0.2s"
          }}><I.Tag/> 标签</button>
        </div>
      </div>

      {/* Input */}
      <div style={{padding:"12px 20px 0"}}>
        <div style={{background:"#FFFFFF",borderRadius:18,padding:16,
          border:editing?"1.5px solid #D4A5C9":"1px solid #F0EAE4",
          boxShadow:"0 4px 20px rgba(180,160,170,0.08)",transition:"border-color 0.3s"}}>
          {editing && <div style={{fontSize:11,color:"#D4A5C9",marginBottom:8,fontWeight:600,
            display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>编辑模式</span>
            <button onClick={cancelEdit} style={{background:"none",border:"none",color:"#B39DAD",
              cursor:"pointer",fontSize:11,textDecoration:"underline"}}>取消</button>
          </div>}
          <textarea ref={textareaRef} value={inputText} onChange={e=>setInputText(e.target.value)}
            placeholder="写点什么…"
            style={{width:"100%",border:"none",outline:"none",resize:"none",overflow:"hidden",
              fontSize:14,lineHeight:1.75,color:"#4A3F4A",background:"transparent",
              fontFamily:"inherit",minHeight:72}}/>
          {/* New image previews */}
          {imgFiles.length > 0 && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
            {imgFiles.map((img,i) => <div key={i} style={{position:"relative"}}>
              <img src={img.preview} style={{width:56,height:56,objectFit:"cover",borderRadius:10,border:"1px solid #F0E6DF"}}/>
              <button onClick={()=>setImgFiles(prev=>prev.filter((_,j)=>j!==i))} style={{
                position:"absolute",top:-4,right:-4,width:18,height:18,borderRadius:9,
                background:"#D4A5C9",color:"white",border:"none",cursor:"pointer",fontSize:10,
                display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>)}
          </div>}
          {/* Existing images when editing */}
          {editing && editing.images && editing.images.length > 0 && <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:8}}>
            {editing.images.map((img,i) => <img key={i} src={img} style={{
              width:56,height:56,objectFit:"cover",borderRadius:10,border:"1px solid #F0E6DF",opacity:0.7}}/>)}
          </div>}
          {/* Tags */}
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:10,paddingTop:10,borderTop:"1px solid #F5EDE8"}}>
            <button onClick={()=>setShowNotes(!showNotes)} style={{
              padding:"4px 10px",borderRadius:8,fontSize:12,border:"none",cursor:"pointer",
              background:showNotes||inputNotes?"#E8C07C20":"#F5EDE8",
              color:showNotes||inputNotes?"#E8A87C":"#C9B8BF",fontWeight:500,
              display:"flex",alignItems:"center",gap:3,transition:"all 0.2s"
            }}>✎ 备注{inputNotes?" ·":"" }</button>
            {allTags.map(tag => {
              const active = selectedTags.includes(tag)
              return <button key={tag} onClick={()=>toggleTag(tag)} style={{
                padding:"4px 12px",borderRadius:8,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",
                transition:"all 0.2s",background:active?getTagColor(tag):`${getTagColor(tag)}12`,
                color:active?"white":getTagColor(tag)
              }}>{tag}</button>
            })}
            <button onClick={()=>setShowTagManager(true)} style={{
              padding:"4px 10px",borderRadius:8,fontSize:12,border:"1.5px dashed #DDD4CE",
              background:"none",cursor:"pointer",color:"#C9B8BF",display:"flex",alignItems:"center",gap:2
            }}><I.Plus/> 管理</button>
          </div>
          {/* Notes */}
          {showNotes && <div style={{marginTop:10,animation:"slideIn 0.2s ease"}}>
            <input value={inputNotes} onChange={e=>setInputNotes(e.target.value)}
              placeholder="备注：来源、用途、心情…（复制时不会带上）"
              style={{width:"100%",padding:"8px 12px",borderRadius:10,
                border:"1.5px solid #F0E6DF",fontSize:12,color:"#8A7A6D",
                background:"#FFFBF5",outline:"none",fontFamily:"inherit"}}/>
          </div>}
          {/* Actions */}
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12}}>
            <div style={{display:"flex",gap:2,alignItems:"center"}}>
              <FormatTools text={inputText} onFormat={setInputText}/>
              <button onClick={()=>insertFormat("**")} title="加粗" style={{
                background:"none",border:"none",cursor:"pointer",color:"#B39DAD",
                padding:"4px 6px",borderRadius:6,fontSize:13,fontWeight:800,fontFamily:"serif",
                lineHeight:1
              }}>B</button>
              <button onClick={()=>insertFormat("==")} title="高亮" style={{
                background:"none",border:"none",cursor:"pointer",color:"#B39DAD",
                padding:"4px 6px",borderRadius:6,fontSize:11,fontWeight:600,lineHeight:1,
                display:"flex",alignItems:"center"
              }}><span style={{background:"#FCEABB",borderRadius:2,padding:"1px 4px"}}>H</span></button>
              <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handleImageUpload}/>
              <button onClick={()=>fileRef.current?.click()} style={{
                background:"none",border:"none",cursor:"pointer",color:"#B39DAD",
                padding:6,borderRadius:8,display:"flex",alignItems:"center",gap:4,fontSize:12
              }}><I.Img/> 图片</button>
              {inputText.length > 0 && <span style={{fontSize:11,color:"#C9B8BF",fontWeight:500,
                marginLeft:4}}>{stripFormat(inputText).length}字</span>}
            </div>
            <button onClick={handleSave} disabled={saving} style={{
              background: hasContent ? "linear-gradient(135deg, #D4A5C9 0%, #C9A5D4 100%)" : "#E8DFD8",
              color:"white",border:"none",borderRadius:12,padding:"8px 24px",fontSize:13,fontWeight:600,
              cursor: hasContent && !saving ? "pointer" : "default",
              transition:"all 0.25s",boxShadow: hasContent ? "0 4px 15px rgba(212,165,201,0.3)" : "none",
              opacity: saving ? 0.7 : 1
            }}>{saving ? "保存中…" : editing ? "更新" : "保存"}</button>
          </div>
        </div>
      </div>

      {/* Tag Panel */}
      {showTagPanel && <div style={{padding:"12px 20px 0",animation:"slideIn 0.25s ease"}}>
        <div style={{background:"#FFFFFF",borderRadius:16,padding:14,border:"1px solid #F0EAE4"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:12,color:"#B39DAD",fontWeight:600}}>按标签筛选</span>
            {filterTag && <button onClick={()=>setFilterTag(null)} style={{
              fontSize:11,color:"#D4A5C9",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"
            }}>清除筛选</button>}
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {allTags.map(tag => <button key={tag} onClick={()=>setFilterTag(filterTag===tag?null:tag)} style={{
              padding:"5px 12px",borderRadius:10,fontSize:12,fontWeight:500,border:"none",cursor:"pointer",
              transition:"all 0.2s",background:filterTag===tag?getTagColor(tag):`${getTagColor(tag)}12`,
              color:filterTag===tag?"white":getTagColor(tag),display:"flex",alignItems:"center",gap:4
            }}>
              {tag}
              {tagCounts[tag] && <span style={{fontSize:10,opacity:0.7,
                background:filterTag===tag?"rgba(255,255,255,0.25)":`${getTagColor(tag)}20`,
                padding:"1px 5px",borderRadius:6}}>{tagCounts[tag]}</span>}
            </button>)}
          </div>
        </div>
      </div>}

      {/* Calendar */}
      {view==="calendar" && <div style={{padding:"12px 20px 0",animation:"slideIn 0.25s ease"}}>
        <div style={{background:"#FFFFFF",borderRadius:16,padding:16,border:"1px solid #F0EAE4"}}>
          <CalendarView records={records} selectedDate={calendarDate}
            onSelectDate={d=>setCalendarDate(calendarDate===d?null:d)}/>
        </div>
        {calendarDate && <div style={{marginTop:8,fontSize:12,color:"#B39DAD",fontWeight:500,
          display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <span>📅 {calendarDate} 的记录</span>
          <button onClick={()=>setCalendarDate(null)} style={{
            fontSize:11,color:"#D4A5C9",background:"none",border:"none",cursor:"pointer",textDecoration:"underline"
          }}>查看全部</button>
        </div>}
      </div>}

      {/* Records */}
      <div style={{padding:"12px 20px 24px"}}>
        {(filterTag||calendarDate||searchQuery.trim()||showFavorites) && <div style={{
          fontSize:12,color:"#B39DAD",marginBottom:10,fontWeight:500
        }}>共 {displayRecords.length} 条记录</div>}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {displayRecords.length===0 ? (
            <div style={{textAlign:"center",padding:"48px 20px",color:"#C9B8BF",fontSize:13}}>
              {records.length===0 ? "还没有记录，写点什么吧 ✿" : "没有找到匹配的记录"}
            </div>
          ) : displayRecords.map((r,i) => (
            <div key={r.id} style={{animation:`slideIn 0.25s ease ${i*0.03}s both`}}>
              <RecordCard record={r} onPin={handlePin} onFavorite={handleFavorite} onDelete={handleDelete}
                onCopy={handleCopy} onEdit={handleEdit} onPreview={setPreviewImg} sq={searchQuery.trim()}/>
            </div>
          ))}
        </div>
      </div>

      <div className="app-bottom" style={{
        padding:"12px 20px 20px",textAlign:"center",fontSize:11,color:"#C9B8BF",fontWeight:500
      }}>共 {records.length} 条记录 · {allTags.length} 个标签 · {records.filter(r=>r.pinned).length} 置顶 · {records.filter(r=>r.favorited).length} 收藏
        <br/><button onClick={()=>signOut()} style={{fontSize:11,color:"#C9B8BF",background:"none",
          border:"none",cursor:"pointer",marginTop:4,textDecoration:"underline"}}>退出登录</button>
      </div>

      <Toast message={toast.msg} visible={toast.show}/>
      {showTagManager && <TagManager tags={allTags} customTags={customTags}
        onAdd={handleAddTag} onDelete={handleDeleteTag} onClose={()=>setShowTagManager(false)}/>}
      {showExport && <ExportModal records={records} filterTag={filterTag}
        calendarDate={calendarDate} onClose={()=>setShowExport(false)}/>}
      {showAi && <AiChat records={records} allTags={allTags} onClose={()=>setShowAi(false)}/>}
      {previewImg && <div onClick={()=>setPreviewImg(null)} style={{
        position:"fixed",inset:0,background:"rgba(30,25,30,0.9)",zIndex:9999,
        display:"flex",alignItems:"center",justifyContent:"center",
        padding:16
      }}>
        <img src={previewImg} style={{
          maxWidth:"92vw",maxHeight:"85vh",borderRadius:8,objectFit:"contain"
        }}/>
        <button onClick={()=>setPreviewImg(null)} style={{
          position:"fixed",top:16,right:16,background:"rgba(255,255,255,0.2)",
          border:"none",borderRadius:20,width:40,height:40,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",color:"white",
          fontSize:20,zIndex:10000
        }}>✕</button>
      </div>}
    </div>
  )
}

/* ====== Auth Wrapper ====== */
export default function App() {
  const [session, setSession] = useState(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getSession().then(s => { setSession(s); setChecking(false) })
    const { data: { subscription } } = onAuthChange(s => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (checking) {
    return <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"#FBF6F1",fontFamily:"'Noto Sans SC',sans-serif"}}>
      <div style={{color:"#D4A5C9",fontSize:14}}>加载中…</div>
    </div>
  }

  if (!session) {
    return <LoginScreen onLogin={() => {}} />
  }

  return <MainApp />
}
