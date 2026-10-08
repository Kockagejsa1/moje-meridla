const TYPES={
  elektrina:["⚡","Elektřina","kWh"],
  plyn:["🟠","Plyn","m³"],
  studena:["🔵","Studená voda","m³"],
  tepla:["🔴","Teplá voda","m³"]
};
const DEFAULT={readings:[],enabled:["elektrina","plyn","studena","tepla"]};
let d={readings:[],enabled:Object.keys(TYPES)},page="home";

try{
  const raw=localStorage.getItem("mojeMeridla");
  if(raw){
    const saved=JSON.parse(raw);
    if(saved && Array.isArray(saved.readings)) d.readings=saved.readings;
    if(saved && Array.isArray(saved.enabled) && saved.enabled.length) d.enabled=saved.enabled;
  }
}catch(e){ console.warn("Data se nepodařilo načíst",e); }

function save(){try{localStorage.setItem("mojeMeridla",JSON.stringify(d))}catch(e){alert("Data se nepodařilo uložit.")}}
function last(t){return d.readings.filter(x=>x.type===t).sort((a,b)=>String(b.date).localeCompare(String(a.date)))[0]}
function show(p){page=p;render();window.scrollTo(0,0)}
function render(){
  const a=document.querySelector("#app");
  if(!a)return;
  try{
    if(page==="home"){
      const cards=d.enabled.filter(t=>TYPES[t]).map(t=>{
        const x=last(t),m=TYPES[t];
        return '<div class="card meter"><span class="icon">'+m[0]+'</span><div><b>'+m[1]+'</b><div class="muted">'+(x?x.date:"bez odečtu")+'</div></div><span class="value">'+(x?x.value:"—")+' '+m[2]+'</span></div>';
      }).join("");
      a.innerHTML="<h2>Přehled</h2>"+cards+'<div class="card"><b>Nový odečet</b><p class="muted">Zadej stav ručně nebo později použij fotografii.</p><button class="btn" id="addBtn">➕ Přidat odečet</button></div>';
      document.querySelector("#addBtn").onclick=()=>show("add");
    }else if(page==="add")add(a);
    else if(page==="history")hist(a);
    else if(page==="settings")settings(a);
  }catch(e){
    a.innerHTML='<div class="card"><h2>Chyba aplikace</h2><p>Obsah se nepodařilo načíst.</p><p class="muted">'+String(e.message||e)+'</p><button class="btn" onclick="location.reload()">🔄 Načíst znovu</button></div>';
  }
}
function add(a){
  a.innerHTML='<h2>Nový odečet</h2><div class="card">'+
  '<label>Měřidlo</label><select id="type">'+d.enabled.filter(t=>TYPES[t]).map(t=>'<option value="'+t+'">'+TYPES[t][0]+' '+TYPES[t][1]+'</option>').join("")+'</select>'+
  '<label>Datum</label><input id="date" type="date" value="'+new Date().toISOString().slice(0,10)+'">'+
  '<label>Stav</label><input id="val" inputmode="decimal" placeholder="např. 12345,6">'+
  '<p class="muted">Fotografické OCR přidáme až po ověření základní funkčnosti.</p>'+
  '<button class="btn" id="saveBtn">💾 Uložit odečet</button></div>';
  document.querySelector("#saveBtn").onclick=saveRead;
}
function saveRead(){
  const v=document.querySelector("#val").value.replace(",",".").trim();
  if(!v||isNaN(v))return alert("Zadej platnou hodnotu.");
  d.readings.push({id:Date.now(),type:document.querySelector("#type").value,date:document.querySelector("#date").value,value:+v});
  save();show("home");
}
function hist(a){
  const r=[...d.readings].sort((x,y)=>String(y.date).localeCompare(String(x.date)));
  a.innerHTML="<h2>Historie</h2>"+(r.length?r.map(x=>{
    const m=TYPES[x.type];
    if(!m)return "";
    const p=d.readings.filter(y=>y.type===x.type&&y.date<x.date).sort((u,v)=>String(v.date).localeCompare(String(u.date)))[0];
    const q=p?x.value-p.value:null;
    return '<div class="card"><b>'+m[0]+" "+m[1]+"</b> <span class="muted">"+x.date+'</span><h2>'+x.value+" "+m[2]+"</h2>"+(q===null?"První odečet":"Spotřeba: "+q.toFixed(2)+" "+m[2])+"</div>";
  }).join(""):"<div class='card'>Zatím žádné odečty.</div>");
}
function settings(a){
  a.innerHTML="<h2>Nastavení</h2><div class='card'><b>Měřidla</b>"+Object.entries(TYPES).map(([k,m])=>'<label><input type="checkbox" data-t="'+k+'" '+(d.enabled.includes(k)?"checked":"")+"> "+m[0]+" "+m[1]+"</label>").join("")+
  "</div><div class='card'><b>Záloha dat</b><p class='muted'>Fotografie se neukládají.</p><button class='btn' id='jsonBtn'>💾 JSON záloha</button></div>";
  document.querySelectorAll("[data-t]").forEach(x=>x.onchange=()=>{
    d.enabled=[...document.querySelectorAll("[data-t]:checked")].map(y=>y.dataset.t);
    if(!d.enabled.length){x.checked=true;d.enabled=[x.dataset.t]}
    save();render();
  });
  document.querySelector("#jsonBtn").onclick=()=>download("moje-meridla.json",JSON.stringify(d,null,2),"application/json");
}
function download(name,content,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([content],{type}));
  a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("nav [data-page]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.page)));
  document.querySelector("#settings")?.addEventListener("click",()=>show("settings"));
  render();
  if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js?v=4").catch(()=>{});
});