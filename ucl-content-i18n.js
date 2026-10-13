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
    ['Details', '研究の基盤'],
    ['Which candidates are selected from a finite, discrete set, and under what conditions do they remain stable?', '離散的で有限な候補の中から、どの候補が選ばれ、どの条件で安定するのか。'],
    ['UCL is an interdisciplinary research program exploring this question through mathematics and computational experiments. It examines the structures that can be found, the criteria used to choose among competing candidates, and how those choices and structures hold up as conditions change.', 'UCLは、この問いを数学と計算実験で探る、複数の学問分野を横断する学際的な研究プログラムです。どのような構造が見つかるのか。複数の候補から、何を基準に一つを選ぶのか。条件を変えたとき、その選択や構造はどこまで保たれるのか。こうした問いを、数学と計算実験を組み合わせて調べています。'],
    ['Formal verification and reproducible procedures are central to this work. The aim is to make results verifiable by preserving the findings together with their assumptions, inputs, and methods, so that both the reasoning and the calculations can be traced and checked.', '形式検証と再現可能な手順を通じて、結果を確かめられる形にすることを目指しています。得られた結果を、その前提・入力・手順とともに残し、論理の道筋や計算の過程までさかのぼって検証できることを重視しています。'],
    ['Potential applications of this research include materials design, software verification, production and logistics planning, equipment control, resource allocation, and the analysis of biological networks. Across these fields, some problems can be represented in terms of finite, discrete candidates or states, whose properties can be examined under specified constraints and update rules.', 'こうした研究の応用先として、材料設計をはじめ、ソフトウェア検証、生産・物流計画、設備制御、資源配分、生体ネットワークの解析などを視野に入れています。これらの分野には、対象を有限・離散的な候補や状態として表し、制約や更新規則のもとで、その性質を調べられる課題があります。'],
    ['One cross-disciplinary research question is under what conditions fixed points—states that remain unchanged when a specified rule is applied—exist, and what procedures can reach them. By explicitly defining how candidate sets are narrowed or states are updated, and checking the results and the conditions under which they hold, we explore potential applications to search and decision-making.', 'とくに、定めた規則を適用しても変化しない「固定点」が、どのような条件で存在し、どのような手順で到達できるのかは、分野を横断する研究課題の一つです。候補の絞り込みや状態の更新を明確に定義し、その結果や成立条件を検証することで、探索と意思決定への応用可能性を探ります。'],
    ['Our aim is to use this understanding of structure to define the scope of a search and set priorities for verification, supporting decisions about where to allocate limited computing resources, research funding, and personnel.', 'こうした構造の理解を、探索範囲と検証の優先順位を定めることにつなげ、限られた計算資源・研究予算・人材を、どこに配分するかという判断を支えることを目指しています。'],
    ['Six fields form the foundation of the research program.', '研究の基盤にあるのは、次の6つの分野です。'],
    ['Applied and Discrete Mathematics', '応用数学・離散数学'],
    ['Describing structure', '構造を記述する'],
    ['Candidate sets and states are represented mathematically to examine their relationships and properties. This provides a foundation for grouping equivalent structures and identifying forms that satisfy specified conditions.', '候補の集合や状態を数学的に表し、それらの関係や性質を調べます。同じ性質を持つ構造をまとめたり、定められた条件を満たす形を見いだしたりするための基盤です。'],
    ['Optimization and Model Selection', '最適化・モデル選択'],
    ['Defining how to choose', '選ぶ基準を定める'],
    ['Candidates are compared using criteria such as error, complexity, and the available computational budget. The aim is to make the basis for selection explicit and understand how different criteria affect the outcome.', '誤差や複雑さ、使える計算資源などの基準で候補を比較します。何を根拠に選ぶのかを明確にし、基準の違いが結果にどのような影響を与えるかを調べます。'],
    ['Formal Methods and Mathematical Logic', '形式手法・数理論理'],
    ['Checking the reasoning', '論理を確かめる'],
    ['Formal verification checks whether a conclusion follows from stated definitions and assumptions. The program has used Lean4 to verify steps in mathematical proofs by computer. The scope of these checks is the set of definitions and assumptions used in each proof.', '形式検証では、明示された定義や仮定から結論が導かれるかを確かめます。UCLではLean4を用いて、数学的な証明の手順を計算機上で検証してきました。検証が保証する範囲は、それぞれの証明で用いた定義と仮定の内側です。'],
    ['Signal Processing and Pattern Recognition', '信号処理・パターン認識'],
    ['Identifying patterns', 'パターンを見いだす'],
    ['Periodic behavior, spectral components, and discrete patterns in data are analyzed to find regularities. This includes examining how reliably patterns can be identified or recovered when noise is introduced.', 'データに含まれる周期性やスペクトル成分、離散的なパターンを分析し、規則性を探ります。ノイズが加わったときにも、パターンをどの程度正しく識別・復元できるかを調べます。'],
    ['Computational Science and Complex Systems', '計算科学・複雑系研究'],
    ['Exploring changing conditions', '条件の変化を調べる'],
    ['Computational experiments vary conditions to examine structural stability and the boundaries at which outcomes change. The focus is on identifying which conditions preserve a result and where a different outcome emerges.', '計算実験で条件を変えながら、構造の安定性や、結果が変わる境界を調べます。どの条件なら結果が保たれ、どこから異なる結果が現れるのかを明らかにすることに取り組んでいます。'],
    ['Reproducible Research and Scientific Software Engineering', '再現可能研究・科学ソフトウェア工学'],
    ['Making results checkable', '結果を検証できる形に残す'],
    ['Inputs, computational procedures, execution environments, and results are recorded so that runs can be repeated and compared under the same conditions. Control experiments help distinguish what has been observed from the claims those observations can support.', '入力・計算手順・実行環境・結果を記録し、同じ条件での再実行と比較を可能にします。対照実験も行い、実際に観測されたことと、その観測から裏づけられる主張を分けて扱います。'],

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
    ["離散的で有限な候補の中から、どの候補が選ばれ、どの条件で安定するのか。", ["離散的で有限な", "候補の中から、", "どの候補が選ばれ、", "どの条件で安定するのか。"]],
    ["研究の基盤にあるのは、次の6つの分野です。", ["研究の基盤にあるのは、", "次の6つの分野です。"]],
    ["再現可能研究・科学ソフトウェア工学", ["再現可能研究・", "科学ソフトウェア工学"]],
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
        ? screen.dataset.srcJa || './ucl-quotaecho-screen-ja.webp'
        : screen.dataset.srcEn || './ucl-quotaecho-screen-en.webp';
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
