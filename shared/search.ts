export type MediaKind = 'image' | 'audio' | 'text';
export type MediaAsset = { id:string; title:string; kind:MediaKind; description:string; tags:string[]; content:string; storageKey:string|null; mime:string|null; filename:string|null; createdAt:string; sample:number; score?:number };
// Hand-authored concept vocabulary for the no-model demo; not learned media embeddings.
const concepts = [
  ['security','secure','login','auth','authentication','encryption','rbac','access','permission','permissions','password'],
  ['customer','customers','onboarding','welcome','activation','support','feedback','satisfaction','client'],
  ['team','teams','meeting','standup','stand-up','sprint','collaboration','planning','delivery','roadmap'],
  ['analytics','data','metrics','dashboard','chart','charts','report','reporting','insights','conversion'],
  ['design','interface','ui','ux','wireframe','layout','responsive','accessibility','keyboard'],
  ['performance','fast','latency','cache','caching','redis','speed','optimisation','optimization'],
  ['finance','budget','cost','costs','revenue','billing','invoice','payment'],
  ['nature','forest','green','trees','outdoors','landscape','environment'],
  ['code','api','apis','backend','node','typescript','react','engineering','implementation','software'],
  ['search','semantic','vector','retrieval','embedding','embeddings','similarity','indexing'],
  ['ai','model','models','assistant','llm','prompt','prompts','generation','generated'],
  ['test','tests','testing','quality','verification','validation','validate','bug'],
];
export function vectorize(text:string):number[] {
  const tokens=text.toLowerCase().match(/[a-z0-9]+(?:-[a-z]+)?/g)??[];
  const vector=new Array<number>(concepts.length+96).fill(0);
  for (const word of tokens) {
    const concept=concepts.findIndex(aliases=>aliases.includes(word));
    if (concept>=0) vector[concept]+=2;
    let hash=2166136261; for(const letter of word) hash=Math.imul(hash^letter.charCodeAt(0),16777619);
    vector[concepts.length+(hash>>>0)%96]+=.35;
  }
  const norm=Math.hypot(...vector)||1;
  return vector.map(x=>x/norm);
}
export function cosine(a:number[], b:number[]):number {
  if(a.length!==b.length) return 0;
  return a.reduce((sum,value,i)=>sum+value*b[i],0)/(Math.hypot(...a)*Math.hypot(...b)||1);
}
export const samples:Array<Pick<MediaAsset,'title'|'kind'|'description'|'tags'|'content'>> = [
  {title:'Access control architecture',kind:'image',description:'Sample diagram metadata showing authentication, roles and protected API routes.',tags:['security','architecture','RBAC'],content:'Client requests pass through a login and authentication layer. Access permissions protect project data.'},
  {title:'Customer onboarding walkthrough',kind:'audio',description:'Sample transcript from a product walkthrough; no recording is attached.',tags:['customers','onboarding','activation'],content:'Welcome to the workspace. Create your first project, invite your team and complete the onboarding checklist. Our goal is to help each customer reach their first useful outcome.'},
  {title:'Sprint planning notes',kind:'text',description:'Sample delivery notes for a small full stack product team.',tags:['team','sprint','roadmap'],content:'The team agreed to ship the project API before starting the React board. The next sprint covers task permissions, acceptance criteria and the release checklist.'},
  {title:'Product analytics dashboard',kind:'image',description:'Sample image metadata describing customer activation charts and weekly metrics.',tags:['analytics','dashboard','conversion'],content:'Four charts display weekly signups, onboarding completion, active projects and customer feedback. Dashboard filters include date range and project.'},
  {title:'API performance review',kind:'audio',description:'Sample engineering review transcript; no recording is attached.',tags:['performance','API','Redis'],content:'We discussed query latency, database indexes and Redis caching. Measure endpoint response times before making performance changes, then compare the same workload.'},
  {title:'Design and accessibility checklist',kind:'text',description:'Sample guidance for a responsive and accessible product interface.',tags:['design','accessibility','responsive'],content:'Use visible labels, clear keyboard focus, meaningful errors and readable text. Check the mobile layout, empty states and screen reader announcements.'},
  {title:'Vector search implementation notes',kind:'text',description:'Sample notes about metadata indexing, cosine similarity and evaluation.',tags:['search','vector','testing'],content:'Normalize the index vectors, compute cosine similarity for each query, then rank and filter results. Evaluate query relevance separately from retrieval latency.'},
  {title:'Quarterly budget overview',kind:'image',description:'Sample finance chart metadata showing infrastructure costs and revenue categories.',tags:['finance','budget','analytics'],content:'The budget separates hosting costs, API usage, support and billing. Review monthly spend against the planned budget.'},
];
