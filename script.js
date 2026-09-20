(() => {
 const W=window.Wishlist, items=document.querySelector('#items'),select=document.querySelector('#item-select'),button=document.querySelector('#purchase-button'),dialog=document.querySelector('#purchase-dialog');
 let rows=[],loading=false,busy=false,pendingId=null,lastData='',loadFailed=false;
 if(W.config.title){document.title=W.config.title;document.querySelector('[data-title]').textContent=W.config.title;}
 document.querySelector('#demo-banner').hidden=!W.demo;
 function render(){
   items.replaceChildren(...rows.map(W.card));
   if(!rows.length)items.append(W.el('p','empty','The list is taking shape. Check back soon!'));
   document.querySelector('#count').textContent=rows.length;
   const available=rows.filter(i=>!i.purchased_at);
   document.querySelector('#available-count').textContent=available.length+' available';
   const previous=select.value;select.replaceChildren(new Option(available.length?'Choose an item':'Everything is purchased', ''));
   available.forEach(i=>select.add(new Option(i.name,i.id)));
   if(available.some(i=>i.id===previous))select.value=previous;
   select.disabled=!available.length||busy;button.disabled=!available.length||busy;
 }
 async function refresh(manual=false){
   if(loading||busy)return;
   loading=true;items.setAttribute('aria-busy','true');
   try{rows=await W.list();const signature=JSON.stringify(rows);if(signature!==lastData||loadFailed){render();lastData=signature;}else{const available=rows.some(i=>!i.purchased_at);select.disabled=!available;button.disabled=!available;}document.querySelector('#retry').hidden=true;if(manual||loadFailed)W.status('Wishlist updated.');loadFailed=false;}
   catch(error){loadFailed=true;W.status('Couldn’t load the latest wishlist. Check your connection and try again. '+(rows.length?'Previously loaded items may be out of date.':''),true);document.querySelector('#retry').hidden=false;select.disabled=true;button.disabled=true;if(!rows.length)items.replaceChildren(W.el('p','empty','The wishlist is unavailable right now.'));}
   finally{loading=false;items.setAttribute('aria-busy','false');}
 }
 document.querySelector('#purchase-form').addEventListener('submit',e=>{e.preventDefault();const item=rows.find(i=>i.id===select.value&&!i.purchased_at);if(!item||busy)return;pendingId=item.id;document.querySelector('#confirm-name').textContent=item.name;dialog.returnValue='';dialog.showModal();});
 dialog.addEventListener('close',async()=>{
   if(dialog.returnValue!=='confirm'||!pendingId||busy)return;
   const id=pendingId;pendingId=null;busy=true;select.disabled=true;button.disabled=true;button.textContent='Saving…';
   try{const changed=await W.purchase(id);W.status(changed?(W.demo?'Demo purchase saved in this browser.':'Thank you! Your gift is now marked purchased.'):'This item was already purchased or removed. The list has been refreshed.');}
   catch{W.status('Couldn’t confirm the purchase. Check your connection and refresh before trying again.',true);}
   finally{busy=false;button.textContent='Mark as purchased ↗';await refresh();}
 });
 document.querySelector('#reset-demo').addEventListener('click',()=>{try{localStorage.removeItem(W.storageKey);W.status('Demo reset.');refresh();}catch{W.status('Your browser is blocking demo storage.',true);}});
 document.querySelector('#retry').addEventListener('click',()=>refresh(true));
 window.addEventListener('storage',()=>refresh());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 // Polling avoids requiring a Realtime publication. Purchases update immediately for the buyer.
 setInterval(()=>{if(!document.hidden)refresh();},15000);
 refresh();
})();
