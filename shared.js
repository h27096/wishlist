/* Shared DOM helpers and data layer. No secret credentials belong in this project. */
window.Wishlist = (() => {
  const config = window.WISHLIST_CONFIG || {};
  const demo = !config.supabaseUrl && !config.supabasePublishableKey;
  let clientPromise;
  function client() {
    if (demo) return Promise.resolve(null);
    if (!clientPromise) clientPromise = (async () => {
      if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(config.supabaseUrl || '') || !config.supabasePublishableKey) throw new Error('Complete both Supabase settings in config.js.');
      const {createClient} = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.102.0/+esm');
      return createClient(config.supabaseUrl, config.supabasePublishableKey, {auth:{persistSession:false,detectSessionInUrl:false,autoRefreshToken:true}});
    })();
    return clientPromise;
  }
  const storageKey = 'wishlist-demo-purchases-v1';
  function readDemo() {
    let purchased = [];
    try { const saved = JSON.parse(localStorage.getItem(storageKey) || '[]'); if (Array.isArray(saved)) purchased = saved; } catch { /* A demo can still render if storage is unavailable. */ }
    return window.SAMPLE_ITEMS.map(i => ({...i, purchased_at: i.purchased_at || (purchased.includes(i.id) ? '2026-01-01T00:00:00Z' : null)}));
  }
  async function list() {
    if (demo) return readDemo();
    const db = await client();
    const {data,error} = await db.from('wishlist_items').select('*').order('sort_order').order('created_at').order('id');
    if (error) throw error;
    return data;
  }
  async function purchase(id) {
    if (demo) {
      const rows = readDemo();
      const row = rows.find(i => i.id === id);
      if (!row || row.purchased_at) return false;
      const ids = rows.filter(i => i.purchased_at).map(i => i.id);
      localStorage.setItem(storageKey, JSON.stringify([...ids,id]));
      return true;
    }
    const db = await client();
    const {data,error} = await db.rpc('mark_purchased', {item_id:id});
    if (error) throw error;
    return data;
  }
  function safeUrl(value, image = false) {
    if (typeof value !== 'string' || !value.trim()) return '';
    if (image && /^assets\/[a-z0-9_./-]+$/i.test(value) && !value.includes('..')) return value;
    try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
  }
  function el(tag, className, text) { const node = document.createElement(tag); if(className) node.className = className; if(text !== undefined) node.textContent = text; return node; }
  function card(item) {
    const article = el('article', 'item' + (item.purchased_at ? ' purchased' : ''));
    const img = el('img','item-image'); img.src = safeUrl(item.image_url,true) || 'assets/gift.svg'; img.alt = item.name; img.loading = 'lazy'; img.width=152; img.height=152;
    img.addEventListener('error',() => {img.src='assets/gift.svg';},{once:true});
    const body=el('div','item-body'), badges=el('div','item-top');
    badges.append(el('span','badge',item.purchased_at ? '✓ Purchased' : 'Available'));
    if(item.is_sample) badges.append(el('span','badge sample','Sample item'));
    body.append(badges,el('h3','',item.name),el('p','description',item.description));
    const links=el('div','buy-links');
    for(const link of Array.isArray(item.links) ? item.links : []) {const url=safeUrl(link.url); if(!url) continue; const a=el('a','',link.label+' ↗');a.href=url;a.target='_blank';a.rel='noopener noreferrer';links.append(a);}
    body.append(links);article.append(img,body);return article;
  }
  function status(message, error=false) {const node=document.querySelector('#status');node.textContent=message;node.classList.toggle('error',error);}
  return {config,demo,client,list,purchase,safeUrl,el,card,status,storageKey};
})();
