(() => {
  'use strict';

  // Translate individual text nodes so that dates, links, icons, and semantic
  // markup survive language changes. The English DOM remains the source copy.
  const japanese = new Map([
    ['News', 'ニュース'],
    ['Scroll to news', 'ニュースへスクロール'],
    ['October 12, 2026', '2026年10月12日'],
    ['QuotaEcho 1.1 update released', 'QuotaEcho 1.1 アップデート'],
    ['We’ve improved usage-limit refresh handling and data availability indicators.', '利用枠の更新への追従と、取得状況の表示を改善しました。'],
    ['QuotaEcho released on the Mac App Store', 'QuotaEchoをリリースしました'],
    ['A macOS menu bar app for understanding your Codex usage pace.', 'Codexの利用ペースを把握できる、macOSメニューバーアプリです。'],
    ['Universion Closure Logic established', '株式会社Universion Closure Logicを設立しました'],
    ['Summary', '概要'],

    ['Turning scientific ideas into useful technology.', '科学の発想を、役立つ技術へ。'],
    ['Universion Closure Logic is a technology company rooted in scientific inquiry. We bring together information theory, artificial intelligence, data science, and communication technologies to develop software, algorithms, and digital products.', 'Universion Closure Logicは、科学的な探究を原点とするテクノロジー企業です。情報理論、人工知能、データサイエンス、通信技術を組み合わせ、ソフトウェアやアルゴリズム、デジタル製品の開発に取り組んでいます。'],
    ['At its core is a research perspective: organizing complex problems in terms of candidates, conditions, and rules to consider what to select and where to begin verification. We see potential for research on finite, discrete candidates and states to contribute to fields such as materials design, software verification, production and logistics planning, equipment control, and biological network analysis.', 'その根底にあるのは、複雑な課題を候補・条件・規則として整理し、何を選び、どこから確かめるべきかを考える研究の視点です。有限・離散的な候補や状態を扱う研究を、材料設計、ソフトウェア検証、生産・物流計画、設備制御、生体ネットワークの解析など、さまざまな分野へつなげることを視野に入れています。'],
    ['By clarifying the scope of a search and priorities for verification, our aim is to support decisions about where to allocate limited computing resources, time, and funding, and to bring these research insights into practical use as tools and experiences for people and organizations.', '探索の範囲や検証の優先順位を明確にし、限られた計算資源・時間・予算をどこに配分するかという判断を支える。そうした研究の知見を実用化へとつなぎ、人や組織が使える道具や体験として届けることを目指しています。'],
    ['Company facts', '会社の基本情報'],
    ['Company name', '会社名'],
    ['UNIVERSION CLOSURE LOGIC, K.K.', '株式会社Universion Closure Logic'],
    ['President', '代表者'],
    ['Business domain', '事業内容'],
    ['Research, development and social implementation in information theory, artificial intelligence, data science and communication technologies.', '情報理論、人工知能、データサイエンスおよび通信技術に関する研究、開発ならびに社会実装。'],
    ['Planning, development, sales, maintenance and technical provision of software, algorithms and related products that utilize research results.', '研究成果を活用したソフトウェア、アルゴリズムおよび関連製品の企画、開発、販売、保守ならびに技術提供。'],
    ['Acquisition, management, operation, transfer and licensing of patents, copyrights and other intellectual property rights.', '特許権、著作権その他の知的財産権の取得、管理、運用、譲渡および使用許諾。'],
    ['Joint research, technical alliances and consulting with companies, universities and research institutes.', '企業、大学および研究機関との共同研究、技術提携ならびにコンサルティング。'],
    ['Human resource development, education, training and outreach activities related to technology.', '技術に関する人材育成、教育、研修および普及啓発活動。'],
    ['Acquisition and holding of shares in subsidiaries and affiliated companies for investment and management purposes.', '投資および経営管理を目的とする、子会社および関連会社の株式の取得ならびに保有。'],
    ['All other businesses incidental or related to the foregoing.', '前各号に付帯または関連する一切の事業。'],
    ['Established', '設立'],
    ['November 25, 2025', '2025年11月25日'],
    ['Principal bank', '主要取引銀行'],
    ['Sumitomo Mitsui Banking Corporation', '三井住友銀行'],

    ['Products', '製品'],
    ['Services', 'サービス'],
    ['Products and services', '製品とサービス'],
    ['Explore products and services', '製品・サービスを見る'],
    ['On this page', 'このページ内の移動'],
    ['Released', '公開日'],
    ['October 1, 2026', '2026年10月1日'],
    ['B2C · macOS', '個人向け · macOS'],
    ['B2C · App', '個人向け · アプリ'],
    ['B2B · Materials research', '法人向け · 材料研究'],
    ['In development', '開発中'],
    ['Research prototype', '研究用プロトタイプ'],
    ['A clearer view of your Codex usage.', 'Codexの利用状況を、もっとわかりやすく。'],
    ['A macOS menu bar app for understanding your Codex usage pace. Compare remaining allowance with time to reset, and revisit the tasks and model settings active during periods of larger usage changes.', 'Codexの利用ペースを把握するための、macOSメニューバーアプリです。利用枠の残量とリセットまでの時間を見比べ、利用量の変化が大きかった時間帯に実行していたタスクや、モデル設定を振り返ることができます。'],
    ['Visit product website', '製品サイトを見る'],
    ['QuotaEcho app and sample usage screen', 'QuotaEchoのアプリアイコンと利用状況のサンプル画面'],
    ['QuotaEcho sample screen comparing time left, amount left, and the gap between them.', '時間の残り、利用枠の残り、その差を見比べるQuotaEchoのサンプル画面。'],
    ['Discover your taste. Explore other perspectives.', '自分の好みを知る。誰かの感性に出会う。'],
    ['A visual discovery app built around choosing between two images. Explore what draws you in, see how your preferences compare with others, and discover how people respond to your own images.', '2枚の画像から選ぶことを通じて、自分の好みを探るアプリです。何に惹かれるのか、他の人とはどこが似ていて、どこが違うのか。自分が投稿した画像への反応も、新しい発見につながります。'],
    ['SenseGap image choices', 'SenseGapで見比べる2枚の画像'],
    ['A neon-lit city on a rainy evening.', '雨の夜、ネオンに照らされた街。'],
    ['A quiet turquoise lake surrounded by mountains.', '山々に囲まれた、静かな青緑色の湖。'],
    ['A research prototype for screening material candidates and reviewing those outside standard selection rules. It is designed to make selection criteria and decisions traceable, and to organize candidates for further computational or experimental evaluation.', '材料候補の選別と、標準の選定ルールに当てはまらない候補の再評価を扱う、研究用プロトタイプです。選定基準や判断の経緯を追跡できる形で残し、その後の計算評価や実験に進める候補を整理することを目指しています。'],
    ['Practical technology for your everyday work.', '日々の仕事に、使える技術を。'],
    ['We help businesses simplify everyday work, build practical digital tools, and turn scattered information into usable data.', '日々の業務をシンプルにすること。実務に役立つデジタルツールをつくること。散らばった情報を使えるデータに整えること。事業に合わせて、必要なところからお手伝いします。'],
    ['Workflow & AI Automation', '業務・AI自動化支援'],
    ['Reduce repetitive work with workflows tailored to your business. We connect existing tools, automate routine tasks, and incorporate AI where it adds value.', '業務に合った仕組みで、繰り返し作業を減らします。既存のツールをつなぎ、定型作業を自動化し、効果が見込める部分にはAIを取り入れます。'],
    ['File processing · Tool integrations · Report generation · Content scheduling', 'ファイル処理・ツール連携・レポート生成・コンテンツ配信予約'],
    ['Web & App Development', 'Web・アプリ開発'],
    ['We create and improve websites, dashboards, and lightweight applications around your needs—from a service website to a practical tool for everyday operations.', 'Webサイト、ダッシュボード、小規模なアプリケーションを、目的に合わせて制作・改善します。サービスを伝えるサイトから日々の業務で使うツールまで、必要な形を一緒に考えます。'],
    ['Business websites · Internal tools · Dashboards · App improvements', '企業・サービスサイト・社内ツール・ダッシュボード・アプリ改善'],
    ['Data Processing & Research', 'データ処理・調査支援'],
    ['Turn files and public information into organized, usable data. We support web research, data entry, format conversion, cleanup, and reporting, with checks against agreed requirements.', 'ファイルや公開情報を、整理された使いやすいデータに整えます。Web調査、データ入力、形式変換、データ整理、レポート作成を、事前に合意した要件に沿って確認しながら進めます。'],
    ['Research lists · Spreadsheet cleanup · Data consolidation · Reports', '調査リスト・表計算データの整理・データ統合・レポート'],
    ['Every project starts with a clear scope, defined deliverables, and agreed checks.', 'どのご依頼も、作業範囲・成果物・確認基準を明確にすることから始めます。'],
    ['Tell us what you want to improve.', '改善したいことを、お聞かせください。'],
    ['We’ll help define a practical way forward.', '実現に向けた進め方を、一緒に考えます。'],
    ['Contact Us', 'お問い合わせ'],
    ['Contact us', 'ご相談はこちら'],
    ['Talk to us', '相談する']
  ]);

  // Editorial wrap opportunities for short Japanese copy only.
  // The original text nodes are restored before each language render.
  const japanesePhrases = new Map([
    ["Codexの利用状況を、もっとわかりやすく。", ["Codexの利用状況を、", "もっとわかりやすく。"]],
    ["自分の好みを知る。誰かの感性に出会う。", ["自分の好みを知る。", "誰かの感性に出会う。"]],
    ["科学の発想を、役立つ技術へ。", ["科学の発想を、", "役立つ技術へ。"]],
    ["日々の仕事に、使える技術を。", ["日々の仕事に、", "使える技術を。"]],
    ["改善したいことを、お聞かせください。", ["改善したいことを、", "お聞かせください。"]],
    ["QuotaEcho 1.1 アップデート", ["QuotaEcho 1.1 ", "アップデート"]],
    ["QuotaEchoをリリースしました", ["QuotaEchoを", "リリースしました"]],
    ["株式会社Universion Closure Logicを設立しました", ["株式会社Universion ", "Closure Logicを", "設立しました"]],
    ["ファイル処理・ツール連携・レポート生成・コンテンツ配信予約", ["ファイル処理・", "ツール連携・", "レポート生成・", "コンテンツ配信予約"]],
    ["企業・サービスサイト・社内ツール・ダッシュボード・アプリ改善", ["企業・サービスサイト・", "社内ツール・", "ダッシュボード・", "アプリ改善"]],
    ["調査リスト・表計算データの整理・データ統合・レポート", ["調査リスト・", "表計算データの整理・", "データ統合・", "レポート"]],
  ]);
  const phraseWrappers = new Map();

  const textRecords = new Map();
  const attributeRecords = new Map();

  function captureArticle(article) {
    const walker = document.createTreeWalker(article, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (textRecords.has(node) || !node.nodeValue.trim()) continue;
      const original = node.nodeValue;
      const key = original.trim();
      const translated = node.parentElement.getAttribute('data-content-ja') || japanese.get(key);
      if (translated !== undefined) {
        const leading = original.match(/^\s*/)[0];
        const trailing = original.match(/\s*$/)[0];
        textRecords.set(node, { en: original, ja: leading + translated + trailing });
      }
    }
    for (const element of article.querySelectorAll('[aria-label], [alt], [title]')) {
      let records = attributeRecords.get(element);
      if (!records) {
        records = new Map();
        attributeRecords.set(element, records);
      }
      for (const attribute of ['aria-label', 'alt', 'title']) {
        if (records.has(attribute)) continue;
        const original = element.getAttribute(attribute);
        if (original && japanese.has(original)) {
          records.set(attribute, { en: original, ja: japanese.get(original) });
        }
      }
    }
  }

  window.renderUclContent = function renderUclContent(language) {
    const locale = language === 'ja' ? 'ja' : 'en';
    for (const [node, wrapper] of phraseWrappers) wrapper.replaceWith(node);
    phraseWrappers.clear();
    const articles = document.querySelectorAll('.research-content, .home-view');
    for (const article of articles) {
      captureArticle(article);
      article.lang = locale;
    }
    for (const [node, copies] of textRecords) node.nodeValue = copies[locale];
    for (const [element, records] of attributeRecords) {
      for (const [attribute, copies] of records) element.setAttribute(attribute, copies[locale]);
    }
    if (locale === 'ja') {
      for (const [node, copies] of textRecords) {
        const phrases = japanesePhrases.get(copies.ja.trim());
        if (!phrases || !node.parentNode) continue;
        const wrapper = document.createElement('span');
        wrapper.dataset.jaPhrases = '';
        for (const phrase of phrases) {
          const part = document.createElement('span');
          part.className = 'ja-phrase';
          part.textContent = phrase;
          wrapper.append(part);
        }
        node.replaceWith(wrapper);
        phraseWrappers.set(node, wrapper);
      }
    }
    const companySecondary = document.querySelector('[data-company-secondary]');
    if (companySecondary) companySecondary.lang = locale === 'ja' ? 'en' : 'ja';

    for (const productLink of document.querySelectorAll('.products-content .portfolio-link[href*="/apple/quotaecho/"], [data-quotaecho-link]')) {
      productLink.href = locale === 'ja'
        ? 'https://universion-closure-logic.com/apple/quotaecho/'
        : 'https://universion-closure-logic.com/apple/quotaecho/en/';
      productLink.hreflang = locale;
    }

    // Actual localized app imagery accompanies the localized body copy.
    const screen = document.querySelector('.quotaecho-app-screen');
    if (screen) {
      const source = locale === 'ja'
        ? screen.dataset.srcJa || '/ucl-quotaecho-screen-ja.webp'
        : screen.dataset.srcEn || '/ucl-quotaecho-screen-en.webp';
      if (screen.getAttribute('src') !== source) screen.setAttribute('src', source);
      if (screen.dataset.srcsetJa || screen.dataset.srcsetEn) {
        const sourceSet = locale === 'ja' ? screen.dataset.srcsetJa : screen.dataset.srcsetEn;
        if (sourceSet) screen.setAttribute('srcset', sourceSet);
        else screen.removeAttribute('srcset');
      }
    }
    return locale;
  };
})();
