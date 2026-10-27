import {test,expect} from '@playwright/test';
const evidence='../docs/evidence/'+(process.env.SHELFSIGNAL_CLOUD_TEST?'aws-':'');
test('complete synthetic inspection, approval and visual verification',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/workspace/');await expect(page.getByText(process.env.SHELFSIGNAL_CLOUD_TEST?'AWS Lambda':'Local Python')).toBeVisible();
 await page.getByLabel('Synthetic case').selectOption('single_gap');
 await page.getByRole('button',{name:'Load example'}).click();
 await expect(page.getByText('Original preserved')).toHaveCount(2);
 await page.getByRole('button',{name:'Analyze shelf'}).click();
 await expect(page.getByRole('heading',{name:'Review possible gaps'})).toBeVisible();
 await expect(page.getByRole('img',{name:'Inspection shelf'})).toBeVisible();
 await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBeTruthy();
 await page.screenshot({path:evidence+'ui-proposal.png',fullPage:true});
 await page.getByRole('button',{name:'Approve restock task'}).click();
 await expect(page.getByText('Human-approved task')).toBeVisible();
 await page.getByRole('button',{name:'Load synthetic refill'}).click();
 await page.getByRole('button',{name:'Verify original regions'}).click();
 await expect(page.getByRole('heading',{name:'Visually resolved'})).toBeVisible();
 await expect(page.getByText('No significant occupancy loss detected.',{exact:true})).toBeVisible();
 await expect(page.getByText('finalize_verification',{exact:true})).toBeVisible();
 await page.reload();await expect(page.getByRole('heading',{name:'Visually resolved'})).toBeVisible();
 await expect(page.locator('img')).toHaveCount(3);
 await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(img=>(img as HTMLImageElement).complete&&(img as HTMLImageElement).naturalWidth>0))).toBeTruthy();
 await page.screenshot({path:evidence+'ui-verified.png',fullPage:true});
 expect(errors).toEqual([]);
});
test('poor quality requests rescan and never offers approval',async({page})=>{
 await page.goto('/workspace/');await page.getByLabel('Synthetic case').selectOption('blur');await page.getByRole('button',{name:'Load example'}).click();
 await page.getByRole('button',{name:'Analyze shelf'}).click();
 await expect(page.getByRole('heading',{name:'A clearer view is needed'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Approve restock task'})).toHaveCount(0);
});
test('manual uploads and keyboard position edits',async({page})=>{
 await page.goto('/workspace/');await page.getByLabel('Upload reference').setInputFiles('../fixtures/generated/0/reference.png');
 await expect(page.getByText('Original preserved')).toHaveCount(1);
 await expect(page.getByLabel('Upload image',{exact:true})).toBeEnabled();
 await page.getByLabel('Upload image',{exact:true}).setInputFiles('../fixtures/generated/0/single_gap.jpg');
 await expect(page.getByText('Original preserved')).toHaveCount(2);
 await page.getByRole('button',{name:'Draw position'}).click();
 const image=page.getByRole('img',{name:'Reference shelf'});
 await expect.poll(()=>image.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBeTruthy();
 const box=(await image.boundingBox())!;
 await page.mouse.move(box.x+box.width*.19,box.y+box.height*.36);await page.mouse.down();await page.mouse.move(box.x+box.width*.31,box.y+box.height*.59);await page.mouse.up();
 await expect(page.getByRole('button',{name:'Analyze shelf'})).toBeEnabled();
 await page.getByText('Edit position coordinates').click();
 await page.getByRole('spinbutton').nth(2).fill('0.125');
 await page.getByRole('spinbutton').nth(2).press('Tab');
 await expect(page.getByText('define_positions',{exact:true})).toHaveCount(2);
 await page.getByRole('button',{name:'Analyze shelf'}).click();await expect(page.getByRole('heading',{name:'Review possible gaps'})).toBeVisible();
});
test('mobile layout has no horizontal overflow',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/workspace/');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 await page.screenshot({path:evidence+'ui-mobile.png',fullPage:true});
});

test('no-change evidence creates no approval proposal',async({page})=>{
 await page.goto('/workspace/');await page.getByLabel('Synthetic case').selectOption('no_change');
 await page.getByRole('button',{name:'Load example'}).click();await page.getByRole('button',{name:'Analyze shelf'}).click();
 await expect(page.getByRole('heading',{name:'No restock proposed'})).toBeVisible();
 await expect(page.getByRole('button',{name:'Approve restock task'})).toHaveCount(0);
});

test('operator can reject a proposal without creating a task',async({page})=>{
 await page.goto('/workspace/');await page.getByRole('button',{name:'Load example'}).click();
 await page.getByRole('button',{name:'Analyze shelf'}).click();await page.getByRole('button',{name:'Reject proposal'}).click();
 await expect(page.getByRole('heading',{name:'Proposal rejected'})).toBeVisible();
 await expect(page.getByText('Human-approved task')).toHaveCount(0);
});
