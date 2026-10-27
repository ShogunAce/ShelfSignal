import {chromium,expect as baseExpect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
const expect=baseExpect.configure({timeout:30000});
const out='../docs/evidence/landing';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:980},reducedMotion:'reduce'});
const issues=[];
page.on('pageerror',error=>issues.push(error.message));
try{
 await page.goto('http://127.0.0.1:8000/workspace/');
 await expect(page.getByText('AWS Lambda')).toBeVisible();
 await page.getByRole('button',{name:'Load example',exact:true}).click();
 await expect(page.getByText('Original preserved')).toHaveCount(2);
 await page.getByRole('button',{name:'Analyze shelf',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Review possible gaps',exact:true})).toBeVisible();
 await expect.poll(()=>page.locator('img').evaluateAll(images=>images.every(i=>i.complete&&i.naturalWidth>0))).toBeTruthy();
 await page.screenshot({path:out+'/workspace-desktop.png',fullPage:true});
 await page.screenshot({path:out+'/workspace-preview.png'});
 for(const width of [1440,390,768,320,2560]){
  await page.setViewportSize({width,height:width<500?844:1000});
  await page.goto('http://127.0.0.1:8000/');
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.getByRole('heading',{level:1})).toBeVisible();
  await expect.poll(()=>page.locator('.workspace-preview img').evaluate(i=>i.complete&&i.naturalWidth>0)).toBeTruthy();
  await page.screenshot({path:out+`/landing-${width}.png`,fullPage:true});
  await page.screenshot({path:out+`/hero-${width}.png`});
  const size=await page.evaluate(()=>({viewport:innerWidth,content:document.documentElement.scrollWidth}));
  if(size.content>size.viewport)issues.push(`Overflow ${width}: ${size.content}`);
 }
 await writeFile(out+'/visual-checks.json',JSON.stringify({issues},null,2));
 console.log(JSON.stringify({issues}));
 if(issues.length)throw new Error(issues.join('\n'));
}finally{await browser.close()}
