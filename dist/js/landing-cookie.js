const u="monefyi_cookie_consent";function f(e){if(!e)return null;try{const n=JSON.parse(e);return n?.v!==1?null:n.choice==="accepted"||n.choice==="rejected"?n.choice:null}catch{return e==="accepted"||e==="rejected"?e:null}}function k(e){return JSON.stringify({v:1,choice:e,at:new Date().toISOString()})}function d(e){return e==="accepted"}function l(e){if(!e)return null;try{return f(e.getItem(u))}catch{return null}}function _(e,n){if(e)try{e.setItem(u,k(n))}catch{}}const p="1530674178146899";function s(e=p){typeof window>"u"||window.fbq||((function(n,c,o,i,t,a,r){n.fbq||(t=n.fbq=function(){t.callMethod?t.callMethod.apply(t,arguments):t.queue.push(arguments)},n._fbq||(n._fbq=t),t.push=t,t.loaded=!0,t.version="2.0",t.queue=[],a=c.createElement(o),a.async=!0,a.src=i,r=c.getElementsByTagName(o)[0],r.parentNode.insertBefore(a,r))})(window,document,"script","https://connect.facebook.net/en_US/fbevents.js"),window.fbq("init",e),window.fbq("track","PageView"))}function m(e={}){if(typeof document>"u")return;const n=window.localStorage,c=l(n);if(c){d(c)&&(s(),e.onAccept?.());return}if(document.getElementById("monefyi-cookie-consent"))return;const o=document.createElement("div");o.id="monefyi-cookie-consent",o.className="cookie-consent",o.innerHTML=`
    <div class="cookie-consent__inner">
      <p class="cookie-consent__text">
        Kami memakai cookie/analytics (Meta Pixel) untuk mengukur iklan & konversi.
        <a href="/privacy.html" class="cookie-consent__link">Kebijakan Privasi</a>
      </p>
      <div class="cookie-consent__actions">
        <button type="button" class="cookie-consent__btn cookie-consent__btn--ghost" data-cookie-reject>Hanya esensial</button>
        <button type="button" class="cookie-consent__btn cookie-consent__btn--primary" data-cookie-accept>Terima analytics</button>
      </div>
    </div>
  `;const i=t=>{_(n,t),o.remove(),t==="accepted"&&(s(),e.onAccept?.())};o.querySelector("[data-cookie-accept]")?.addEventListener("click",()=>i("accepted")),o.querySelector("[data-cookie-reject]")?.addEventListener("click",()=>i("rejected")),document.body.appendChild(o)}typeof window<"u"&&(window.MonefyiCookieConsent={loadMetaPixel:s,mountCookieConsentBanner:m,hasAnalyticsConsent:()=>d(l(window.localStorage))});
