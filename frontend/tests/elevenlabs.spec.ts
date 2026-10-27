import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
test('AI example preserves generated originals and reload uses the matching refill',async({page})=>{
 await page.goto('/workspace/');
 await expect(page.getByLabel('Synthetic case')).toHaveValue('ai_single_gap');
 await page.getByRole('button',{name:'Load example',exact:true}).click();
 await expect(page.getByText('Original preserved')).toHaveCount(2);
 const id=await page.evaluate(()=>localStorage.getItem('shelfsignal-id'));
 for(const [kind,name] of [['reference','reference.png'],['image','missing-item.png']]){
   const response=await page.request.get(`/inspections/${id}/media/${kind}`);
   expect(response.ok()).toBeTruthy();
   expect(hash(await response.body())).toBe(hash(await readFile(`public/examples/elevenlabs/${name}`)));
 }
 await page.getByRole('button',{name:'Analyze shelf',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Review possible gaps',exact:true})).toBeVisible();
 const inspection=await (await page.request.get(`/inspections/${id}`)).json();
 expect(inspection.candidates.map((candidate:{id:string})=>candidate.id)).toEqual(['R2-3']);
 expect(inspection.task).toBeNull();
 await page.getByRole('button',{name:'Approve restock task',exact:true}).click();
 await expect(page.getByText('Human-approved task')).toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:'Load synthetic refill',exact:true})).toBeVisible();
 // Changing the picker must not switch the follow-up to a different shelf scene.
 await page.getByLabel('Synthetic case').selectOption('single_gap');
 await page.getByRole('button',{name:'Load synthetic refill',exact:true}).click();
 await expect(page.getByRole('button',{name:'Verify original regions',exact:true})).toBeEnabled();
 const followup=await page.request.get(`/inspections/${id}/media/followup`);
 expect(followup.ok()).toBeTruthy();
 expect(hash(await followup.body())).toBe(hash(await readFile('public/examples/elevenlabs/refilled.jpg')));
 await page.getByRole('button',{name:'Verify original regions',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Visually resolved',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('heading',{name:'Visually resolved',exact:true})).toBeVisible();
 await page.screenshot({path:'../docs/evidence/elevenlabs/'+(process.env.SHELFSIGNAL_CLOUD_TEST?'aws-':'local-')+'built-in-example.png',fullPage:true});
});

for(const [value,heading] of [['ai_no_change','No restock proposed'],['ai_blur','A clearer view is needed']]){
 test(`${value} routes without offering approval`,async({page})=>{
   await page.goto('/workspace/');
   await page.getByLabel('Synthetic case').selectOption(value);
   await page.getByRole('button',{name:'Load example',exact:true}).click();
   await expect(page.getByText('Original preserved')).toHaveCount(2);
   await page.getByRole('button',{name:'Analyze shelf',exact:true}).click();
   await expect(page.getByRole('heading',{name:heading,exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:'Approve restock task',exact:true})).toHaveCount(0);
 });
}
