// Records the actual application through the same Playwright APIs as its E2E tests.
// No API response mocking, fixture labels, or fabricated UI states.
import {chromium,expect as baseExpect} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';

const out=resolve('../docs/submission/video');
const expect=baseExpect.configure({timeout:30000});
await mkdir(out+'/raw',{recursive:true});
const segments=JSON.parse(await readFile(out+'/durations.json','utf8'));
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:810},recordVideo:{dir:out+'/raw',size:{width:1440,height:810}}});
const page=await context.newPage();
const start=Date.now();
page.setDefaultTimeout(30000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const waitImages=()=>expect.poll(()=>page.locator('img').evaluateAll(xs=>xs.every(i=>i.complete&&i.naturalWidth>0)),{timeout:30000}).toBeTruthy();
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const recordings=[];
await page.goto('http://127.0.0.1:8000');
await expect(page.getByText('AWS Lambda')).toBeVisible();
await page.screenshot({path:out+'/capture-start.png'});
async function scene(id,action){
  const segment=segments.find(s=>s.id===id);
  const begin=(Date.now()-start)/1000;
  console.log('Recording',id);
  await action();
  await wait(Math.max(0,(segment.duration+2)*1000-(Date.now()-start-begin*1000)));
  const end=(Date.now()-start)/1000;
  recordings.push({id,start:begin,end,duration:end-begin});
  await page.screenshot({path:out+'/'+id+'.png'});
}
try {
  await scene('02-baseline',async()=>{
    await page.getByRole('button',{name:'Load example'}).click();
    await expect(page.getByText('Original preserved')).toHaveCount(2,{timeout:30000});
    await waitImages();
    await page.evaluate(()=>window.scrollTo(0,0));
  });
  await scene('03-analysis',async()=>{
    await page.getByRole('button',{name:'Analyze shelf'}).click();
    await expect(page.getByRole('heading',{name:'Review possible gaps'})).toBeVisible({timeout:30000});
    await waitImages();await page.evaluate(()=>window.scrollTo(0,200));
  });
  await scene('04-approval',async()=>{
    await page.getByRole('button',{name:'Approve restock task'}).click();
    await expect(page.getByText('Human-approved task')).toBeVisible({timeout:30000});
    await waitImages();await page.evaluate(()=>window.scrollTo(0,240));
  });
  await scene('05-followup',async()=>{
    await page.getByRole('button',{name:'Load synthetic refill'}).click();
    await expect(page.getByRole('button',{name:'Verify original regions'})).toBeEnabled({timeout:30000});
    await waitImages();
    await page.getByRole('button',{name:'Verify original regions'}).click();
    await expect(page.getByText('VERIFIED VISUALLY',{exact:true})).toHaveCount(2,{timeout:30000});
    await waitImages();await page.locator('.followup').scrollIntoViewIfNeeded();
  });
  await scene('06-trace',async()=>{
    await page.reload();await expect(page.getByRole('heading',{name:'Visually resolved'})).toBeVisible({timeout:30000});
    await waitImages();
    await page.locator('.trace').scrollIntoViewIfNeeded();
    await page.locator('.trace ol').evaluate(el=>{el.scrollTop=el.scrollHeight;});
    await page.getByText('finalize_verification',{exact:true}).scrollIntoViewIfNeeded();
    const id=await page.evaluate(()=>localStorage.getItem('shelfsignal-id'));
    await writeFile(out+'/recorded-inspection.json',JSON.stringify(await (await page.request.get('http://127.0.0.1:8000/inspections/'+id)).json(),null,2));
  });
  await scene('07-rescan',async()=>{
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.getByLabel('Synthetic case').selectOption('blur');
    await page.getByRole('button',{name:'Load example'}).click();
    await expect(page.getByRole('button',{name:'Analyze shelf'})).toBeEnabled({timeout:30000});
    await page.getByRole('button',{name:'Analyze shelf'}).click();
    await expect(page.getByRole('heading',{name:'A clearer view is needed'})).toBeVisible({timeout:30000});
    await expect(page.getByRole('button',{name:'Approve restock task'})).toHaveCount(0);
    await waitImages();await page.evaluate(()=>window.scrollTo(0,180));
  });
  await scene('08-nochange',async()=>{
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.getByLabel('Synthetic case').selectOption('no_change');
    await page.getByRole('button',{name:'Load example'}).click();
    await expect(page.getByRole('button',{name:'Analyze shelf'})).toBeEnabled({timeout:30000});
    await page.getByRole('button',{name:'Analyze shelf'}).click();
    await expect(page.getByRole('heading',{name:'No restock proposed'})).toBeVisible({timeout:30000});
    await waitImages();await page.evaluate(()=>window.scrollTo(0,180));
  });
  if(errors.length)throw new Error(errors.join('\n'));
} finally {
  const video=page.video();
  await context.close();
  await video.saveAs(out+'/raw/aws-workflow.webm');
  await browser.close();
  await writeFile(out+'/capture-timeline.json',JSON.stringify({started_at:new Date(start).toISOString(),recordings,errors},null,2));
}
