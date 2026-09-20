(async () => {
 const W=window.Wishlist,login=document.querySelector('#login-panel'),dashboard=document.querySelector('#dashboard'),form=document.querySelector('#edit-form');
 let db,rows=[],authorized=false;
 function clearEditor(){form.reset();document.querySelector('#edit-id').value='';document.querySelector('#editor-heading').textContent='Add an item';}
 function showLogin(){authorized=false;dashboard.hidden=true;login.hidden=false;document.querySelector('#admin-items').replaceChildren();clearEditor();}
 async function loadItems(){
   rows=await W.list();const container=document.querySelector('#admin-items');container.replaceChildren();
   for(const item of rows){
     const card=W.card(item),actions=W.el('div','actions');
     const edit=W.el('button','secondary','Edit');edit.type='button';edit.addEventListener('click',()=>{
       document.querySelector('#edit-id').value=item.id;document.querySelector('#name').value=item.name;document.querySelector('#description').value=item.description;document.querySelector('#image-url').value=item.image_url;document.querySelector('#links').value=item.links.map(l=>l.label+' | '+l.url).join('\n');document.querySelector('#sort-order').value=item.sort_order;document.querySelector('#is-sample').checked=item.is_sample;document.querySelector('#editor-heading').textContent='Edit item';document.querySelector('#name').focus();
     });
     const remove=W.el('button','danger','Remove');remove.type='button';remove.addEventListener('click',async()=>{
       if(!confirm('Remove “'+item.name+'” from the wishlist?'))return;remove.disabled=true;
       try{const {data,error}=await db.from('wishlist_items').delete().eq('id',item.id).select('id');if(error)throw error;if(!data.length)throw new Error('The item was removed already, or access has changed.');await loadItems();if(document.querySelector('#edit-id').value===item.id)clearEditor();W.status('Item removed.');}catch(error){W.status(error.message,true);remove.disabled=false;}
     });actions.append(edit,remove);
     if(item.purchased_at){const reset=W.el('button','secondary','Reset to available');reset.type='button';reset.addEventListener('click',async()=>{
       if(!confirm('Make “'+item.name+'” available to buy again?'))return;reset.disabled=true;
       try{const {data,error}=await db.from('wishlist_items').update({purchased_at:null}).eq('id',item.id).select('id');if(error)throw error;if(!data.length)throw new Error('Item missing or access denied.');await loadItems();W.status('Item is available again.');}catch(error){W.status(error.message,true);reset.disabled=false;}
     });actions.append(reset);}
     card.querySelector('.item-body').append(actions);container.append(card);
   }
   if(!rows.length)container.append(W.el('p','empty','Your list is empty. Add your first item.'));
 }
 async function checkAccess(){
   const {data,error}=await db.rpc('is_wishlist_admin');if(error)throw error;
   if(!data){await db.auth.signOut();throw new Error('This account is not a wishlist administrator. Add its user ID to wishlist_admins in Supabase.');}
   authorized=true;login.hidden=true;dashboard.hidden=false;await loadItems();
 }
 if(W.demo){document.querySelector('#login-button').disabled=true;W.status('Admin is not connected yet. Follow README.md to set up Supabase and add the two public values to config.js. The homepage demo is ready to try.');return;}
 try{db=await W.client();db.auth.onAuthStateChange(event=>{if(event==='SIGNED_OUT'){showLogin();W.status('Signed out.');}});}catch(error){W.status('Unable to connect. '+error.message,true);document.querySelector('#login-button').disabled=true;return;}
 document.querySelector('#login-form').addEventListener('submit',async e=>{
   e.preventDefault();const button=document.querySelector('#login-button');button.disabled=true;W.status('Signing in…');
   try{const {error}=await db.auth.signInWithPassword({email:document.querySelector('#email').value.trim(),password:document.querySelector('#password').value});if(error)throw error;await checkAccess();W.status('Signed in. You can now manage your wishlist.');}catch(error){showLogin();W.status(error.message,true);}finally{document.querySelector('#password').value='';button.disabled=false;}
 });
 document.querySelector('#logout').addEventListener('click',async()=>{const {error}=await db.auth.signOut();if(error)W.status(error.message,true);else showLogin();});
 document.querySelector('#cancel-edit').addEventListener('click',clearEditor);
 form.addEventListener('submit',async e=>{
   e.preventDefault();if(!authorized)return;const save=document.querySelector('#save-button');save.disabled=true;
   try{
     const name=document.querySelector('#name').value.trim();if(!name)throw new Error('Enter an item name.');
     const image=document.querySelector('#image-url').value.trim();if(image&&!W.safeUrl(image,true))throw new Error('Use an HTTPS picture URL or a path such as assets/photo.jpg.');
     const lines=document.querySelector('#links').value.split('\n').map(l=>l.trim()).filter(Boolean);if(lines.length>10)throw new Error('Use no more than 10 store links.');
     const links=lines.map(line=>{const split=line.indexOf('|');if(split<1)throw new Error('Each store link must use: Store name | https://…');const label=line.slice(0,split).trim(),url=W.safeUrl(line.slice(split+1).trim());if(!label||label.length>80||!url)throw new Error('Give each link a short store name and valid HTTPS address.');return {label,url};});
     const sort=Number(document.querySelector('#sort-order').value);if(!Number.isInteger(sort)||Math.abs(sort)>100000)throw new Error('Display order must be a whole number between -100000 and 100000.');
     const payload={name,description:document.querySelector('#description').value.trim(),image_url:image,links,sort_order:sort,is_sample:document.querySelector('#is-sample').checked};
     const id=document.querySelector('#edit-id').value;
     const query=id?db.from('wishlist_items').update(payload).eq('id',id):db.from('wishlist_items').insert(payload);
     const {data,error}=await query.select('id');if(error)throw error;if(!data.length)throw new Error('Item missing or access denied.');clearEditor();await loadItems();W.status('Item saved.');
   }catch(error){W.status(error.message,true);}finally{save.disabled=false;}
 });
})();
