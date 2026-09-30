import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const browser = await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE ? {executablePath:process.env.BROWSER_EXECUTABLE} : {})});
const vite = await createServer({root:process.cwd(),logLevel:'silent',server:{host:'127.0.0.1',port:0}});
await vite.listen();
const base=`http://127.0.0.1:${vite.httpServer.address().port}`;
const output=process.env.HISTORY_LAYOUT_OUTPUT || '/private/tmp/meetro-63J4E3-native-layout';mkdirSync(output,{recursive:true});
const results=[];
try {
 for(const [width,height] of [[390,844],[820,1180],[1180,820],[1366,900]]) {
  const page=await browser.newPage({viewport:{width,height},hasTouch:true,isMobile:width<768});
  await page.goto(`${base}/tests/browser/customerHistoryFixture.html`);
  await page.getByRole('button',{name:'Open Meetro customer history: Native Alex'}).click();
  const workspace=page.locator('[data-native-customer-history-status="ready"]');await workspace.waitFor();
  assert.deepEqual(await workspace.locator('nav button').allTextContents(),['Overview','Jobs','Quotes','Invoices','Documents / Photos']);
  assert.equal(await workspace.getByRole('button',{name:'Start New Job',exact:true}).isDisabled(),true);
  assert.equal(await workspace.getByRole('button',{name:'Message Customer',exact:true}).isDisabled(),true);
  for(const tab of ['Overview','Jobs','Quotes','Invoices','Documents / Photos']) {
   await workspace.getByRole('button',{name:tab,exact:true}).click();
   const measured=await page.evaluate(()=>{
    const workspace=document.querySelector('[data-native-customer-history-status="ready"]');
    return {scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
      minAction:Math.min(...[...workspace.querySelectorAll('button')].map(button=>button.getBoundingClientRect().height)),
      bottomNav:getComputedStyle(document.querySelector('.bottom-nav-dock')).display,
      sidebar:getComputedStyle(document.querySelector('.desktop-sidebar')).display};
   });
   assert.ok(measured.scrollWidth<=measured.clientWidth+1,`${width} ${tab}: horizontal overflow`);
   assert.ok(measured.minAction>=44,`${width} ${tab}: touch target`);
   if(width<768) {assert.notEqual(measured.bottomNav,'none');assert.equal(measured.sidebar,'none');}
   else {assert.equal(measured.bottomNav,'none');assert.equal(measured.sidebar,'flex');}
   results.push({width,height,tab,...measured});
  }
  await workspace.getByRole('button',{name:'Jobs',exact:true}).click();
  const first=workspace.getByRole('button',{name:/Open Job: Kitchen faucet/});await first.click();
  assert.match(await page.evaluate(()=>document.documentElement.dataset.route),/jobId=33333333-3333-4333-8333-333333333333/);
  await page.screenshot({path:`${output}/native-${width}.png`});await page.close();
 }
}finally {await browser.close();await vite.close();writeFileSync(`${output}/results.json`,JSON.stringify(results,null,2));}
console.log(`${results.length} native Customer History viewport/tab checks passed; exact Job routes and persistent navigation preserved.`);
