const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const Deck = require('../model/PresentationDeck');
const Share = require('../model/PresentationShare');
const Asset = require('../model/PresentationAsset');
const User = require('../model/User');
const { hashToken } = require('../services/presentationDocument');
const clone = v => v == null ? v : JSON.parse(JSON.stringify(v));
let stored, shares, pythonCalls, missingPythonSessionOnce;
const query = value => ({ lean: async () => clone(value) });
const base = () => ({ deckId:'python-deck', ownerId:'owner', deckRef:'gradeup:python-deck', pythonSessionId:'python-session', editUrl:'https://gradeup.example/seminar/slides/python-deck', embedUrl:'https://gradeup.example/seminar/slides/python-deck/present', title:'Science', theme:{}, slides:[{id:'s1',title:'One',background:'#ffffff',notes:'',elements:[]},{id:'s2',title:'Two',background:'#ffffff',notes:'',elements:[]}], revision:0, collaborators:[{userId:'viewer',role:'viewer'},{userId:'editor',role:'editor'}],messages:[],proposal:null,aiLock:null,receipts:[],history:[],sessionEnded:false,deletedAt:null });
function matches(filter) { return stored && (!filter.deckId || stored.deckId === filter.deckId) && (filter.revision === undefined || stored.revision === filter.revision) && !stored.deletedAt; }
function update(patch) {
  Object.assign(stored, clone(patch.$set || {}));
  for(const [key,value] of Object.entries(patch.$inc || {})) stored[key] = (stored[key] || 0) + value;
  for(const [key,value] of Object.entries(patch.$push || {})) stored[key] = [...stored[key], ...clone(value.$each)].slice(value.$slice);
}
Deck.findOne = filter => query(matches(filter) ? stored : null);
Deck.findOneAndUpdate = (filter, patch) => { if (!matches(filter)) return query(null); update(patch); return query(stored); };
Deck.updateOne = async (filter, patch) => { if(!matches(filter))return {modifiedCount:0}; if(filter.$or && stored.aiLock && new Date(stored.aiLock.until)>new Date())return {modifiedCount:0}; update(patch); return {modifiedCount:1}; };
Deck.create = async data => { stored={...base(),...clone(data)}; return stored; };
Deck.aggregate = async () => stored ? [{ deckId:stored.deckId,title:stored.title,editUrl:stored.editUrl,embedUrl:stored.embedUrl,context:stored.context || {},revision:stored.revision,slideCount:stored.slides.length,sessionEnded:stored.sessionEnded,role:'owner',createdAt:new Date(),updatedAt:new Date() }] : [];
Asset.countDocuments = async () => 0;
Share.findOne = filter => query(shares.find(s => s.deckId===filter.deckId && s.tokenHash===filter.tokenHash && !s.revokedAt && new Date(s.expiresAt)>new Date()) || null);
User.findOne = filter => ({ select: () => query(filter._id === '507f1f77bcf86cd799439011' ? { _id: filter._id } : null) });
require.cache[require.resolve('../middleware/studentAuth')] = { exports:{ requireStudentAuth(req,res,next) { const id=req.headers['x-test-user']; if(!id)return res.status(401).json({status:false,message:'Sign in'});req.studentUser={_id:id};next(); } } };
require.cache[require.resolve('../services/pythonGateway')] = { exports:{ async callPython({path,data}) {
  pythonCalls.push({path,data:clone(data)});
  if(missingPythonSessionOnce.has(path)) {
    missingPythonSessionOnce.delete(path);
    throw Object.assign(new Error('Unknown session_id — call /ppt/session/start first'), { statusCode:404, source:'python' });
  }
  if(path==='/ppt/session/restore')return {status:'restored',session_id:data.session_id};
  if(path==='/ppt/suggest')return {status:'awaiting_approval',proposal_id:'p1',ai_feedback:'Add approved text',operations:[{op:'add_element',slide_id:data.slide_id,element:{id:'e1',type:'text',x:80,y:100,width:500,height:100,text:'AI content'}}]};
  if(path==='/ppt/decide')return {status:'done',proposal_id:data.proposal_id};
  return {status:'ended',session_id:data.session_id};
} } };
const app=express();app.use(express.json());app.use(require('../router/Presentations'));
let server,origin;
test.before(async()=>{server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));origin=`http://127.0.0.1:${server.address().port}`;});
test.after(()=>new Promise(resolve=>server.close(resolve)));
test.beforeEach(()=>{stored=base();shares=[];pythonCalls=[];missingPythonSessionOnce=new Set();process.env.GRADEUP_INTERNAL_API_KEY='test-internal-key';});
async function request(path,method='GET',body,identity='owner',shareToken) { const response=await fetch(origin+path,{method,headers:{'Content-Type':'application/json',...(identity?{'x-test-user':identity}:{}),...(shareToken?{'x-presentation-share':shareToken}:{})},body:body===undefined?undefined:JSON.stringify(body)});return {...await response.json(),status:response.status}; }
const saveBody=()=>({title:stored.title,theme:stored.theme,slides:clone(stored.slides),base_revision:stored.revision,mutation_id:'save-1'});
test('authentication, owner, collaborator viewer and stranger access',async()=>{
  assert.equal((await request('/decks/python-deck','GET',undefined,null)).status,401);
  assert.equal((await request('/decks/python-deck','GET',undefined,'stranger')).status,403);
  assert.equal((await request('/decks/python-deck','GET',undefined,'viewer')).data.role,'viewer');
  const before=clone(stored); assert.equal((await request('/decks/python-deck','PATCH',saveBody(),'viewer')).status,403);assert.deepEqual(stored,before);
});
test('lists saved presentations with reopen metadata',async()=>{
  const response=await request('/decks');
  assert.equal(response.status,200);assert.equal(response.data[0].editUrl,stored.editUrl);assert.equal(response.data[0].slideCount,2);assert.equal(response.data[0].role,'owner');
});
test('share token respects expiry and revocation on every read/write',async()=>{
  shares.push({deckId:'python-deck',tokenHash:hashToken('valid'),role:'editor',expiresAt:new Date(Date.now()+60000),revokedAt:null});
  assert.equal((await request('/decks/python-deck','GET',undefined,'guest','valid')).data.role,'editor');
  shares[0].revokedAt=new Date();assert.equal((await request('/decks/python-deck','PATCH',saveBody(),'guest','valid')).status,403);
  shares[0].revokedAt=null;shares[0].expiresAt=new Date(Date.now()-1);assert.equal((await request('/decks/python-deck','GET',undefined,'guest','valid')).status,403);
});
test('CAS rejects a stale save and duplicate mutation does not overwrite',async()=>{
  const first=saveBody(),stale={...saveBody(),mutation_id:'stale',title:'Overwrite'};
  assert.equal((await request('/decks/python-deck','PATCH',first)).status,200);
  assert.equal(stored.revision,1);
  assert.equal((await request('/decks/python-deck','PATCH',stale)).status,409);
  assert.equal((await request('/decks/python-deck','PATCH',first)).status,200);assert.equal(stored.revision,1);
});
test('server snapshots selected slide and approval writes exact proposal once',async()=>{
  const suggested=await request('/decks/python-deck/ai/suggest','POST',{slide_id:'s2',query:'Add content',base_revision:0,mutation_id:'request-1',slide_snapshot:{title:'Untrusted'}});
  assert.equal(pythonCalls[0].data.slide_index,1);assert.equal(pythonCalls[0].data.slide_snapshot.title,'Two');assert.equal(stored.slides[1].elements.length,0);
  assert.equal(suggested.data.proposal.preview.slide.elements[0].text,'AI content');assert.equal(suggested.data.proposal.operations,undefined);
  const body={proposal_id:'p1',decision:'approve',base_revision:1,mutation_id:'decision-1'};
  await request('/decks/python-deck/ai/decide','POST',body);assert.equal(stored.slides[1].elements[0].text,'AI content');assert.equal(stored.slides[0].elements.length,0);
  await request('/decks/python-deck/ai/decide','POST',body);assert.equal(stored.slides[1].elements.length,1);assert.equal(pythonCalls.length,2);
});
test('restores a missing Python session from the durable deck and retries once',async()=>{
  missingPythonSessionOnce.add('/ppt/suggest');
  const response=await request('/decks/python-deck/ai/suggest','POST',{slide_id:'s2',query:'Add content',base_revision:0,mutation_id:'request-recovery'});
  assert.equal(response.status,200);
  assert.deepEqual(pythonCalls.map(call=>call.path),['/ppt/suggest','/ppt/session/restore','/ppt/suggest']);
  const restore=pythonCalls[1];
  assert.equal(restore.data.session_id,stored.pythonSessionId);
  assert.equal(restore.data.deck_id,stored.deckId);
  assert.equal(restore.data.student_id,stored.ownerId);
  assert.deepEqual(restore.data.initial_slides,base().slides);
});
test('manual editing is blocked during a preview and foreign images are rejected',async()=>{
  await request('/decks/python-deck/ai/suggest','POST',{slide_id:'s1',query:'Add content',base_revision:0,mutation_id:'request-1'});
  assert.equal((await request('/decks/python-deck','PATCH',{...saveBody(),title:'Manual change'})).status,409);
  assert.equal(stored.slides[0].elements.length,0);
  assert.equal((await request('/decks/python-deck/ai/decide','POST',{proposal_id:'p1',decision:'skip',base_revision:1,mutation_id:'decision-1'})).status,200);
  const body=saveBody();body.slides[0].elements=[{id:'image',type:'image',x:0,y:0,width:100,height:100,assetId:'foreign'}];body.mutation_id='image-1';
  assert.equal((await request('/decks/python-deck','PATCH',body)).status,422);
});
test('Python-created identifiers and URLs survive Node persistence',async()=>{
  const {persistPythonDeck}=require('../services/presentationService');
  stored=null;process.env.PRESENTATION_ALLOWED_ORIGINS='https://gradeup.example';
  const data={deck_id:'python-deck',deck_ref:'gradeup:python-deck',session_id:'python-session',edit_url:'https://gradeup.example/seminar/slides/python-deck',embed_url:'https://gradeup.example/seminar/slides/python-deck/present',deck_mode:'gradeup',initial_slides:base().slides,theme_spec:{}};
  await persistPythonDeck(data,{title:'Science'},'owner');assert.equal(stored.deckId,data.deck_id);assert.equal(stored.pythonSessionId,data.session_id);assert.equal(stored.editUrl,data.edit_url);
  await persistPythonDeck(data,{title:'Science'},'owner');assert.equal(stored.slides.length,2);
});

test('Python can register a deck before its edit URL is opened',async()=>{
  stored=null;process.env.PRESENTATION_ALLOWED_ORIGINS='https://gradeup.example';
  const deck={deck_id:'direct-deck',deck_ref:'gradeup:direct-deck',session_id:'direct-session',edit_url:'https://gradeup.example/seminar/slides/direct-deck',embed_url:'https://gradeup.example/seminar/slides/direct-deck/present',deck_mode:'gradeup',title:'Direct deck',initial_slides:base().slides,theme_spec:{}};
  const response=await fetch(origin+'/internal/presentations/register',{method:'POST',headers:{'Content-Type':'application/json','x-gradeup-internal-key':'test-internal-key'},body:JSON.stringify({student_id:'507f1f77bcf86cd799439011',deck,context:{board:'CBSE',class_number:'10',chapter:1,subject:'Science'}})});
  const result=await response.json();
  assert.equal(response.status,200);assert.equal(result.data.deckId,'direct-deck');assert.equal(stored.ownerId,'507f1f77bcf86cd799439011');
  const denied=await fetch(origin+'/internal/presentations/register',{method:'POST',headers:{'Content-Type':'application/json','x-gradeup-internal-key':'wrong'},body:JSON.stringify({student_id:'507f1f77bcf86cd799439011',deck})});
  assert.equal(denied.status,401);
});

test('session end requires owner, respects AI lock and is idempotent',async()=>{
  const body={base_revision:0,mutation_id:'end-1'};
  assert.equal((await request('/decks/python-deck/session/end','POST',body,'editor')).status,403);
  stored.aiLock={id:'other-request',until:new Date(Date.now()+60000)};
  assert.equal((await request('/decks/python-deck/session/end','POST',body)).status,409);
  assert.equal(pythonCalls.length,0);
  stored.aiLock=null;
  assert.equal((await request('/decks/python-deck/session/end','POST',body)).status,200);
  assert.equal(stored.sessionEnded,true);
  assert.equal(stored.aiLock,null);
  assert.equal((await request('/decks/python-deck/session/end','POST',body)).status,200);
  assert.equal(pythonCalls.length,1);
  assert.equal((await request('/decks/python-deck/ai/suggest','POST',{slide_id:'s1',query:'Add text',base_revision:1,mutation_id:'after-end'})).status,409);
  assert.equal((await request('/decks/python-deck','PATCH',saveBody())).status,200);
});
