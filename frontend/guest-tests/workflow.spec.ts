import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');

for(const example of ['ai_single_gap','single_gap']){
 test(`${example}: anonymous AWS inspection, explicit approval and persisted refill verification`,async({page,browser,baseURL})=>{
  await page.goto('/workspace/');
  await expect(page.getByText('Synthetic demo · No account needed')).toBeVisible();
  await expect(page.locator('.runtime')).toContainText('OpenCV 5.0.0');
  await expect(page.locator('input[type=file]')).toHaveCount(0);
  await page.getByLabel('Synthetic case').selectOption(example);
  await page.getByRole('button',{name:'Load example',exact:true}).click();
  await expect(page.getByText('Original preserved')).toHaveCount(2);
  const id=await page.evaluate(()=>localStorage.getItem('shelfsignal-id'));
  for(const kind of ['reference','image']){
   const response=await page.request.get(`/api/inspections/${id}/media/${kind}`);
   expect(response.ok()).toBeTruthy();
   if(example==='ai_single_gap')expect(hash(await response.body())).toBe(hash(await readFile('public/examples/elevenlabs/'+(kind==='reference'?'reference.png':'missing-item.png'))));
  }
  // A different visitor cannot read or mutate this inspection, even knowing its ID.
  const other=await browser.newContext({baseURL});
  expect((await other.request.get(`/api/inspections/${id}`)).status()).toBe(401);
  expect((await other.request.post('/api/session',{headers:{Origin:baseURL!},data:{}})).ok()).toBeTruthy();
  expect((await other.request.get(`/api/inspections/${id}`)).status()).toBe(404);
  expect((await other.request.post(`/api/inspections/${id}/approval`,{headers:{Origin:baseURL!},data:{approved:true}})).status()).toBe(404);
  await other.close();
  await page.getByRole('button',{name:'Analyze shelf',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Review possible gaps',exact:true})).toBeVisible();
  const before=await (await page.request.get(`/api/inspections/${id}`)).json();
  expect(before.task).toBeNull();
  if(example==='ai_single_gap')expect(before.candidates.map((x:{id:string})=>x.id)).toEqual(['R2-3']);
  await page.getByRole('button',{name:'Approve restock task',exact:true}).click();
  await expect(page.getByText('Human-approved task')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button',{name:'Load synthetic refill',exact:true})).toBeVisible();
  await page.getByLabel('Synthetic case').selectOption(example==='ai_single_gap'?'single_gap':'ai_single_gap');
  await page.getByRole('button',{name:'Load synthetic refill',exact:true}).click();
  await expect(page.getByRole('button',{name:'Verify original regions',exact:true})).toBeEnabled();
  if(example==='ai_single_gap'){
   const refill=await page.request.get(`/api/inspections/${id}/media/followup`);
   expect(hash(await refill.body())).toBe(hash(await readFile('public/examples/elevenlabs/refilled.jpg')));
  }
  await page.getByRole('button',{name:'Verify original regions',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Visually resolved',exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading',{name:'Visually resolved',exact:true})).toBeVisible();
  const final=await (await page.request.get(`/api/inspections/${id}`)).json();
  expect(final.events.length).toBeGreaterThan(before.events.length);
  await expect.poll(()=>page.locator('.image-wrap img').evaluateAll(images=>images.length===3&&images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
  await page.locator('.image-wrap img').evaluateAll(images=>Promise.all(images.map(img=>(img as HTMLImageElement).decode())));
  await page.getByRole('heading',{name:'Every shelf. A considered action.'}).click();
  await page.screenshot({path:`../docs/evidence/netlify/${example}-verified.png`,fullPage:true});
 });
}
for(const [value,heading] of [['ai_no_change','No restock proposed'],['ai_blur','A clearer view is needed']]){
 test(`${value}: guest AWS evidence branches without approval`,async({page})=>{
  await page.goto('/workspace/');
  await page.getByLabel('Synthetic case').selectOption(value);
  await page.getByRole('button',{name:'Load example',exact:true}).click();
  await expect(page.getByText('Original preserved')).toHaveCount(2);
  await page.getByRole('button',{name:'Analyze shelf',exact:true}).click();
  await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
  await expect(page.getByRole('button',{name:'Approve restock task',exact:true})).toHaveCount(0);
 });
}
test('every remaining procedural example loads and renders both photographs',async({page})=>{
 await page.goto('/workspace/');
 for(const value of ['multiple_gaps','no_change','blur','alignment_failure','occlusion','lighting']){
  await page.getByLabel('Synthetic case').selectOption(value);
  await page.getByRole('button',{name:'Load example',exact:true}).click();
  await expect(page.getByText('Original preserved')).toHaveCount(2);
  await expect(page.locator('[role=status]')).toHaveCount(0);
  await expect.poll(()=>page.locator('.image-wrap img').evaluateAll(images=>images.length===2&&images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBe(true);
 }
});
