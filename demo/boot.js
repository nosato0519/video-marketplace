function goHome(){hideWorkspace();window.scrollTo({top:0,behavior:'smooth'});}
function goBrowse(){hideWorkspace();setTimeout(()=>document.getElementById('market').scrollIntoView({behavior:'smooth'}),20);}
function goCategories(){hideWorkspace();setTimeout(()=>document.getElementById('categorySection').scrollIntoView({behavior:'smooth'}),20);}
function showBuyer(){activeTab='library';renderRole();document.getElementById('workspace').scrollIntoView({behavior:'smooth'});}
function showSeller(){activeTab='overview';login('seller').then(()=>sellerView()).catch(e=>toast(e.message));}
function showAdmin(){activeTab='overview';login('admin').then(()=>adminView()).catch(e=>toast(e.message));}
function loginModal(){openModal(`<span class="eyebrow">Demo access</span><h2>Choose a workspace</h2><p class="muted">No real credentials are required. This switches the server-backed demo session.</p><div class="actions"><button class="btn primary" onclick="closeModal();login('buyer')">Buyer</button><button class="btn" onclick="closeModal();showSeller()">Seller</button><button class="btn" onclick="closeModal();showAdmin()">Admin</button></div>`);}
function openModal(html){document.getElementById('modal').innerHTML=`<div class="modal"><button class="x" onclick="closeModal()">×</button>${html}</div>`;showModal();}
window.goHome=goHome;window.goBrowse=goBrowse;window.goCategories=goCategories;window.showBuyer=showBuyer;window.showSeller=showSeller;window.showAdmin=showAdmin;window.loginModal=loginModal;window.openModal=openModal;
