(() => {
  const boot = async () => {
    try {
      const api = window.demoApi || (async (path, options={}) => {
        const r = await fetch(path, {credentials:'same-origin', ...options, headers:{'content-type':'application/json', ...(options.headers||{})}});
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'request failed');
        return d;
      });
      const state = await api('/api/demo/state');
      const esc = v => String(v ?? '').replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
      const productMap = new Map((state.products||[]).map(p=>[String(p.id),p]));
      (state.sellerProducts||[]).forEach(p=>productMap.set(String(p.id),p));
      const sellerSessions = Array.isArray(state.sellerSessions) ? state.sellerSessions : [];
      const buyerSessions = Array.isArray(state.buyerSessions) ? state.buyerSessions : [];
      const orders = Array.isArray(state.orders) ? state.orders : [];

      const videoPanel = document.querySelector('#adminVideoList');
      if (videoPanel) {
        const staticRows = (state.products||[]).map(p => {
          const status = p.visibility === 'private' ? 'private' : 'public';
          return '<div class="video-admin-row"><div><strong>'+esc(p.title)+'</strong><small>'+esc(p.category)+' / '+esc(p.seller)+' / ¥'+Number(p.price||0).toLocaleString()+'</small></div><span class="status '+(status==='public'?'ok':'')+'">'+(status==='public'?'公開':'非公開')+'</span><button class="action" data-visibility-id="'+esc(p.id)+'" data-visibility="'+status+'">'+(status==='public'?'非公開にする':'公開する')+'</button><a class="action" href="/pages/product-detail.html?product='+encodeURIComponent(p.id)+'">詳細</a></div>';
        });
        const sellerRows = (state.sellerProducts||[]).map(p => {
          const status = p.status === 'published' ? 'public' : 'private';
          const moderation = (state.moderationQueue||[]).find(x=>String(x.productId)===String(p.id));
          const reviewAction = moderation && moderation.status === 'pending' ? '<button class="action approve" data-moderation-id="'+esc(moderation.id)+'">審査公開</button><button class="action" data-moderation-reject="'+esc(moderation.id)+'">却下</button>' : '';
          return '<div class="video-admin-row"><div><strong>'+esc(p.title)+'</strong><small>'+esc(p.category)+' / '+esc(p.seller)+' / ¥'+Number(p.price||0).toLocaleString()+'</small></div><span class="status '+(status==='public'?'ok':'')+'">'+(status==='public'?'公開':'非公開')+'</span><div class="video-admin-actions">'+reviewAction+'</div><div class="video-admin-actions"><button class="action" data-seller-visibility="'+esc(p.id)+'" data-seller-status="'+status+'">'+(status==='public'?'非公開にする':'公開する')+'</button><a class="action" href="/pages/product-detail.html?sellerProductId='+encodeURIComponent(p.id)+'">詳細</a></div></div>';
        });
        videoPanel.innerHTML = staticRows.concat(sellerRows).join('') || '<div class="notice">動画はありません。</div>';
        document.querySelectorAll('[data-visibility-id]').forEach(btn => btn.addEventListener('click', async () => {
          await api('/api/demo/admin/video-visibility',{method:'POST',body:JSON.stringify({productId:btn.dataset.visibilityId,action:btn.dataset.visibility==='public'?'private':'public'})}); location.reload();
        }));
        document.querySelectorAll('[data-seller-visibility]').forEach(btn => btn.addEventListener('click', async () => {
          await api('/api/demo/admin/video-visibility',{method:'POST',body:JSON.stringify({productId:btn.dataset.sellerVisibility,action:btn.dataset.sellerStatus==='public'?'private':'public'})}); location.reload();
        }));
        document.querySelectorAll('[data-moderation-id]').forEach(btn => btn.addEventListener('click', async () => {
          await api('/api/demo/admin/moderation',{method:'POST',body:JSON.stringify({id:btn.dataset.moderationId,action:'approve'})}); location.reload();
        }));
        document.querySelectorAll('[data-moderation-reject]').forEach(btn => btn.addEventListener('click', async () => {
          await api('/api/demo/admin/moderation',{method:'POST',body:JSON.stringify({id:btn.dataset.moderationReject,action:'reject'})}); location.reload();
        }));
      }

      const sellerPanel = document.querySelector('#sellerApplications');
      if (sellerPanel) {
        const apps = state.sellerApplications || [];
        const appRows = apps.map(x => '<div class="seller-row"><div><strong>'+esc(x.seller)+'</strong><small>申請ID '+esc(x.id)+' / '+esc(x.status)+'</small></div><div class="seller-row-actions">'+(x.status==='pending'?'<button class="approve" data-seller-application="'+esc(x.id)+'" data-seller-action="approve">承認</button><button data-seller-application="'+esc(x.id)+'" data-seller-action="reject">却下</button>':'')+'</div></div>');
        const accountRows = sellerSessions.map(x => '<div class="seller-row"><div><strong>'+esc(x.account?.creator || x.account?.email || '販売者')+'</strong><small>'+esc(x.account?.email||'')+' / アカウント '+esc(x.status||'active')+'</small></div><div class="seller-row-actions"><button data-seller-status-id="'+esc(x.id)+'" data-seller-status-action="'+((x.status||'active')==='active'?'suspend':'activate')+'">'+((x.status||'active')==='active'?'停止':'再開')+'</button></div></div>');
        sellerPanel.innerHTML = '<div class="notice">販売者申請</div>'+appRows.join('')+'<div class="notice">販売者アカウント</div>'+accountRows.join('') || '<div class="notice">販売者データはありません。</div>';
        document.querySelectorAll('[data-seller-application]').forEach(btn => btn.addEventListener('click', async()=>{await api('/api/demo/admin/seller-approval',{method:'POST',body:JSON.stringify({id:btn.dataset.sellerApplication,action:btn.dataset.sellerAction})});location.reload();}));
        document.querySelectorAll('[data-seller-status-id]').forEach(btn => btn.addEventListener('click', async()=>{await api('/api/demo/admin/seller-status',{method:'POST',body:JSON.stringify({sessionId:btn.dataset.sellerStatusId,action:btn.dataset.sellerStatusAction})});location.reload();}));
      }

      const buyerPanel = document.querySelector('#buyerList');
      if (buyerPanel) {
        buyerPanel.innerHTML = buyerSessions.length ? buyerSessions.map(x => {
          const orderCount = Number(x.orderCount||0);
          return '<details class="buyer-row"><summary><strong>'+esc(x.account?.email||'購入者')+'</strong><small>購入 '+(x.purchases||[]).length+'件 / カート '+(x.cart||[]).length+'件 / 注文 '+orderCount+'件</small></summary><div class="notice">購入商品: '+((x.purchases||[]).map(id=>esc(productMap.get(String(id))?.title||id)).join('、')||'なし')+'<br>カート: '+((x.cart||[]).map(id=>esc(productMap.get(String(id))?.title||id)).join('、')||'なし')+'</div></details>';
        }).join('') : '<div class="notice">購入者はありません。</div>';
      }

      const orderPanel = document.querySelector('#orderList');
      if (orderPanel) {
        orderPanel.innerHTML = orders.length ? orders.map(o => {
          const buyer = buyerSessions.find(x=>x.id===o.sessionId);
          const p = productMap.get(String(o.productId));
          return '<div class="buyer-row"><div><strong>'+esc(o.id)+' / '+esc(p?.title||o.productId)+'</strong><small>購入者 '+esc(buyer?.account?.email||'不明')+' / ¥'+Number(o.total||0).toLocaleString()+' / '+esc(o.status||'')+'</small></div><span class="status ok">'+esc(o.entitlement||'active')+'</span></div>';
        }).join('') : '<div class="notice">注文はありません。</div>';
      }
    } catch(e) { console.error('admin management enhancement',e); }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',boot,{once:true}); else boot();
})();