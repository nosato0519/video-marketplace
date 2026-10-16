import { request as originalRequest } from 'node:http';
import { PassThrough } from 'node:stream';
import * as http from 'node:http';

const injectedScript = `<script id="creator-thumbnail-sync">(()=>{if(location.pathname!=='/pages/creator-studio.html')return;const keyPrefix='creator-thumb:';let pendingTitle='';let pendingThumb='';const preview=()=>document.getElementById('thumbnailPreview');const titleEl=()=>document.getElementById('title');const save=()=>{const img=preview();const title=titleEl()?.value?.trim();if(!img?.src||!title)return;pendingTitle=title;pendingThumb=img.src;try{sessionStorage.setItem(keyPrefix+title,img.src)}catch{}};document.addEventListener('submit',save,true);const apply=row=>{if(!row||!pendingThumb)return;const title=row.querySelector('h3')?.textContent?.trim();if(title!==pendingTitle)return;const box=row.querySelector('.thumb');if(!box)return;box.textContent='';const img=document.createElement('img');img.src=pendingThumb;img.alt='サムネイル';img.style.cssText='width:100%;height:100%;object-fit:cover;display:block';box.appendChild(img);box.style.padding='0';};const observer=new MutationObserver(muts=>{for(const m of muts)for(const n of m.addedNodes)if(n.nodeType===1){if(n.matches?.('.product'))apply(n);n.querySelectorAll?.('.product').forEach(apply)}});const list=document.getElementById('productList');if(list)observer.observe(list,{childList:true,subtree:true});const restore=()=>{const rows=document.querySelectorAll('#productList .product');rows.forEach(row=>{const title=row.querySelector('h3')?.textContent?.trim();if(!title)return;try{const saved=sessionStorage.getItem(keyPrefix+title);if(saved){pendingTitle=title;pendingThumb=saved;apply(row)}}catch{}})};restore();setTimeout(restore,300);setTimeout(restore,1000)})();</script>`;

const original = http.request;
http.request = function patchedRequest(...args) {
  const callback = typeof args[args.length - 1] === 'function' ? args.pop() : null;
  const req = original.apply(this, callback ? [...args, response => {
    const target = typeof args[0] === 'object' ? (args[0].path || args[0].pathname || '') : String(args[1] || '');
    if (!String(target).startsWith('/pages/creator-studio.html') || !String(response.headers?.['content-type'] || '').includes('text/html')) {
      return callback(response);
    }
    const chunks = [];
    response.on('data', chunk => chunks.push(chunk));
    response.on('end', () => {
      const html = Buffer.concat(chunks).toString('utf8');
      const body = Buffer.from(html.replace(/<\/body>/i, `${injectedScript}</body>`), 'utf8');
      const pass = new PassThrough();
      pass.statusCode = response.statusCode;
      pass.statusMessage = response.statusMessage;
      pass.headers = { ...response.headers, 'content-length': String(body.length) };
      callback(pass);
      pass.end(body);
    });
    response.on('error', err => callback(Object.assign(new Error(err.message), { statusCode: 502, headers: { 'content-type': 'text/plain' } })));
  }] : args);
  return req;
};
