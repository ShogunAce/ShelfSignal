import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir:'guest-tests',timeout:120000,expect:{timeout:30000},workers:1,
 use:{baseURL:process.env.SHELFSIGNAL_GUEST_URL||'https://shelf-signals.netlify.app',viewport:{width:1440,height:1100},screenshot:'only-on-failure'},
 reporter:[['list'],['json',{outputFile:'../docs/evidence/netlify/guest-browser.json'}]],
});
