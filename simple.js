const TYPES={elektrina:["⚡","Elektřina","kWh"],plyn:["🟠","Plyn","m³"],studena:["🔵","Studená voda","m³"],tepla:["🔴","Teplá voda","m³"]};
let data={readings:[],enabled:["elektrina","plyn","studena","tepla"]};

function load(){try{const x=JSON.parse(localStorage.getItem("mojeMeridla"));if(x&&Array.isArray(x.readings))data.readings=x.readings;if(x&&Array.isArray(x.enabled)&&x.enabled.length)data.enabled=x.enabled;}catch(e){}}
function save(){try{localStorage.setItem("mojeMeridla",JSON.stringify(data));}catch(e){}}
function latest(t){const r=data.readings.filter(x=>x.type===t).sort((a,b)=>String(a.date).localeCompare(String(b.date)));return r.length?r[r.length-1]:null;}
function home(){
 const a=document.getElementById("app");let h="<h2>Přehled</h2>";
 data.enabled.forEach(t=>{const m=TYPES[t],r=latest(t);h+='<div class="card meter"><span class="icon">'+m[0]+'</span><div><b>'+m[1]+'</b><div class="muted">'+(r?"Poslední odečet: "+r.date:"bez odečtu")+'</div></div><span class="value">'+(r?r.value:"—")+" "+m[2]+"</span></div>";});
 h+='<div class="card"><b>Nový odečet</b><p class="muted">Vyfoť měřidlo nebo vyber fotografie z galerie.</p><button class="btn" id="newReading">➕ Přidat odečet</button></div>';a.innerHTML=h;document.getElementById("newReading").onclick=add;
}
function exifDate(file){
 return new Promise(resolve=>{
  if(!file||!file.type.match(/^image\/jpe?g$/i)){resolve(null);return;}
  const reader=new FileReader();
  reader.onload=function(){
   try{
    const v=new DataView(reader.result);if(v.getUint16(0,false)!==0xFFD8){resolve(null);return;}
    let o=2;
    while(o<v.byteLength){
     if(v.getUint8(o)!==0xFF){o++;continue;}
     const marker=v.getUint8(o+1),len=v.getUint16(o+2,false);
     if(marker===0xE1){
      const start=o+4;if(new TextDecoder().decode(new Uint8Array(v.buffer,start,6))!=="Exif\0\0"){o+=2+len;continue;}
      const t=start+6;const little=v.getUint16(t,false)===0x4949;const u16=p=>v.getUint16(p,little),u32=p=>v.getUint32(p,little);
      const ifd=t+u32(t+4);const n=u16(ifd);
      for(let i=0;i<n;i++){const p=ifd+2+i*12,tag=u16(p);if(tag===0x8769||tag===0x9003){const sub=t+u32(p+8),sn=u16(sub);for(let j=0;j<sn;j++){const q=sub+2+j*12;if(u16(q)===0x9003){const off=t+u32(q+8);const s=new TextDecoder().decode(new Uint8Array(v.buffer,off,19)).trim();const m=s.match(/(\\d{4}):(\\d{2}):(\\d{2})/);if(m){resolve(m[1]+"-"+m[2]+"-"+m[3]);return;}}}}}}
     o+=2+len;
    }
   }catch(e){}
   resolve(null);
  };reader.readAsArrayBuffer(file.slice(0,128*1024));
 });
}
function guessType(text,name){
 const s=(text+" "+name).toLowerCase();
 if(/kwh|kw\/h|elektr|elektrom/.test(s))return "elektrina";
 if(/plyn|gas|m3|m³/.test(s))return "plyn";
 if(/tepl|hot water|tuv/.test(s))return "tepla";
 if(/vod|water|studen/.test(s))return "studena";
 return data.enabled[0]||"elektrina";
}
function numberFromOCR(text){
 const a=(text||"").replace(/,/g,".").match(/\d[\d\s.]{2,}/g)||[];
 const nums=a.map(x=>x.replace(/\s/g,"")).filter(x=>/^\d+(?:\.\d+)?$/.test(x));
 return nums.length?nums.sort((a,b)=>b.length-a.length)[0]:"";
}
async function processPhotos(files){
 const results=[];const info=document.getElementById("photoInfo");
 for(let i=0;i<files.length;i++){
  const f=files[i];info.textContent="🔎 Zpracovávám fotografii "+(i+1)+" z "+files.length+"…";
  const date=await exifDate(f);let text="";
  try{if(window.Tesseract){const r=await Tesseract.recognize(f,"eng",{logger:m=>{if(m.status==="recognizing text"&&m.progress)info.textContent="🔎 OCR "+(i+1)+"/"+files.length+" — "+Math.round(m.progress*100)+" %";}});text=r.data.text||"";}}catch(e){}
  const value=numberFromOCR(text);const type=guessType(text,f.name);
  results.push({file:f,date:date||new Date().toISOString().slice(0,10),value,type,ocr:text});
 }
 return results;
}
function add(){
 const a=document.getElementById("app");let h="<h2>Nový odečet</h2><div class='card'>";
 h+="<label>Měřidlo</label><select id='type'>";data.enabled.forEach(t=>h+="<option value='"+t+"'>"+TYPES[t][0]+" "+TYPES[t][1]+"</option>");h+="</select>";
 h+="<label>Datum odečtu</label><input id='date' type='date'>";
 h+="<label>Stav</label><input id='value' inputmode='decimal' placeholder='např. 12345,6'>";
 h+="<label>Fotografie</label><div class='row photo-buttons'><button type='button' class='btn' id='cameraBtn'>📷 Fotoaparát</button><button type='button' class='btn secondary' id='galleryBtn'>🖼️ Galerie</button></div>";
 h+="<input id='cameraInput' type='file' accept='image/*' capture='environment' hidden><input id='galleryInput' type='file' accept='image/*' multiple hidden>";
 h+="<div id='photoInfo' class='muted'>Z galerie můžeš vybrat více fotografií najednou.</div><div id='photoResults'></div>";
 h+="<button class='btn' id='saveReading'>💾 Uložit</button></div>";a.innerHTML=h;
 document.getElementById("date").value=new Date().toISOString().slice(0,10);
 const cam=document.getElementById("cameraInput"),gal=document.getElementById("galleryInput"),info=document.getElementById("photoInfo");
 document.getElementById("cameraBtn").onclick=()=>cam.click();document.getElementById("galleryBtn").onclick=()=>gal.click();
 async function selected(files){
  if(!files||!files.length)return;
  const rs=await processPhotos(Array.from(files));const box=document.getElementById("photoResults");box.innerHTML="";
  rs.forEach((r,i)=>{
   const m=TYPES[r.type];box.innerHTML+="<div class='card'><b>"+m[0]+" "+m[1]+"</b><label>Datum z EXIF</label><input type='date' id='pd"+i+"' value='"+r.date+"'><label>Rozpoznaná hodnota</label><input id='pv"+i+"' value='"+r.value+"' inputmode='decimal'><label>Měřidlo</label><select id='pt"+i+"'>"+data.enabled.map(t=>"<option value='"+t+"' "+(t===r.type?"selected":"")+">"+TYPES[t][0]+" "+TYPES[t][1]+"</option>").join("")+"</select><div class='muted'>"+r.file.name+"</div></div>";
  });
  info.textContent="✅ Zpracováno "+rs.length+" fotografií. Zkontroluj údaje a ulož.";
  window._photoResults=rs;
  if(rs.length===1){document.getElementById("date").value=rs[0].date;if(rs[0].value)document.getElementById("value").value=rs[0].value;document.getElementById("type").value=rs[0].type;}
 }
 cam.onchange=()=>selected(cam.files);gal.onchange=()=>selected(gal.files);
 document.getElementById("saveReading").onclick=function(){
  const rs=window._photoResults||[];
  if(rs.length){
   rs.forEach((r,i)=>{const v=document.getElementById("pv"+i).value.replace(",","."),d=document.getElementById("pd"+i).value,t=document.getElementById("pt"+i).value;if(v&&!isNaN(v))data.readings.push({id:Date.now()+i,type:t,date:d,value:Number(v)});});
   save();home();return;
  }
  const v=document.getElementById("value").value.replace(",",".");if(!v||isNaN(v)){alert("Zadej platnou hodnotu.");return;}
  data.readings.push({id:Date.now(),type:document.getElementById("type").value,date:document.getElementById("date").value,value:Number(v)});save();home();
 };
}
function history(){const a=document.getElementById("app");let h="<h2>Historie</h2>";if(!data.readings.length)h+="<div class='card muted'>Zatím nejsou žádné odečty.</div>";data.readings.slice().sort((a,b)=>String(b.date).localeCompare(String(a.date))).forEach(r=>{const m=TYPES[r.type];h+="<div class='card'><b>"+m[0]+" "+m[1]+"</b><div>"+r.date+"</div><div class='value'>"+r.value+" "+m[2]+"</div></div>";});a.innerHTML=h;}
function settings(){const a=document.getElementById("app");let h="<h2>Nastavení</h2><div class='card'><b>Zobrazená měřidla</b>";Object.keys(TYPES).forEach(t=>h+="<label><input type='checkbox' data-meter='"+t+"' "+(data.enabled.indexOf(t)>=0?"checked":"")+"> "+TYPES[t][0]+" "+TYPES[t][1]+"</label>");h+="</div><div class='card'><b>Záloha</b><p class='muted'>Odečty a nastavení bez fotografií.</p><button class='btn' id='export'>⬇️ Export JSON</button></div>";a.innerHTML=h;a.querySelectorAll("[data-meter]").forEach(c=>c.onchange=function(){data.enabled=Object.keys(TYPES).filter(t=>a.querySelector("[data-meter='"+t+"']").checked);if(!data.enabled.length){this.checked=true;data.enabled=[this.dataset.meter];}save();home();});document.getElementById("export").onclick=function(){const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"});const u=URL.createObjectURL(blob),x=document.createElement("a");x.href=u;x.download="moje-odecet-zaloha.json";x.click();URL.revokeObjectURL(u);};}
document.addEventListener("DOMContentLoaded",function(){load();document.querySelectorAll("nav button").forEach(function(b){b.onclick=function(){if(b.dataset.page==="home")home();if(b.dataset.page==="add")add();if(b.dataset.page==="history")history();if(b.dataset.page==="settings")settings();};});document.getElementById("settings").onclick=settings;home();});