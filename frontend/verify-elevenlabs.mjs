// Run against the existing local UI and authenticated AWS proxy. No mocked responses.
import {chromium, expect as baseExpect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';

const root=resolve('../fixtures/elevenlabs');
const out=resolve('../docs/evidence/elevenlabs');
await mkdir(out,{recursive:true});
const expect=baseExpect.configure({timeout:30000});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1100}});
const page=await context.newPage();
page.setDefaultTimeout(30000);
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const records=[];
const waitImages=()=>expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBeTruthy();
async function capture(name){
  const id=await page.evaluate(()=>localStorage.getItem('shelfsignal-id'));
  const response=await page.request.get('http://127.0.0.1:8000/inspections/'+id);
  expect(response.ok()).toBeTruthy();
  const item=await response.json();
  records.push({name,id,state:item.state});
  await writeFile(out+'/'+name+'.json',JSON.stringify(item,null,2));
  await waitImages();
  await page.screenshot({path:out+'/'+name+'.png',fullPage:true});
  return item;
}
async function inspect(file){
  await page.getByRole('button',{name:'New inspection',exact:true}).click();
  await page.getByLabel('Upload reference',{exact:true}).setInputFiles(root+'/reference.png');
  await expect(page.getByText('Original preserved')).toHaveCount(1);
  await expect(page.getByLabel('Upload image',{exact:true})).toBeEnabled();
  await page.getByLabel('Upload image',{exact:true}).setInputFiles(root+'/'+file);
  await expect(page.getByText('Original preserved')).toHaveCount(2);
  await waitImages();
  await page.getByRole('button',{name:'Draw position',exact:true}).click();
  const b=await page.getByRole('img',{name:'Reference shelf',exact:true}).boundingBox();
  await page.mouse.move(b.x+b.width*475/1280,b.y+b.height*265/720);
  await page.mouse.down();
  await page.mouse.move(b.x+b.width*620/1280,b.y+b.height*438/720);
  await page.mouse.up();
  await expect(page.getByRole('button',{name:'Analyze shelf',exact:true})).toBeEnabled();
  await page.getByRole('button',{name:'Analyze shelf',exact:true}).click();
}
try{
  await page.goto('http://127.0.0.1:8000/workspace/');
  await expect(page.getByText('AWS Lambda')).toBeVisible();
  await inspect('missing-item.png');
  await expect(page.getByRole('heading',{name:'Review possible gaps',exact:true})).toBeVisible();
  const proposed=await capture('proposal');
  expect(proposed.candidates).toHaveLength(1);
  expect(proposed.task).toBeNull();
  // Approval applies only to this synthetic test inspection, under the user's test authorization.
  await page.getByRole('button',{name:'Approve restock task',exact:true}).click();
  await expect(page.getByText('Human-approved task',{exact:true})).toBeVisible();
  for(const [file,heading,name,state] of [
    ['still-empty.jpg','Gap remains visible','unresolved','UNRESOLVED'],
    ['blurred.jpg','Follow-up is inconclusive','inconclusive','INCONCLUSIVE'],
    ['refilled.jpg','Visually resolved','resolved','VERIFIED_VISUALLY']]){
    await page.getByLabel('Upload followup',{exact:true}).setInputFiles(root+'/'+file);
    await expect(page.getByRole('button',{name:'Verify original regions',exact:true})).toBeEnabled();
    await page.getByRole('button',{name:'Verify original regions',exact:true}).click();
    await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
    const item=await capture(name);
    expect(item.state).toBe(state);
    expect(item.task.physical_completion).toBe(false);
  }
  await page.reload();
  await expect(page.getByRole('heading',{name:'Visually resolved',exact:true})).toBeVisible();
  await capture('persisted');
  await inspect('blurred.jpg');
  await expect(page.getByRole('heading',{name:'A clearer view is needed',exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve restock task',exact:true})).toHaveCount(0);
  await capture('rescan');
  await inspect('no-change.jpg');
  await expect(page.getByRole('heading',{name:'No restock proposed',exact:true})).toBeVisible();
  await capture('no-change');
  expect(errors).toEqual([]);
  await writeFile(out+'/browser-checks.json',JSON.stringify({synthetic:true,runtime:'AWS Lambda',passed:true,records,errors},null,2));
  console.log(JSON.stringify(records,null,2));
}finally{
  await context.close();
  await browser.close();
}
