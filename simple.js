const TYPES={elektrina:["⚡","Elektřina","kWh"],plyn:["🟠","Plyn","m³"],studena:["🔵","Studená voda","m³"],tepla:["🔴","Teplá voda","m³"]};
let data={readings:[],enabled:Object.keys(TYPES)};
try{const x=JSON.parse(localStorage.getItem("mojeMeridla")||"null");if(x){if(Array.isArray(x.readings))data.readings=x.readings;if(Array.isArray(x.enabled)&&x.enabled.length)data.enabled=x.enabled}}catch(e){}
function renderHome(){
 const a=document.getElementById("app");
 let html="<h2>Přehled</h2>";
 data.enabled.forEach(t=>{const m=TYPES[t];html+='<div class="card meter"><span class="icon">'+m[0]+'</span><div><b>'+m[1]+'</b><div class="muted">bez odečtu</div></div><span class="value">— '+m[2]+'</span></div>'});
 html+='<div class="card"><b>Nový odečet</b><p class="muted">Přidej aktuální stav měřidla.</p><button class="btn" id="add">➕ Přidat odečet</button></div>';
 a.innerHTML=html;
 document.getElementById("add").onclick=()=>renderAdd();
}
function renderAdd(){
 const a=document.getElementById("app");
 a.innerHTML='<h2>Nový odečet</h2><div class="card"><label>Měřidlo</label><select id="type">'+data.enabled.map(t=>'<option value="'+t+'">'+TYPES[t][0]+' '+TYPES[t][1]+'</option>').join("")+'</select><label>Datum</label><input id="date" type="date"><label>Stav</label><input id="val" inputmode="decimal" placeholder="např. 12345,6"><button class="btn" id="save">💾 Uložit</button></div>';
 document.getElementById("date").value=new Date().toISOString().slice(0,10);
 document.getElementById("save").onclick=()=>{const v=document.getElementById("val").value.replace(",",".");if(!v||isNaN(v)){alert("Zadej platnou hodnotu.");return}data.readings.push({id:Date.now(),type:document.getElementById("type").value,date:document.getElementById("date").value,value:+v});localStorage.setItem("mojeMeridla",JSON.stringify(data));renderHome()};
}
document.addEventListener("DOMContentLoaded",()=>{
 document.querySelectorAll("nav button").forEach(b=>b.onclick=()=>{if(b.dataset.page==="home")renderHome();else if(b.dataset.page==="add")renderAdd();else document.getElementById("app").innerHTML='<h2>'+b.querySelector("span").textContent+'</h2><div class="card">Tato část bude doplněna.</div>'});
 document.getElementById("settings").onclick=()=>document.querySelector('nav [data-page="settings"]').click();
 renderHome();
});