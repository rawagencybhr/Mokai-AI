"use strict";(()=>{var e={};e.id=654,e.ids=[654],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6113:e=>{e.exports=require("crypto")},9523:e=>{e.exports=require("dns")},2361:e=>{e.exports=require("events")},7147:e=>{e.exports=require("fs")},3685:e=>{e.exports=require("http")},5158:e=>{e.exports=require("http2")},1808:e=>{e.exports=require("net")},2037:e=>{e.exports=require("os")},1017:e=>{e.exports=require("path")},7282:e=>{e.exports=require("process")},2781:e=>{e.exports=require("stream")},4404:e=>{e.exports=require("tls")},7310:e=>{e.exports=require("url")},3837:e=>{e.exports=require("util")},9796:e=>{e.exports=require("zlib")},1338:(e,r,t)=>{t.r(r),t.d(r,{originalPathname:()=>f,patchFetch:()=>A,requestAsyncStorage:()=>h,routeModule:()=>E,serverHooks:()=>_,staticGenerationAsyncStorage:()=>I});var s={};t.r(s),t.d(s,{POST:()=>g});var o=t(9303),a=t(8716),n=t(670),i=t(7070),p=t(3820),u=t(2188),c=t(6945),l=t(7597),d=t(6669);async function g(e){try{let r=await e.json();if("instagram"===r.object){for(let e of r.entry)if(e.messaging)for(let r of e.messaging)await m(r);return new i.NextResponse("EVENT_RECEIVED",{status:200})}return new i.NextResponse("Not Found",{status:404})}catch(e){return console.error("Webhook Error:",e),new i.NextResponse("Internal Error",{status:500})}}async function m(e){let r=e.sender.id,t=e.recipient.id,s=e.message?.text;if(!s)return;let o=(0,p.hJ)(u.db,"bots"),a=(0,p.IO)(o,(0,p.ar)("instagramBusinessId","==",t)),n=await (0,p.PL)(a);if(n.empty)return;let i=n.docs[0].data();if(!i.isActive)return;let g=(0,d.k)(i,"",void 0,-1);try{let e=(0,c.PD)(),t=(await e.generateContent([{text:g},{text:s}])).response.text();if(!t)return;i.instagramAccessToken&&await (0,l.I)(i.instagramBusinessId,r,t,i.instagramAccessToken)}catch(e){console.error("Gemini Error:",e)}}let E=new o.AppRouteRouteModule({definition:{kind:a.x.APP_ROUTE,page:"/api/instagram/webhook/route",pathname:"/api/instagram/webhook",filename:"route",bundlePath:"app/api/instagram/webhook/route"},resolvedPagePath:"C:\\Users\\Abdulla Alshameeri\\Documents\\GitHub\\Mokai-AI\\app\\api\\instagram\\webhook\\route.ts",nextConfigOutput:"",userland:s}),{requestAsyncStorage:h,staticGenerationAsyncStorage:I,serverHooks:_}=E,f="/api/instagram/webhook/route";function A(){return(0,n.patchFetch)({serverHooks:_,staticGenerationAsyncStorage:I})}},6669:(e,r,t)=>{t.d(r,{k:()=>a});let s=(e=50)=>e<=25?`🎭 الأسلوب (ودّي جداً - خوي):
    - تكلم بعفوية تامة وكأنك صديق للعميل.
    - استخدم عبارات مثل: (من عيوني، ولا يهمك، أبشر بعزك، يا هلا والله).
    - كن مرناً وبسيطاً جداً في الكلام.`:e>=75?`🎭 الأسلوب (رسمي جداً):
    - تكلم باحترافية عالية واحترام بالغ.
    - استخدم عبارات مثل: (حضرتك، طال عمرك، يسعدنا خدمتكم).
    - تجنب الكلمات العامية المفرطة، كن دقيقاً وموجزاً.`:`🎭 الأسلوب (بائع محترف - متوازن):
    - خليط بين الاحترام والود.
    - استخدم (يا غالي، أبشر، تمام).
    - ركز على إتمام البيعة بذكاء وبدون تكلف.`,o=e=>"en"===e?`🌍 **Language Rule:** You MUST reply in ENGLISH ONLY. Even if the user speaks Arabic, reply in professional English.`:"bi"===e?`🌍 **Language Rule:** You are BILINGUAL. 
    - If the user speaks Arabic, reply in Arabic (Khaleeji dialect).
    - If the user speaks English, reply in English.
    - Match the user's language immediately.`:`🌍 **Language Rule:** لغتك الأساسية هي العربية (اللهجة الخليجية البيضاء/السعودية).`,a=(e,r,t,a=-1)=>{let n="";return n=-1===a?`1️⃣ **التحية والتعريف (أول رسالة فقط):**
     - ابدأ بالرسالة الافتتاحية الإجبارية: "حياك الله 👋 أنا المساعد الذكي، اسمي ${e.botName}..".
     - بعدها مباشرة جاوب على استفساره.`:a>48?`1️⃣ **الذاكرة (عودة عميل بعد فترة):**
     - العميل غاب أكثر من 48 ساعة ورجع.
     - رحب به ترحيب "العائد" (يا هلا فيك مرة ثانية، نورتنا..، حياك الله من جديد).
     - 🚫 **ممنوع تعرف بنفسك أبداً**. هو يعرفك. لا تتعامل كأنك غريب.
     - ادخل في الموضوع مباشرة.`:`1️⃣ **السياق (محادثة مستمرة):**
     - 🚫 **ممنوع التحية** (لا تقل هلا، ولا سلام، ولا مرحباً).
     - 🚫 **ممنوع التعريف بنفسك**.
     - اعتبر الرسالة الحالية تكملة للجملة السابقة. جاوب فوراً بدون أي مقدمات.
     - كن عملياً جداً.`,`
أنت "${e.botName}"، المساعد الذكي الخاص بـ (${e.storeName}).
صفتك: ذكي، لماح، محترف.

${o(e.language)}

المصادر الوحيدة لمعلوماتك:
- النشاط: ${e.businessType}
- المنتجات: ${e.products}
- ساعات العمل: ${e.workHours}
- الموقع: ${e.location}
- ملاحظات: ${e.additionalInfo}
- تحديثات فورية من المالك: ${r||"لا يوجد"}
- الذاكرة المكتسبة: ${e.learnedObservations&&e.learnedObservations.length>0?e.learnedObservations.join(" | "):"لا يوجد"}

---

⚡ **قواعد الرد الذكي (البروتوكول الصارم):**
يجب أن يكون ردك دائماً في "رسالة واحدة فقط" ومترابطة.

${n}

2️⃣ **حجم الرد (الذكاء البلاغي):**
   - **قاعدة ذهبية:** الرد على قدر السؤال.
   - إذا سأل سؤال قصير (بكم؟ وينكم؟) -> جاوب بكلمتين وبس. (مثال: "بـ 50 ريال طال عمرك"). لا تسرد قصائد.
   - إذا سأل تفاصيل دقيقة -> جاوب بتفصيل وافي ومرتب.
   - لا تكن جافاً، ولا ثرثاراً. كن "بائع محترف" يعرف قيمة الوقت.

3️⃣ **القرار الذكي (الرد):**
   - **الحالة أ (سؤال واضح):** جاوب مباشرة بناءً على البيانات.
   - **الحالة ب (صورة/غموض):** قل "وصلتني الصورة.. تفضل وش حاب تستفسر عنه؟".

4️⃣ **استراتيجية الإغلاق (Sales Handoff Strategy):**
   - أنت مساعد مبيعات ولست "الكاشير".
   - **الهدف:** إيصال العميل لمرحلة الشراء ثم تسليمه للمالك.
   - **متى تحول العميل؟** إذا شعرت أن العميل جاد (وافق على السعر، قال "تم"، سأل "كيف أدفع"، أو أبدى رغبة مؤكدة للشراء).
   - **كيف تتصرف؟** لا تتصرف من تلقاء نفسك. أقنعه بالانتظار قليلاً.
   - **السيناريو الإجباري:** قل له جملة بمعناها: "اختيار ممتاز! عشان نخدمك ونتمم الطلب بسرعة، بحولك الآن للمالك/المسؤول يكمل معاك الإجراءات حالاً."
   - ثم اختم الرد بـ الرمز: [[REQ_HANDOFF]]
   - هذا الرمز سيطلق جرس عند المالك ليدخل المحادثة.

---

🚫 **ممنوعات:**
- لا تكرر التعريف بنفسك نهائياً بعد المرة الأولى.
- لا تطلب إعادة الإرسال.
- لا تخترع معلومات.

${s(e.toneValue)}

🕵️ **تحليل العميل:**
العميل: ${t?.fullName||"غير معروف"}. طابق أسلوبك معه.

⚙️ **أوامر النظام:**
- سؤال مستحيل؟ رد بـ "[[UNKNOWN_QUERY]]".
- طلب خصم؟ رد بـ "[[REQ_DISCOUNT]]".
- عميل جاهز للشراء؟ رد بـ "[[REQ_HANDOFF]]".
`}},2188:(e,r,t)=>{t.d(r,{db:()=>i});var s=t(9362),o=t(3820);let a={apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY||"AIzaSyCQCT7jSJQYJYBhFIVapgpBQOhenUDs3K4",authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN||"mokai-bot.firebaseapp.com",projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID||"mokai-bot",storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET||"mokai-bot.firebasestorage.app",messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID||"28722487944",appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID||"1:28722487944:web:0183b2afc0ef7d021e753d",measurementId:process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID||"G-MC2P6DLV9N"},n=(0,s.C6)().length?(0,s.Mq)():(0,s.ZF)(a),i=(0,o.ad)(n)},6945:(e,r,t)=>{t.d(r,{PD:()=>a});var s=t(1258);let o=()=>{let e=process.env.GOOGLE_API_KEY||process.env.NEXT_PUBLIC_GOOGLE_API_KEY||process.env.API_KEY;return e||console.warn("Missing GOOGLE_API_KEY environment variable for Gemini."),new s.$D(e||"DUMMY_KEY")},a=()=>o().getGenerativeModel({model:"gemini-2.5-flash"})},7597:(e,r,t)=>{async function s(e,r,t,s){let o=`https://graph.facebook.com/v21.0/${e}/messages`;try{let e=await fetch(o,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify({recipient:{id:r},message:{text:t}})}),a=await e.json();if(a.error)throw console.error("Error sending Instagram message:",a.error),Error(a.error.message);return a}catch(e){throw console.error("Network error sending Instagram message:",e),e}}async function o(e,r,t,s){let o=`https://graph.facebook.com/v21.0/${e}/messages`;try{let e=await fetch(o,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${s}`},body:JSON.stringify({messaging_product:"whatsapp",to:r,text:{body:t}})}),a=await e.json();if(a.error)throw console.error("Error sending WhatsApp message:",a.error),Error(a.error.message);return a}catch(e){throw console.error("Network error sending WhatsApp message:",e),e}}t.d(r,{I:()=>s,U:()=>o})}};var r=require("../../../../webpack-runtime.js");r.C(e);var t=e=>r(r.s=e),s=r.X(0,[948,972,999,258],()=>t(1338));module.exports=s})();