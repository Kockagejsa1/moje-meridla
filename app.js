const TYPES={
  elektrina:["⚡","Elektřina","kWh"],
  plyn:["🟠","Plyn","m³"],
  studena:["🔵","Studená voda","m³"],
  tepla:["🔴","Teplá voda","m³"]
};

const DEFAULT={readings:[],enabled:["elektrina","plyn","studena","tepla"]};
let d;
try{d=JSON.parse(localStorage.getItem("mojeMeridla")||"null")||structuredClone(DEFAULT)}
catch(e){d=structuredClone(DEFAULT)}
if(!Array.isArray(d.readings)) d.readings=[];
if(!Array.isArray(d.enabled)||d.enabled.length===0) d.enabled=Object.keys(TYPES);
let page="home";

function save(){localStorage.setItem("mojeMeridla",JSON.stringify(d))}
function last(t){return d.readings.filter(x=>x.type===t).sort((a,b)=>b.date.localeCompare(a.date))[0]}
function show(p){page=p;render();window.scrollTo(0,0)}
function render(){
  const a=document.querySelector("#app");
  if(!a)return;
  if(page==="home"){
    const cards=d.enabled.map(t=>{
      const x=last(t),m=TYPES[t];
      return '<div class="card meter"><span class="icon">'+m[0]+'</span><div><b>'+m[1]+'</b><div class="muted">'+(x?x.date:"bez odečtu")+'</div></div><span class="value">'+(x?x.value:"—")+' '+m[2]+'</span></div>'
    }).join("");
    a.innerHTML="<h2>Přehled</h2>"+cards+'<div class="card"><b>Nový odečet</b><p class="muted">Ručně, z galerie nebo fotoaparátem.</p><button class="primary" onclick="show(\'add\')">➕ Přidat odečet</button></div>';
  }
  if(page==="add")add(a);
  if(page==="history")hist(a);
  if(page==="settings")settings(a);
}
function add(a){
  a.innerHTML='<h2>Nový odečet</h2><div class="card">'+
  '<label>Měřidlo</label><select id="type">'+d.enabled.map(t=>'<option value="'+t+'">'+TYPES[t][0]+' '+TYPES[t][1]+'</option>').join("")+'</select>'+
  '<label>Datum</label><input id="date" type="date" value="'+new Date().toISOString().slice(0,10)+'">'+
  '<label>Stav</label><input id="val" inputmode="decimal" placeholder="např. 12345,6">'+
  '<div class="grid"><button class="secondary" onclick="pick(false)">🖼️ Galerie</button><button class="secondary" onclick="pick(true)">📷 Fotoaparát</button></div>'+
  '<input id="file" type="file" accept="image/*" hidden><div id="preview"></div>'+
  '<button class="primary" onclick="saveRead()">💾 Uložit</button></div>';
}
function pick(cam){
  const f=document.querySelector("#file");
  f.setAttribute("capture",cam?"environment":"");
  f.onchange=()=>{
    if(!f.files[0])return;
    const file=f.files[0],u=URL.createObjectURL(file);
    document.querySelector("#preview").innerHTML='<img class="photo" src="'+u+'"><p class="muted">Rozpoznávám číslo…</p>';
    if(typeof Tesseract==="undefined"){
      document.querySelector("#preview").innerHTML='<img class="photo" src="'+u+'"><p class="muted">OCR není právě dostupné. Hodnotu zadej ručně.</p>';
      return;
    }
    Tesseract.recognize(file,"eng").then(r=>{
      const n=(r.data.text.replace(/,/g,".").match(/\d+(?:\.\d+)?/g)||[]).sort((a,b)=>b.length-a.length)[0];
      document.querySelector("#preview").innerHTML='<img class="photo" src="'+u+'"><p class="ok">'+(n?"Rozpoznaná hodnota: "+n:"Hodnotu zadej ručně")+"</p>";
      if(n)document.querySelector("#val").value=n;
    }).catch(()=>document.querySelector("#preview").innerHTML="<p>OCR se nepodařilo. Hodnotu zadej ručně.</p>");
  };
  f.click();
}
function saveRead(){
  const v=document.querySelector("#val").value.replace(",",".");
  if(!v||isNaN(v))return alert("Zadej platnou hodnotu.");
  d.readings.push({id:Date.now(),type:document.querySelector("#type").value,date:document.querySelector("#date").value,value:+v});
  save();show("home");
}
function hist(a){
  const r=[...d.readings].sort((x,y)=>y.date.localeCompare(x.date));
  a.innerHTML="<h2>Historie</h2>"+(r.length?r.map(x=>{
    const m=TYPES[x.type],p=d.readings.filter(y=>y.type===x.type&&y.date<x.date).sort((u,v)=>v.date.localeCompare(u.date))[0],q=p?x.value-p.value:null;
    return '<div class="card"><b>'+m[0]+" "+m[1]+"</b> <span class="muted">"+x.date+'</span><h2>'+x.value+" "+m[2]+"</h2>"+(q===null?"První odečet":"Spotřeba: "+q.toFixed(2)+" "+m[2])+"</div>"
  }).join(""):"<div class='card'>Zatím žádné odečty.</div>");
}
function settings(a){
  a.innerHTML="<h2>Nastavení</h2><div class='card'><b>Měřidla</b>"+Object.entries(TYPES).map(([k,m])=>'<label><input type="checkbox" data-t="'+k+'" '+(d.enabled.includes(k)?"checked":"")+"> "+m[0]+" "+m[1]+"</label>").join("")+"</div><div class='card'><b>Záloha dat</b><p class='muted'>Fotografie se neukládají.</p><button class='secondary' onclick='jsonOut()'>💾 JSON záloha</button> <button class='secondary' onclick='csvOut()'>📊 Excel/CSV</button></div>";
  document.querySelectorAll("[data-t]").forEach(x=>x.onchange=()=>{
    d.enabled=[...document.querySelectorAll("[data-t]:checked")].map(y=>y.dataset.t);
    if(!d.enabled.length){x.checked=true;d.enabled=[x.dataset.t]}
    save();render();
  });
}
function download(name,content,type){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob([content],{type}));
  a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}
function jsonOut(){download("moje-meridla.json",JSON.stringify(d,null,2),"application/json")}
function csvOut(){
  const rows=[["Datum","Měřidlo","Stav","Jednotka","Předchozí stav","Spotřeba"]];
  [...d.readings].sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>{
    const m=TYPES[x.type],p=d.readings.filter(y=>y.type===x.type&&y.date<x.date).sort((a,b)=>b.date.localeCompare(a.date))[0];
    rows.push([x.date,m[1],x.value,m[2],p?p.value:"",p?(x.value-p.value).toFixed(2):""]);
  });
  download("moje-meridla.csv",rows.map(r=>r.join(";")).join("\n"),"text/csv;charset=utf-8");
}

document.addEventListener("DOMContentLoaded",()=>{
  document.querySelectorAll("nav [data-page]").forEach(b=>b.addEventListener("click",()=>show(b.dataset.page)));
  document.querySelector("#settings")?.addEventListener("click",()=>show("settings"));
  render();
  if("serviceWorker"in navigator)navigator.serviceWorker.register("sw.js").catch(()=>{});
});