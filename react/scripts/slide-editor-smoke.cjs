// Browser regression tests against the running React app. Network data is mocked.
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fixture = () => ({
  deckId:'test-deck', deckRef:'gradeup:test-deck', pythonSessionId:'python-test-session', editUrl:'http://localhost:3001/seminar/slides/test-deck', embedUrl:'http://localhost:3001/seminar/slides/test-deck/present',
  title:'Life Processes',revision:0,role:'owner',sessionEnded:false,collaborators:[],theme:{},proposal:null,
  messages:[{id:'welcome',role:'assistant',text:'Your outline is ready. Select a slide to begin.'}],
  slides:[{id:'s1',title:'Life Processes',background:'#ffffff',notes:'Introduce the chapter.',elements:[{id:'e1',type:'text',x:80,y:70,width:1100,height:100,fontFamily:'Arial',fontSize:48,bold:true,fill:'#17251f',text:'Life Processes'},{id:'e2',type:'rect',x:80,y:240,width:480,height:260,fill:'#d3eee2',stroke:'#277f60',strokeWidth:2}]},{id:'s2',title:'Nutrition',background:'#ffffff',notes:'',elements:[{id:'e3',type:'text',x:80,y:70,width:1000,height:100,fontSize:48,text:'Nutrition',fill:'#17251f'}]}],
});
async function main() {
  const browser=await chromium.launch({headless:true, ...(process.env.EDITOR_BROWSER_PATH ? { executablePath:process.env.EDITOR_BROWSER_PATH } : {})});
  try {
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    let deck=fixture(); const requests=[],errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.route('**/socket.io/**',route=>route.abort());
    await page.route('**/api/v1/auth/me',route=>route.fulfill({contentType:'application/json',body:JSON.stringify({status:true,data:{id:'owner',firstName:'Test',lastName:'Learner',email:'test@example.com',role:'student'}})}));
    await page.route('**/api/v1/seminar/**',async route=>{
      const req=route.request(),url=new URL(req.url()),body=req.headers()['content-type']?.includes('application/json') ? req.postDataJSON() : null;
      const reply=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({status:status<400,data,...(status>=400?{message:'Conflict'}:{})})});
      if(url.pathname.endsWith('/assets') && req.method()==='POST')return reply({assetId:'test-image'});
      if(url.pathname.endsWith('/assets/test-image'))return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=','base64')});
      if(url.pathname.endsWith('/ai/suggest')){requests.push(body);deck.revision++;deck.proposal={id:'p1',slideId:body.slide_id,baseRevision:deck.revision,feedback:'Add a key point.',operations:[{op:'add_element',slide_id:body.slide_id,element:{id:'ai-point',type:'text',x:80,y:220,width:900,height:100,text:'Nutrition supplies energy.',fontSize:32}}]};return reply(deck);}
      if(url.pathname.endsWith('/ai/decide')){const p=deck.proposal;deck.slides.find(s=>s.id===p.slideId).elements.push(p.operations[0].element);deck.revision++;deck.proposal=null;return reply(deck);}
      if(req.method()==='PATCH'){if(body.base_revision!==deck.revision)return reply(null,409);deck={...deck,title:body.title,slides:body.slides,theme:body.theme,revision:deck.revision+1};return reply(deck);}
      if(url.pathname.endsWith('/shares'))return reply([]);
      return reply(deck);
    });
    await page.goto(`${process.env.EDITOR_TEST_ORIGIN || 'http://127.0.0.1:3001'}/seminar/slides/test-deck`);
    await page.getByLabel('Presentation title').waitFor({timeout:120000});
    await page.getByLabel('Insert text',{exact:true}).click();
    await page.getByLabel('Selected text').fill('Editable content');
    await page.waitForFunction(()=>document.querySelector('.se-save-state')?.textContent==='Saved');
    assert(deck.slides[0].elements.some(e=>e.text==='Editable content'));
    await page.getByLabel('Slide 2: Nutrition',{exact:true}).click();
    await page.getByRole('tab',{name:'Copilot'}).click();
    await page.getByLabel('Message Copilot').fill('Add key points');
    await page.getByLabel('Send message',{exact:true}).click();
    await page.getByRole('button',{name:'Approve',exact:true}).waitFor();
    assert.equal(requests[0].slide_id,'s2');
    assert(await page.getByText('Nutrition supplies energy.',{exact:false}).count()>0);
    await page.getByRole('button',{name:'Approve',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('.se-proposal'));
    assert(deck.slides[1].elements.some(e=>e.id==='ai-point'));
    await page.getByLabel('Add slide',{exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.se-save-state')?.textContent==='Saved');
    assert.equal(deck.slides.length,3);
    await page.getByLabel('Undo',{exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('.se-save-state')?.textContent==='Saved');
    assert.equal(deck.slides.length,2);
    await page.getByLabel('Slide 1: Life Processes',{exact:true}).click();
    await page.getByRole('tab',{name:'Copilot'}).click();
    const dir=path.resolve(__dirname,'../test-results/slides');fs.mkdirSync(dir,{recursive:true});
    await page.screenshot({path:path.join(dir,'desktop.png'),fullPage:true});
    const pixels=await page.locator('.se-stage-space canvas').first().evaluate(canvas=>{const d=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let n=0;for(let i=0;i<d.length;i+=4)if(d[i]<230&&d[i+1]<240&&d[i+2]<235&&d[i+3])n++;return n;});
    assert(pixels>500,'Canvas should contain actual content');
    await page.locator('input[type=file]').setInputFiles({name:'image.png',mimeType:'image/png',buffer:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=','base64')});
    await page.waitForFunction(()=>document.querySelector('.se-save-state')?.textContent==='Saved');
    await page.waitForTimeout(1000);
    assert(deck.slides[0].elements.some(e=>e.type==='image'));
    const pngDownload=page.waitForEvent('download');await page.getByLabel('Export presentation').selectOption('png');assert((await pngDownload).suggestedFilename().endsWith('.png'));
    const pdfDownload=page.waitForEvent('download');await page.getByLabel('Export presentation').selectOption('pdf');assert((await pdfDownload).suggestedFilename().endsWith('.pdf'));
    await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(dir,'mobile.png'),fullPage:true});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),'Mobile should not overflow horizontally');
    await page.setViewportSize({width:1440,height:900});
    await page.getByLabel('Present',{exact:true}).click();await page.getByLabel('Next slide',{exact:true}).click();await page.screenshot({path:path.join(dir,'present.png')});
    deck.role='viewer';await page.reload();await page.getByLabel('Presentation title').waitFor();assert(await page.getByLabel('Insert text',{exact:true}).isDisabled());
    assert.equal(errors.length,0,errors.join('\n'));
    console.log('PASS: text + autosave, selected slide, proposal preview + approval, add + undo, canvas pixels, image upload, PNG/PDF export, desktop/mobile, presenting, viewer controls.');
  } finally { await browser.close(); }
}
main().catch(e=>{console.error(e);process.exitCode=1});
