import {test,expect} from '@playwright/test';

test('the moving shelf is visible on the first screen without covering copy',async({page})=>{
 for(const [width,height] of [[1440,900],[1350,680],[1280,560],[390,844],[360,640]]){
  await page.setViewportSize({width,height});await page.goto('/');
  await expect(page.locator('.scene-card').first()).toBeVisible();
  const layout=await page.evaluate(()=>{
   const photo=document.querySelector('.scene-card')!.getBoundingClientRect();
   const copy=document.querySelector('.hero-copy')!.getBoundingClientRect();
   return{photoTop:photo.top,photoBottom:photo.bottom,photoHeight:photo.height,copyBottom:copy.bottom,scroll:scrollY};
  });
  expect(layout.scroll).toBe(0);
  expect(layout.photoTop).toBeGreaterThan(layout.copyBottom);
  expect(layout.photoBottom).toBeLessThan(height);
  expect(layout.photoHeight).toBeGreaterThan(100);
 }
});

test('scroll reveals content and reduced motion leaves every section readable',async({page})=>{
 await page.goto('/');
 const preview=page.locator('.product-window');
 const before=await preview.evaluate(el=>getComputedStyle(el).transform);
 await preview.scrollIntoViewIfNeeded();
 await expect.poll(()=>preview.evaluate(el=>getComputedStyle(el).transform)).not.toBe(before);
 await expect.poll(()=>page.locator('.hero-copy').evaluate(el=>Number(getComputedStyle(el).opacity))).toBeLessThan(1);
 const heading=page.getByRole('heading',{name:'The image changes. So does the next step.'});
 await heading.scrollIntoViewIfNeeded();
 await expect(page.locator('.evidence-heading')).toHaveCSS('opacity','1');
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(preview).toHaveCSS('transform','none');
 for(const target of ['.comparison-panel','.closing-section h2','.capture-figure'])await expect(page.locator(target)).toHaveCSS('opacity','1');
});

test('landing media, evidence preview and workspace entry work',async({page})=>{
 await page.goto('/');
 await expect(page.getByRole('heading',{level:1})).toContainText('See the gap.');
 await page.getByRole('button',{name:'Refilled',exact:true}).click();
 await expect(page.getByRole('img',{name:'The position is filled again',exact:true})).toHaveAttribute('src','/examples/elevenlabs/refilled.jpg');
 await page.getByRole('button',{name:'Blurred',exact:true}).click();
 await expect(page.getByText('Poor image quality should lead to a rescan, not a task.')).toBeVisible();
 await expect(page.getByRole('img',{name:'A clearer view is needed',exact:true})).toHaveAttribute('src','/examples/elevenlabs/blurred.jpg');
 await page.getByRole('button',{name:'Missing item',exact:true}).click();
 await expect(page.getByText('One position to review',{exact:true})).toBeVisible();
 await expect(page.locator('body')).not.toContainText('\u2014');
 await page.getByRole('link',{name:'Inspect a shelf',exact:true}).click();
 await expect(page).toHaveURL(/\/workspace\/$/);
 await expect(page.getByRole('button',{name:'Load example',exact:true})).toBeVisible();
});

test('mobile navigation and responsive layout remain accessible',async({page})=>{
 for(const width of [320,390,768,1440,2560]){
  await page.setViewportSize({width,height:900});
  await page.goto('/');
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 }
 await page.setViewportSize({width:390,height:844});
 const nav=page.getByRole('navigation',{name:'Main navigation'});
 await expect(nav).toBeHidden();
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 await expect(nav).toBeVisible();
 await page.keyboard.press('Escape');
 await expect(nav).toBeHidden();
 await expect(page.getByRole('button',{name:'Open menu',exact:true})).toBeFocused();
 await page.getByRole('button',{name:'Open menu',exact:true}).click();
 await nav.getByRole('link',{name:'Open workspace'}).click();
 await expect(page.getByRole('button',{name:'Load example',exact:true})).toBeVisible();
});

test('gallery can pause and respects reduced motion',async({page})=>{
 await page.goto('/');
 const card=page.locator('.scene-card').first();
 const transform=()=>card.evaluate(el=>el.style.transform);
 const initial=await transform();
 await expect.poll(transform).not.toBe(initial);
 await page.getByRole('button',{name:'Pause gallery motion'}).click();
 const paused=await transform();
 await expect(page.getByRole('button',{name:'Play gallery motion'})).toBeVisible();
 await page.waitForTimeout(250);
 expect(await transform()).toBe(paused);
 await page.getByRole('button',{name:'Play gallery motion'}).click();
 await page.emulateMedia({reducedMotion:'reduce'});
 await expect(page.getByRole('button',{name:'Pause gallery motion'})).toBeHidden();
 const reduced=await transform();
 await page.waitForTimeout(250);
 expect(await transform()).toBe(reduced);
});
