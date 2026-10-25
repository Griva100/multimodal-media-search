import express from 'express';
import multer from 'multer';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {Deps} from './deps.js';
import {currentUser, hashPassword, verifyPassword, issueSession, sessionToken, sha256, allowAuthAttempt} from './auth.js';
import {vectorize, cosine, samples, type MediaAsset} from '../shared/search.js';

const credentials = z.object({email:z.string().trim().toLowerCase().email().max(254), password:z.string().min(10).max(128)});
const uuid = z.string().uuid();
const assetInput = z.object({
  title:z.string().trim().min(3).max(120), kind:z.enum(['image','audio','text']),
  description:z.string().trim().min(10).max(5000), tags:z.string().max(500).default(''),
}).strict();
const upload = multer({storage:multer.memoryStorage(), limits:{fileSize:2*1024*1024,files:1,fields:4,fieldSize:12000}});
const allowed = {
  image:['image/png','image/jpeg','image/webp'], audio:['audio/mpeg','audio/wav','audio/x-wav','audio/ogg'], text:['text/plain'],
};
const sampleAssets: MediaAsset[] = samples.map((s,i)=>({...s,id:`sample-${i+1}`,storageKey:null,mime:null,filename:null,createdAt:'2026-01-01T00:00:00.000Z',sample:1}));
const columns = `id,title,kind,description,tags,content,CASE WHEN file_data IS NULL THEN NULL ELSE id::text END AS "storageKey",mime,filename,created_at AS "createdAt",0 AS sample`;

export function createApp(d: Deps) {
  const app=express(); app.disable('x-powered-by'); app.set('trust proxy',1);
  app.use((req,res,next)=>{
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','same-origin'); res.setHeader('X-Frame-Options','DENY');
    if(req.headers.origin && req.headers.origin!==`${req.protocol}://${req.get('host')}` && req.headers.origin!==process.env.APP_URL){res.status(403).json({error:'Cross-origin request rejected'});return;}
    next();
  });
  app.use(express.json({limit:'24kb'}));
  app.use('/api',(_req,res,next)=>{res.setHeader('Cache-Control','no-store');next();});
  app.get('/api/health',async(_req,res)=>{await d.pool.query('SELECT 1');res.json({status:'ok',storage:'postgresql'});});
  app.post('/api/auth/register',async(req,res)=>{
    const input=credentials.extend({name:z.string().trim().min(2).max(60)}).strict().parse(req.body);
    if(!await allowAuthAttempt(d,req,input.email)){res.status(429).json({error:'Too many attempts. Try again later.'});return;}
    const id=randomUUID(); await d.pool.query('INSERT INTO media_users(id,email,name,password_hash) VALUES($1,$2,$3,$4)',[id,input.email,input.name,await hashPassword(input.password)]);
    await issueSession(d,req,res,id); res.status(201).json({id,name:input.name,email:input.email});
  });
  app.post('/api/auth/login',async(req,res)=>{
    const input=credentials.strict().parse(req.body);
    if(!await allowAuthAttempt(d,req,input.email)){res.status(429).json({error:'Too many attempts. Try again later.'});return;}
    const user=(await d.pool.query('SELECT * FROM media_users WHERE email=$1',[input.email])).rows[0];
    if(!user||!await verifyPassword(input.password,user.password_hash)){res.status(401).json({error:'Email or password is incorrect.'});return;}
    await issueSession(d,req,res,user.id); res.json({id:user.id,name:user.name,email:user.email});
  });
  app.post('/api/auth/logout',async(req,res)=>{const token=sessionToken(req);if(token)await d.pool.query('DELETE FROM media_sessions WHERE token_hash=$1',[sha256(token)]);res.clearCookie('media_session',{path:'/'});res.status(204).end();});
  app.get('/api/media/search',async(req,res)=>{
    const q=z.string().max(300).parse(req.query.q??''),kind=z.enum(['all','image','audio','text']).parse(req.query.kind??'all');
    const user=await currentUser(d,req);
    const own:MediaAsset[]=user?(await d.pool.query(`SELECT ${columns} FROM media_assets WHERE user_id=$1 ORDER BY created_at DESC LIMIT 250`,[user.id])).rows:[];
    const library=[...own,...sampleAssets],queryVector=vectorize(q);
    const assets=library.filter(a=>kind==='all'||a.kind===kind).map(a=>q.trim()?{...a,score:cosine(queryVector,vectorize(`${a.title} ${a.tags.join(' ')} ${a.description} ${a.content}`))}:a).filter(a=>!q.trim()||(a.score??0)>.08).sort((a,b)=>(b.score??0)-(a.score??0));
    res.json({assets,total:library.length,signedIn:!!user});
  });
  app.use('/api/media',async(req,res,next)=>{const user=await currentUser(d,req);if(!user){res.status(401).json({error:'Sign in to manage your private media.'});return;}res.locals.user=user;next();});
  app.post('/api/media',upload.single('file'),async(req,res)=>{
    const input=assetInput.parse(req.body),file=req.file;
    if(file&&!allowed[input.kind].includes(file.mimetype)){res.status(400).json({error:'The file type does not match the selected format.'});return;}
    // No HTML or SVG is served. Files remain private and are only retrieved through ownership checks.
    const tags=[...new Set(input.tags.split(',').map(t=>t.trim()).filter(Boolean))].slice(0,12);
    const content=file&&input.kind==='text'?file.buffer.toString('utf8').slice(0,10000):input.description;
    const id=randomUUID(),filename=file?.originalname.replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120)??null;
    const result=await d.pool.query(`INSERT INTO media_assets(id,user_id,title,kind,description,tags,content,vector,file_data,filename,mime) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING ${columns}`,[id,res.locals.user.id,input.title,input.kind,input.description,JSON.stringify(tags),content,JSON.stringify(vectorize(`${input.title} ${tags.join(' ')} ${input.description} ${content}`)),file?.buffer??null,filename,file?.mimetype??null]);
    res.status(201).json(result.rows[0]);
  });
  app.get('/api/media/:id/file',async(req,res)=>{
    const id=uuid.parse(req.params.id),row=(await d.pool.query('SELECT file_data,mime,filename FROM media_assets WHERE id=$1 AND user_id=$2',[id,res.locals.user.id])).rows[0];
    if(!row?.file_data){res.status(404).json({error:'File not found'});return;}
    const file=row.file_data as Buffer;res.type(row.mime).setHeader('Content-Disposition',`${row.mime==='text/plain'?'attachment':'inline'}; filename="${row.filename}"`);res.setHeader('Accept-Ranges','bytes');
    if(req.headers.range){
      const range=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);let start=0,end=file.length-1;
      if(range){if(range[1]){start=Number(range[1]);if(range[2])end=Math.min(Number(range[2]),end);}else if(range[2])start=Math.max(0,file.length-Number(range[2]));}
      if(!range||(!range[1]&&!range[2])||start>end||start>=file.length){res.status(416).setHeader('Content-Range',`bytes */${file.length}`);res.end();return;}
      res.status(206).setHeader('Content-Range',`bytes ${start}-${end}/${file.length}`);res.send(file.subarray(start,end+1));return;
    }
    res.send(file);
  });
  app.delete('/api/media/:id',async(req,res)=>{const id=uuid.parse(req.params.id);const result=await d.pool.query('DELETE FROM media_assets WHERE id=$1 AND user_id=$2',[id,res.locals.user.id]);if(!result.rowCount){res.status(404).json({error:'Asset not found'});return;}res.status(204).end();});
  app.use('/api',(_req,res)=>res.status(404).json({error:'API route not found'}));
  const errors:express.ErrorRequestHandler=(error,_req,res,_next)=>{
    if(error instanceof z.ZodError){res.status(400).json({error:error.issues.map(i=>`${i.path.join('.')}: ${i.message}`).join('; ')});return;}
    if(error instanceof multer.MulterError){res.status(error.code==='LIMIT_FILE_SIZE'?413:400).json({error:error.code==='LIMIT_FILE_SIZE'?'Files must be 2 MB or smaller.':'Invalid upload request.'});return;}
    if(error?.code==='23505'){res.status(409).json({error:'An account with this email already exists.'});return;}
    if(error?.type==='entity.too.large'){res.status(413).json({error:'Request is too large'});return;}
    if(error instanceof SyntaxError){res.status(400).json({error:'Invalid JSON request'});return;}
    console.error('Media API failed',error?.code??'unexpected');res.status(500).json({error:'The request could not be completed. Please try again.'});
  };app.use(errors);return app;
}
