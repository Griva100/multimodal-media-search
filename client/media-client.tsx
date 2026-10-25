"use client";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { MediaAsset, MediaKind } from '../shared/search.js';

function Dialog({title,children,close}:{title:string;children:ReactNode;close:()=>void}) {
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{ref.current?.showModal();},[]);
  return <dialog className="media-dialog" ref={ref} aria-labelledby="media-dialog-title" onCancel={close}><div className="dialog-head"><h2 id="media-dialog-title">{title}</h2><button className="icon-button" aria-label="Close dialog" onClick={close}>×</button></div>{children}</dialog>;
}
function Poster({asset}:{asset:MediaAsset}) {
  if(asset.storageKey && asset.kind==='image') return <img className="media-photo" src={`/api/media/${asset.id}/file`} alt={asset.description}/>;
  return <div className={`media-poster ${asset.kind}`} aria-hidden="true">{asset.kind==='image'?<svg viewBox="0 0 320 145"><rect x="28" y="26" width="264" height="94" rx="7" fill="white" opacity=".55"/><path d="M49 95h224M49 80h224M49 65h224M49 50h224" stroke="currentColor" opacity=".13"/>{[50,70,40,80,60,100,75].map((n,i)=><rect key={i} x={60+i*29} y={118-n*.7} width="16" height={n*.7} rx="3" fill="currentColor" opacity={.3+i*.06}/>)}</svg>:asset.kind==='audio'?<svg viewBox="0 0 320 145"><circle cx="55" cy="74" r="20" fill="white" opacity=".55"/><path d="m51 65 12 9-12 9z" fill="currentColor"/>{Array.from({length:32},(_,i)=><rect key={i} x={95+i*5.2} y={74-(10+(i*13%47))/2} width="2.4" height={10+(i*13%47)} rx="1.2" fill="currentColor" opacity=".6"/>)}</svg>:<svg viewBox="0 0 320 145"><rect x="62" y="18" width="196" height="117" rx="6" fill="white" opacity=".65"/><rect x="82" y="40" width="98" height="7" rx="3" fill="currentColor" opacity=".5"/>{[140,120,146,107,131].map((n,i)=><rect key={i} x="82" y={62+i*12} width={n} height="4" rx="2" fill="currentColor" opacity=".16"/>)}</svg>}<span>{asset.sample?'SAMPLE METADATA':'METADATA RECORD'}</span></div>;
}
export default function MediaClient() {
  const [auth,setAuth]=useState(false);
  const [register,setRegister]=useState(false);
  const [authError,setAuthError]=useState('');
  async function authenticate(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setAuthError('');const f=new FormData(event.currentTarget);try{const response=await fetch('/api/auth/'+(register?'register':'login'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:f.get('email'),password:f.get('password'),...(register?{name:f.get('name')}:{})})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to sign in');setAuth(false);setRevision(v=>v+1);}catch(e){setAuthError(e instanceof Error?e.message:'Unable to sign in');}finally{setBusy(false);}}
  async function logout(){await fetch('/api/auth/logout',{method:'POST'});setSignedIn(false);setDetail(null);setRevision(v=>v+1);}
  const [query,setQuery]=useState('');
  const [submitted,setSubmitted]=useState('');
  const [kind,setKind]=useState<MediaKind|'all'>('all');
  const [assets,setAssets]=useState<MediaAsset[]>([]);
  const [total,setTotal]=useState(0);
  const [signedIn,setSignedIn]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [adding,setAdding]=useState(false);
  const [uploadKind,setUploadKind]=useState<MediaKind>('text');
  const [detail,setDetail]=useState<MediaAsset|null>(null);
  const [revision,setRevision]=useState(0);
  useEffect(()=>{
    let ignore=false; setLoading(true); setError('');
    fetch(`/api/media/search?${new URLSearchParams({q:submitted,kind})}`).then(async response=>{
      const data=await response.json() as {assets:MediaAsset[];total:number;signedIn:boolean;error?:string}; if(!response.ok) throw new Error(data.error||'Unable to load the media index');
      if(!ignore) {setAssets(data.assets);setTotal(data.total);setSignedIn(data.signedIn);}
    }).catch(e=>{if(!ignore)setError(e.message);}).finally(()=>{if(!ignore)setLoading(false);});
    return ()=>{ignore=true;};
  },[submitted,kind,revision]);
  async function addAsset(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form=new FormData(event.currentTarget); setBusy(true);setError('');
    try {
      const response=await fetch('/api/media',{method:'POST',body:form}); const data=await response.json() as {error?:string};
      if(!response.ok) throw new Error(data.error||'Upload failed');
      setAdding(false);setSubmitted('');setQuery('');setKind('all');setRevision(v=>v+1);setNotice('Asset saved and indexed.');
    } catch(e){setError(e instanceof Error?e.message:'Upload failed');} finally{setBusy(false);}
  }
  async function remove(asset:MediaAsset) {
    setBusy(true);setError('');
    try {const response=await fetch(`/api/media/${asset.id}`,{method:'DELETE'});if(!response.ok){const data=await response.json() as {error?:string};throw new Error(data.error);}setDetail(null);setRevision(v=>v+1);setNotice('Asset removed.');}
    catch(e){setError(e instanceof Error?e.message:'Unable to remove asset');}finally{setBusy(false);}
  }
  function search(value:string){setQuery(value);setSubmitted(value);setNotice('');}
  return <div className="media-app">
    <header className="media-nav"><a className="media-brand" href="/"><span>m<span>·</span></span> media index</a><nav><a href="https://github.com/Griva100/multimodal-media-search" target="_blank" rel="noreferrer">Source code ↗</a><span>Griva Shah</span></nav></header>
    <main className="media-main">
      <div className="media-heading"><div><p className="eyebrow">ONE LIBRARY. MORE WAYS TO FIND IT.</p><h1>Find the thought.<br/><span>Across every format.</span></h1><p>Search image captions, audio transcripts and documents<br className="desktop-break"/> in one organised workspace.</p></div><div className="media-orbit" aria-hidden="true"><span>IMG</span><i/><span>TXT</span><b>✧</b><span>WAV</span></div></div>
      <form className="media-search" onSubmit={e=>{e.preventDefault();search(query.trim());}}><span aria-hidden="true">⌕</span><input autoComplete="off" aria-label="Search media" value={query} maxLength={300} onChange={e=>setQuery(e.target.value)} placeholder="Try ‘secure login’ or ‘customer activation’"/><button className="primary" type="submit">Search library <span>↗</span></button></form>
      <div className="media-suggestions"><span>Explore an idea</span>{['secure login','customer activation','team planning','faster APIs'].map(q=><button key={q} onClick={()=>search(q)}>{q} ↗</button>)}{submitted&&<button onClick={()=>search('')}>Clear search ×</button>}</div>
      <section className="media-method"><span className="media-mode-dot"/><div><strong>Concept-vector demo</strong><p>Search uses captions, transcripts, tags and a small synonym vocabulary with cosine similarity. No image recognition, speech transcription or AI model is called.</p></div><details><summary>How it works</summary><p>Metadata becomes a normalised vector. Related terms such as “login” and “authentication” share a concept dimension. Query vectors are compared with asset vectors and ranked by similarity. The score measures this demo's similarity, not correctness. Add your own descriptive metadata to improve retrieval.</p></details></section>
      <div aria-live="polite">{error&&!adding&&!detail&&<div className="message error" role="alert">{error}<button onClick={()=>setRevision(v=>v+1)}>Retry</button></div>}{notice&&<div className="message success">{notice}</div>}</div>
      <section aria-labelledby="library-title"><div className="media-toolbar"><div><h2 id="library-title">{submitted?'Search results':'Your media library'}</h2><p>{loading?'Loading the index…':`${assets.length} ${submitted?'matches':'records'} · ${total} total assets`}</p></div><div>{signedIn?<><button className="secondary" onClick={()=>{setAdding(true);setError('');}}>+ Add media</button><button className="text-button" onClick={logout}>Sign out</button></>:<button className="secondary" onClick={()=>{setAuth(true);setAuthError('');}}>Sign in to add media ↗</button>}</div></div><div className="media-filters" role="group" aria-label="Filter media type">{(['all','image','audio','text'] as const).map(k=><button aria-pressed={kind===k} className={kind===k?'selected':''} key={k} onClick={()=>setKind(k)}>{k==='all'?'All formats':k==='image'?'Images':k==='audio'?'Audio':'Documents'}</button>)}</div>
        {loading?<div className="media-empty">Preparing your library…</div>:assets.length===0?<div className="media-empty"><h3>No matching records.</h3><p>Try a broader query or add descriptive captions and tags to your own media.</p><button className="secondary" onClick={()=>{search('');setKind('all');}}>View all media</button></div>:<div className="media-grid">{assets.map(asset=><button className="media-card" key={asset.id} onClick={()=>{setDetail(asset);setError('');}}><Poster asset={asset}/><div className="media-card-body"><div className="media-card-meta"><span>{asset.kind==='text'?'DOCUMENT':asset.kind.toUpperCase()}</span>{asset.score!==undefined&&<b>{Math.round(asset.score*100)}% similarity</b>}</div><h3>{asset.title}</h3><p>{asset.description}</p><div className="media-tags">{asset.tags.slice(0,3).map((tag,i)=><span key={i}>{tag}</span>)}</div></div></button>)}</div>}
      </section>
      <footer className="media-footer"><span>Multimodal Media Search · Built by Griva Shah</span><span>Captions + transcripts + text → concept vectors → ranked retrieval</span></footer>
    </main>
    {auth&&<Dialog title={register?'Create your account':'Welcome back'} close={()=>{if(!busy)setAuth(false);}}>{authError&&<p className="message error" role="alert">{authError}</p>}<form onSubmit={authenticate}>{register&&<label>Name<input name="name" minLength={2} maxLength={60} required autoComplete="name"/></label>}<label>Email<input name="email" type="email" autoComplete="email" required maxLength={254}/></label><label>Password<input name="password" type="password" minLength={10} maxLength={128} required autoComplete={register?'new-password':'current-password'}/></label><button className="primary" disabled={busy}>{busy?'Please wait…':register?'Create account':'Sign in'}</button><button type="button" className="text-button" onClick={()=>{setRegister(v=>!v);setAuthError('');}}>{register?'Already have an account? Sign in':'New here? Create an account'}</button></form></Dialog>}
    {adding&&<Dialog title="Add media to your library" close={()=>{if(!busy){setAdding(false);setError('');}}}>{error&&<div className="message error" role="alert">{error}</div>}<p className="dialog-intro">Add a file or a metadata-only record. For images, write a caption; for audio, supply a transcript. This demo does not automatically interpret raw media.</p><form onSubmit={addAsset}><label>Title<input name="title" required minLength={3} maxLength={120}/></label><label>Format<select name="kind" value={uploadKind} onChange={e=>setUploadKind(e.target.value as MediaKind)}><option value="text">Text document</option><option value="image">Image</option><option value="audio">Audio</option></select></label><label>{uploadKind==='audio'?'Transcript and description':uploadKind==='image'?'Caption and description':'Document text or description'}<textarea name="description" required minLength={10} maxLength={5000} rows={5}/></label><label>Tags (comma separated)<input name="tags" maxLength={500} placeholder="e.g. security, authentication, architecture"/></label><label>File (optional, up to 2 MB)<input key={uploadKind} type="file" name="file" accept={uploadKind==='image'?'.png,.jpg,.jpeg,.webp':uploadKind==='audio'?'.mp3,.wav,.ogg':'.txt'}/></label><p className="muted">Files are stored privately. Plain text is indexed; other formats use the caption or transcript you provide.</p><button className="primary" disabled={busy}>{busy?'Saving and indexing…':'Save to library'}</button></form></Dialog>}
    {detail&&<Dialog title={detail.title} close={()=>{if(!busy){setDetail(null);setError('');}}}>{error&&<div className="message error" role="alert">{error}</div>}<Poster asset={detail}/><p className="dialog-intro" style={{marginTop:15}}>{detail.description}</p>{detail.storageKey&&detail.kind==='audio'&&<audio controls src={`/api/media/${detail.id}/file`}/>}<div className="media-tags">{detail.tags.map((tag,i)=><span key={i}>{tag}</span>)}</div><h3 className="media-detail-label">Indexed {detail.kind==='audio'?'transcript':detail.kind==='image'?'caption':'text'}</h3><p className="media-content">{detail.content}</p>{detail.storageKey&&<a className="secondary" href={`/api/media/${detail.id}/file`} download={detail.filename||'media-file'}>Download file ↗</a>}{detail.sample?<p className="muted">Sample metadata record; no original source file is attached.</p>:<button className="secondary" disabled={busy} onClick={()=>remove(detail)}>{busy?'Removing…':'Delete this asset'}</button>}</Dialog>}
  </div>;
}
