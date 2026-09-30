import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createServer} from 'vite';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const vite=await createServer({root:process.cwd(),logLevel:'silent',server:{host:'127.0.0.1',port:0}});
await vite.listen();
const url=`http://127.0.0.1:${vite.httpServer.address().port}/tests/browser/revenueReconciliationFixture.html`;
const out=process.env.REVENUE_QA_OUTPUT||'/private/tmp/meetro-63J4E7-evidence/responsive';mkdirSync(out,{recursive:true});
const results=[];
try{
 for(const [width,height]of [[390,844],[820,1180],[1180,820],[1366,900]]){
  const page=await browser.newPage({viewport:{width,height},isMobile:width<768,hasTouch:true});await page.goto(url);
  await page.locator('[data-invoice-workspace-phase="ready"]').waitFor();
  for(const [label,period,cash]of [['This Month','THIS_MONTH','$660.00'],['30 Days','LAST_30_DAYS','$660.00'],['90 Days','LAST_90_DAYS','$1,170.00'],['This Year','THIS_YEAR','$1,170.00']]){
   await page.getByRole('button',{name:label,exact:true}).click();
   await page.locator(`[data-revenue-period="${period}"]`).waitFor();await page.locator('[data-invoice-workspace-phase="ready"]').waitFor();
   assert.deepEqual(await page.locator('.work-center-metric-card__value').allTextContents(),[cash,'$1,170.00','$0.00','3']);
   assert.equal(await page.locator('[data-invoice-id]').count(),3);
   assert.equal(await page.getByRole('button',{name:label,exact:true}).getAttribute('aria-pressed'),'true');
   const measured=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,layout:document.getElementById('root').dataset.appLayout,availableContentWidth:Number(document.getElementById('root').dataset.appContentWidth),renderedContentWidth:document.querySelector('[data-revenue-fixture-content]').getBoundingClientRect().width,values:[...document.querySelectorAll('.work-center-metric-card__value')].map(e=>({text:e.textContent,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,fontSize:parseFloat(getComputedStyle(e).fontSize),lineHeight:getComputedStyle(e).lineHeight,cardRight:e.closest('.work-center-metric-card').getBoundingClientRect().right,textRight:(()=>{const r=document.createRange();r.selectNodeContents(e);return r.getBoundingClientRect().right;})()}))}));
   results.push({width,height,period,...measured});
   await page.screenshot({path:`${out}/${width}-${period}.png`,fullPage:true});
   assert.ok(measured.scrollWidth<=measured.clientWidth+1,`${width} ${period}: horizontal overflow`);
   assert.ok(Math.abs(measured.renderedContentWidth-measured.availableContentWidth)<1,`${width} ${period}: fixture must use application content width`);
   for(const value of measured.values){assert.ok(value.scrollWidth<=value.clientWidth+1,`${width} ${period}: clipped ${value.text}`);assert.ok(value.height<=value.fontSize*1.8,`${width} ${period}: number wrapped`);}
  }
  assert.deepEqual(await page.evaluate(()=>window.__revenueReads),['THIS_MONTH','LAST_30_DAYS','LAST_90_DAYS','THIS_YEAR']);
  await page.close();
 }
}finally{await browser.close();await vite.close();writeFileSync(`${out}/results.json`,JSON.stringify(results,null,2)+'\n');}
console.log(`${results.length} viewport/period checks passed: canonical summaries, Invoice cards, no number clipping/wrapping or overflow.`);
