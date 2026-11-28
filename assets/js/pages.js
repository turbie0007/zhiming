import { ARTICLES } from './learn.js?v=20261153';
import { esc, icon } from './ui.js?v=20261153';

export const BRAND = '知命';
export const SITE_NAME = '知命 · 四柱八字排盤';
export const HOME_DESCRIPTION = '知命：一個安靜、完整、無需登錄的四柱八字排盤工具。精確節氣、真太陽時、十神藏干、大運流年，計算全部在本地完成。';
export const OG_IMAGE = 'assets/icons/icon-1024.png';

// Paths that hold only local, user-specific data: they must not appear in a sitemap.
export const NOINDEX_PATHS = ['/records/', '/compare/', '/chart/', '/view/'];

export const articlePath = (id) => `/learn/${id}`;

export const PAGES = [
  {
    path: '/',
    file: 'index.html',
    title: SITE_NAME,
    description: HOME_DESCRIPTION,
    ogType: 'website',
    build: homeMarkup,
    jsonLd: ({ absoluteUrl }) => [
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: BRAND,
        url: absoluteUrl,
        inLanguage: 'zh-Hant',
        description: HOME_DESCRIPTION,
      },
      {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: BRAND,
        url: absoluteUrl,
        applicationCategory: 'ReferenceApplication',
        operatingSystem: 'Any',
        inLanguage: 'zh-Hant',
        description: HOME_DESCRIPTION,
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'TWD' },
      },
    ],
  },
  {
    path: '/learn',
    file: 'learn/index.html',
    title: `${BRAND} · 學堂｜四柱八字基礎`,
    description: '四柱、節氣、十神、神煞、大運流年、五行旺衰與真太陽時：以排盤順序說明你會遇到的術語，附公式依據與流派差異。',
    ogType: 'website',
    build: learnIndexMarkup,
    jsonLd: ({ homeUrl, absoluteUrl, absoluteLink }) => [
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: '學堂',
        url: absoluteUrl,
        inLanguage: 'zh-Hant',
        hasPart: ARTICLES.map((a) => ({
          '@type': 'Article',
          headline: a.title,
          url: absoluteLink(articlePath(a.id)),
        })),
      },
      breadcrumb(homeUrl, [['學堂', absoluteUrl]]),
    ],
  },
  ...ARTICLES.map((article) => ({
    path: articlePath(article.id),
    file: `learn/${article.id}/index.html`,
    title: `${article.title} · ${BRAND}學堂`,
    description: article.summary,
    ogType: 'article',
    article,
    build: (ctx) => articleMarkup(article, ctx),
    jsonLd: ({ homeUrl, absoluteUrl, absoluteLink }) => [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.summary,
        url: absoluteUrl,
        inLanguage: 'zh-Hant',
        isPartOf: { '@type': 'CollectionPage', name: '學堂', url: absoluteLink('/learn') },
      },
      breadcrumb(homeUrl, [['學堂', absoluteLink('/learn')], [article.title, absoluteUrl]]),
    ],
  })),
  {
    path: '/about',
    file: 'about/index.html',
    title: `${BRAND} · 關於`,
    description: '知命是安靜、完整、不需登錄的四柱排盤工具：為什麼重做排盤、資料留在哪裡、曆法與參考文獻的邊界。',
    ogType: 'website',
    build: aboutMarkup,
    jsonLd: ({ homeUrl, absoluteUrl }) => [
      { '@context': 'https://schema.org', '@type': 'AboutPage', name: '關於知命', url: absoluteUrl, inLanguage: 'zh-Hant' },
      breadcrumb(homeUrl, [['關於', absoluteUrl]]),
    ],
  },
  {
    path: '/privacy',
    file: 'privacy/index.html',
    title: `${BRAND} · 隱私政策`,
    description: '知命不設帳號、不把命盤寫進伺服器。說明資料放在哪裡、如何刪除，以及 App 會用到哪些系統權限。',
    ogType: 'website',
    build: privacyMarkup,
    jsonLd: ({ homeUrl, absoluteUrl }) => [
      { '@context': 'https://schema.org', '@type': 'WebPage', name: '隱私政策', url: absoluteUrl, inLanguage: 'zh-Hant' },
      breadcrumb(homeUrl, [['隱私政策', absoluteUrl]]),
    ],
  },
];

function breadcrumb(homeUrl, entries) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: BRAND, item: homeUrl },
      ...entries.map(([name, item], i) => ({ '@type': 'ListItem', position: i + 2, name, item })),
    ],
  };
}

// ---- Shared page shells ----

function pageHead({ kicker, title, lede, note }) {
  return `
      <header class="page-head reveal">
        <p class="eyebrow"><span class="eyebrow-line"></span>${kicker}</p>
        <h1>${title}</h1>
        <p class="page-lede">${lede}</p>
        ${note ? `<p class="privacy-meta">${note}</p>` : ''}
      </header>`;
}

function homeMarkup({ link, today, formHtml }) {
  return `
    <div class="wrap">
      <section class="hero">
        <div class="hero-copy reveal">
          <p class="eyebrow"><span class="eyebrow-line"></span>子平術 · 四柱八字</p>
          <h1 class="hero-title">一紙八字<br><em>見天地</em>與人</h1>
          <p class="hero-lede">以節氣為綱，以干支為目。完整還原年、月、日、時四柱，十神、藏干、大運、流年，一屏可讀。計算全部在本機完成，無需登錄。</p>
          <ul class="hero-points">
            <li><span class="dot"></span>精確到分鐘的節氣邊界</li>
            <li><span class="dot"></span>真太陽時與子時校正</li>
            <li><span class="dot"></span>命例只存在你的瀏覽器裏</li>
          </ul>
          ${today ? `
          <div class="today-strip">
            <div class="today-main">
              <span class="today-label">今日</span>
              <span class="today-date">${today.dateText}</span>
              <span class="today-ganzhi">${today.yearText} · ${today.dayText}</span>
            </div>
            <div class="today-sub">${today.lunarText} · ${today.prevJie ? `${today.prevJie.name}後` : ''}</div>
            <button class="today-btn" type="button" data-action="fill-today">以此日起盤 ${icon('arrowRight', 14)}</button>
          </div>` : ''}
        </div>
        <div class="hero-form reveal" style="--delay: 80ms">
          ${formHtml}
        </div>
      </section>

      <section class="feature-row">
        <article class="feature-card">
          <span class="feature-index">壹</span>
          <h3>節氣為界</h3>
          <p>依據太陽視黃經推算的二十四節氣，覆蓋 1900–2100 年，精確到分鐘。年柱看立春，月柱看節令。</p>
        </article>
        <article class="feature-card">
          <span class="feature-index">貳</span>
          <h3>詳略由心</h3>
          <p>四柱、十神、藏干、星運、納音、神煞、命宮、胎元、大運、流年。可一鍵切換簡盤。</p>
        </article>
        <article class="feature-card">
          <span class="feature-index">叄</span>
          <h3>數據留白</h3>
          <p>不需要帳號。命例保存在本機，可隨時打開、刪除，或生成一枚只含出生信息的分享鏈接。</p>
        </article>
      </section>

      <section class="quiet-note">
        <span class="quiet-mark">觀</span>
        <p>「觀其象，玩其辭。」傳統術數是一套觀察時間與關係的語言。本站呈現推算過程，不作吉凶斷定，也不替代任何現實決策。</p>
        <a href="${link('/learn')}" class="quiet-link">從學堂開始 ${icon('arrowRight', 14)}</a>
      </section>
    </div>`;
}

function learnIndexMarkup({ link }) {
  return `
    <div class="wrap page">
${pageHead({
    kicker: '學堂',
    title: '先把語言學會<br>再談命理',
    lede: '四柱不是四個字，而是一套關於時間、節氣與關係的記號系統。以下短文，按排盤順序解釋你會遇到的術語。',
  })}
      <div class="learn-layout">
        <div class="articles learn-catalog">
          ${ARTICLES.map((a, i) => `
            <article class="article-card reveal" style="--delay:${i * 40}ms">
              <a class="article-card-link" href="${link(articlePath(a.id))}">
                <span class="article-index">${String(i + 1).padStart(2, '0')}</span>
                <span class="article-title-wrap">
                  <span class="article-kicker">${a.kicker}</span>
                  <span class="article-title">${a.title}</span>
                  <span class="article-summary">${a.summary}</span>
                </span>
                <span class="article-chevron">${icon('arrowRight', 18)}</span>
              </a>
            </article>`).join('')}
        </div>
      </div>
    </div>`;
}

function articleMarkup(article, { link }) {
  const index = ARTICLES.findIndex((a) => a.id === article.id);
  const prev = ARTICLES[index - 1];
  const next = ARTICLES[index + 1];
  return `
    <div class="wrap page">
${pageHead({ kicker: `學堂 · ${article.kicker}`, title: article.title, lede: article.summary })}
      <div class="learn-layout">
        <aside class="learn-toc reveal">
          <p class="toc-label">目錄</p>
          ${ARTICLES.map((a, i) => `<a href="${link(articlePath(a.id))}"${a.id === article.id ? ' aria-current="true"' : ''}><span>${String(i + 1).padStart(2, '0')}</span>${a.title}</a>`).join('')}
          <div class="toc-quote">「不執一端，<br>不落宿命。」</div>
        </aside>
        <div class="articles">
          <article class="article prose reveal">
            <div class="article-body prose">${article.body}</div>
            <nav class="article-pager" aria-label="文章導覽">
              ${prev ? `<a href="${link(articlePath(prev.id))}" rel="prev">${icon('arrowLeft', 14)} ${prev.title}</a>` : '<a href="' + link('/learn') + '">學堂目錄</a>'}
              ${next ? `<a href="${link(articlePath(next.id))}" rel="next">${next.title} ${icon('arrowRight', 14)}</a>` : `<a href="${link('/learn')}">學堂目錄</a>`}
            </nav>
          </article>
        </div>
      </div>
    </div>`;
}

function aboutMarkup({ link, root = '/' }) {
  return `
    <div class="wrap page about-page">
${pageHead({
    kicker: '關於',
    title: '知命，而不認命',
    lede: '一個安靜、完整、不需要登錄的四柱排盤工具。把傳統術數所需的信息如實呈現，把判斷留給你。',
  })}

      <section class="about-grid">
        <article class="about-card reveal">
          <span class="about-index">壹</span>
          <h2>為什麼重做排盤</h2>
          <p>舊的排盤頁面常常被表單、廣告和登錄牆切碎。知命只保留三件事：準確的時間換算、清晰的四柱結構、可保存的命例。所有多餘的東西都被拿掉了。</p>
        </article>
        <article class="about-card reveal" style="--delay:60ms">
          <span class="about-index">貳</span>
          <h2>數據與隱私</h2>
          <p>預設沒有帳戶、沒有伺服器寫入：出生資訊只在你的瀏覽器裏計算，命例保存在 localStorage。自選雲端會員（US$20／年）才會在你明確同意後上傳命例備份。分享鏈接會把出生資訊編碼進鏈接本身，點擊前請確認接收方可以查看。</p>
          <a href="${link('/privacy')}" class="card-link">完整隱私政策 ${icon('arrowRight', 14)}</a>
        </article>
        <article class="about-card reveal" style="--delay:120ms">
          <span class="about-index">叄</span>
          <h2>曆法說明</h2>
          <p>年柱以立春為界，月柱以十二節為界。節氣按太陽視黃經推算，覆蓋 1899–2101 年，精確到分鐘。農曆日期覆蓋 1900–2100 年，含閏月。</p>
        </article>
        <article class="about-card reveal" style="--delay:180ms">
          <span class="about-index">肆</span>
          <h2>參考與邊界</h2>
          <p>術語與取象參考《淵海子平》《三命通會》《子平真詮》《窮通寶鑑》等傳統文獻。五行比例、身強身弱與喜用提示是簡化的教學性計算，不是命理斷語。</p>
        </article>
        <article class="about-card reveal" data-reminder-card style="--delay:240ms" hidden>
          <span class="about-index">伍</span>
          <h2>節氣提醒</h2>
          <p>在二十四個節氣交接時提醒一次；逢節令，月柱自此更新。提醒只排在你的裝置上，不經過伺服器。</p>
          <label class="switch-row">
            <input type="checkbox" id="solar-reminder" role="switch">
            <span class="switch-track" aria-hidden="true"></span>
            <span>開啟節氣提醒</span>
          </label>
          <p class="tiny-note" id="solar-reminder-note">節氣交接時提醒一次；可隨時關閉。</p>
        </article>
      </section>

      <section class="about-quote reveal">
        <span class="quote-mark">「</span>
        <p>善易者不卜。真正的傳統，不是把一切交給命盤，而是借它照見自己。</p>
      </section>

      <section class="about-disclaimer reveal">
        <h3>著作權聲明</h3>
        <p>本網站之介面設計、文字內容、圖表與程式碼，著作權均屬知命作者所有，受著作權法保護。未經事前書面同意，不得重製、公開傳輸、改作、散布或為任何商業利用；引用請註明來源，並僅限合理使用範圍。侵權必究。</p>
      </section>

      <section class="about-disclaimer reveal">
        <h3>免責聲明</h3>
        <p>本站內容用於傳統文化研習與信息整理，不構成醫療、法律、投資、婚戀或任何現實決策建議。請勿依據排盤結果作出重大決定。</p>
        <p class="about-tech">純靜態頁面 · 無追蹤 · 本地計算 · <a href="${root}tests.html">排盤回歸測試</a></p>
      </section>
    </div>`;
}

function privacyMarkup({ link, root = '/' }) {
  return `
    <div class="wrap page about-page privacy-page">
${pageHead({
    kicker: '隱私',
    title: '隱私政策',
    lede: '知命預設不設帳號、也不把命盤寫進伺服器；自選雲端會員除外。以下說明資料放在哪裏、如何刪除，以及 App 會用到哪些系統權限。',
    note: '生效日期：2026年11月27日 · 適用於網頁版與 iOS／Android App（雲端會員僅網頁版）',
  })}

      <section class="card privacy-body prose reveal">
        <h2>一、蒐集範圍</h2>
        <p>知命預設沒有帳號系統，也沒有伺服器端資料庫，不蒐集、不上傳、不販售個人資料。App 不含廣告、分析、當機回報或追蹤 SDK；網頁版不載入第三方腳本與字型。唯有你自選開啟雲端會員（見第三節）時，才會蒐集該節所列資料。</p>

        <h2>二、留在裝置上的資料</h2>
        <p>你輸入的姓名（選填）、性別、出生日期與時間、曆法與校正選項，以及命例的標籤、備註、資料夾，會保存在目前裝置的瀏覽器或 App 儲存空間（localStorage）。版面主題、命例排序與最近一次輸入也會一併保存，方便下次開啟。</p>
        <p>這些資料只用於在本機排盤與顯示，不會離開裝置。移除 App、清除網站資料，或在命例頁刪除命例後，資料即不再存在，知命無法代你復原。</p>

        <h2>三、自選雲端會員與同步</h2>
        <p>雲端備份／跨裝置同步為自選付費功能（US$20／年）。只有在你登入並明確開啟「雲端備份」後，知命才會上傳命例；未開啟時一切仍留在本機，本機免費功能不受會員影響。</p>
        <p>開啟後我們會蒐集：帳號 Email（magic link 登入／註冊）、訂閱與付款狀態（由 Stripe 處理，知命不儲存完整卡號）、以及你同意上傳的命例內容（姓名、出生資訊、標籤、備註）。資料存放於 Supabase（資料庫與驗證服務），傳輸全程 TLS。</p>
        <p>你可以隨時關閉同步、登出，或要求刪除雲端命例與帳號。取消訂閱後會員資格於當期結束失效、雲端寫入停止，但你仍可讀取與匯出既有資料。</p>

        <h2>四、分享鏈接與存圖</h2>
        <p>分享鏈接把出生資訊編碼在網址的片段（# 之後）裏，不會送到任何伺服器；你也可以選擇不含姓名的分享方式。收到鏈接的人可以看到鏈接中的出生資訊，請在分享前自行確認。</p>
        <p>命盤圖片、複製文字與列印都在本機完成，不會上傳。使用系統分享面板時，資料的去向由你在面板中選擇。</p>

        <h2>五、通知</h2>
        <p>App 可選擇開啟節氣提醒。提醒由裝置本機排程，內容由本機計算，不經過推播伺服器。你可以隨時在 App 內關閉，或到系統設定撤回通知權限。</p>

        <h2>六、系統權限</h2>
        <p>知命只會在你主動開啟提醒時要求通知權限，其餘時間不使用相機、麥克風、通訊錄、定位或健康資料。分享與存圖交由系統面板處理，不額外申請權限。</p>

        <h2>七、兒童與敏感資料</h2>
        <p>知命是一般性的傳統文化研習工具，不針對兒童設計，也不主動蒐集任何年齡層的資料。命盤屬於你自行輸入的內容，請避免在姓名欄填寫不必要的敏感資訊。</p>

        <h2>八、政策更新</h2>
        <p>若資料處理方式有變，會先更新本頁與生效日期，再隨版本發布。重大變更會在 App 更新說明中提示。</p>

        <h2>九、聯絡方式</h2>
        <p>如對本政策有疑問，可透過 App Store 或 Google Play 商店頁面所列的開發者聯絡方式與我們聯繫。</p>
      </section>

      <section class="about-disclaimer reveal">
        <h3>回到關於</h3>
        <p>知命呈現推算過程，不作吉凶斷定，也不替代任何現實決策。</p>
        <p class="about-tech"><a href="${link('/about')}">關於知命</a> · <a href="${root}tests.html">排盤回歸測試</a></p>
      </section>
    </div>`;
}

export function notFoundMarkup({ link }) {
  return `
    <div class="wrap page">
${pageHead({
    kicker: '404',
    title: '頁面不存在',
    lede: '這個地址沒有對應的頁面，可能是舊鏈接，或輸入有誤。',
  })}
      <p class="quiet-note"><a class="quiet-link" href="${link('/')}">回到首頁 ${icon('arrowRight', 14)}</a></p>
    </div>`;
}
