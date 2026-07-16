// Khóa ngữ pháp vỡ lòng — 11 bài nền tảng cho người Việt chưa biết gì về tiếng Pháp.
// Mục tiêu: đủ khái niệm để các bài tập trong app (chọn giống, ghép câu, đọc) KHÔNG còn là đoán mù.

export interface GrammarExample {
  fr: string;
  vi: string;
  note?: string;
}
export interface GrammarSection {
  heading: string;
  body?: string;
  examples?: GrammarExample[];
}
export interface GrammarLesson {
  id: string;
  title: string;
  icon: string;
  intro: string;
  sections: GrammarSection[];
  tip?: string;
}

export const GRAMMAR_LESSONS: GrammarLesson[] = [
  {
    id: "cau-co-ban",
    title: "Câu cơ bản & đại từ chủ ngữ",
    icon: "🧱",
    intro:
      "Tin tốt: câu tiếng Pháp xếp giống hệt tiếng Việt — Ai + làm gì + cái gì (Chủ ngữ – Động từ – Tân ngữ). Chỉ cần thuộc 8 'nhân vật' đứng đầu câu.",
    sections: [
      {
        heading: "8 đại từ chủ ngữ (thuộc lòng — gặp ở MỌI câu)",
        examples: [
          { fr: "je", vi: "tôi", note: "trước nguyên âm rút thành j' : j'aime" },
          { fr: "tu", vi: "bạn (thân mật)" },
          { fr: "il / elle", vi: "anh ấy / cô ấy (hoặc 'nó' cho đồ vật)" },
          { fr: "on", vi: "người ta / chúng mình (nói miệng, chia như il)" },
          { fr: "nous", vi: "chúng tôi" },
          { fr: "vous", vi: "ông/bà (lịch sự) hoặc các bạn (số nhiều)" },
          { fr: "ils / elles", vi: "họ (elles khi cả nhóm là nữ)" },
        ],
      },
      {
        heading: "Trật tự câu y như tiếng Việt",
        examples: [
          { fr: "Je mange une pomme.", vi: "Tôi ăn một quả táo.", note: "Tôi + ăn + quả táo — không đảo gì cả" },
          { fr: "Elle aime le café.", vi: "Cô ấy thích cà phê." },
          { fr: "Nous regardons la télé.", vi: "Chúng tôi xem TV." },
        ],
      },
    ],
    tip: "Khác biệt lớn nhất với tiếng Việt: động từ Pháp ĐỔI DẠNG theo chủ ngữ (bài 5–6). Tiếng Việt nói 'tôi ăn / họ ăn', Pháp nói 'je mange / ils mangent'.",
  },
  {
    id: "giong-danh-tu",
    title: "Giống của danh từ — un hay une?",
    icon: "⚧",
    intro:
      "MỌI danh từ tiếng Pháp đều có 'giống': đực (masculin) hoặc cái (féminin). Đây là khái niệm tiếng Việt không có — cái bàn là 'cái', quyển sách là 'đực', chẳng theo logic nào. Cách duy nhất: học từ nào nhớ giống từ đó, LUÔN học kèm un/une.",
    sections: [
      {
        heading: "un = một (đực) · une = một (cái)",
        examples: [
          { fr: "un livre", vi: "một quyển sách (đực)" },
          { fr: "une table", vi: "một cái bàn (cái)" },
          { fr: "un café", vi: "một ly cà phê (đực)" },
          { fr: "une école", vi: "một ngôi trường (cái)" },
        ],
      },
      {
        heading: "Mẹo đoán theo ĐUÔI từ (đúng ~80%, vẫn có ngoại lệ)",
        body: "Thường là GIỐNG CÁI khi kết thúc bằng: -e, -tion, -sion, -té, -ure, -ette. Thường là GIỐNG ĐỰC khi kết thúc bằng: -age, -ment, -eau, -isme, -oir, phụ âm.",
        examples: [
          { fr: "la nation, la santé, la voiture", vi: "→ giống cái (đuôi -tion, -té, -ure)" },
          { fr: "le fromage, le gouvernement, le bureau", vi: "→ giống đực (đuôi -age, -ment, -eau)" },
          { fr: "le problème", vi: "→ NGOẠI LỆ: đuôi -e nhưng giống đực" },
        ],
      },
      {
        heading: "Vì sao phải nhớ giống?",
        body: "Giống quyết định gần như mọi thứ đứng quanh danh từ: un/une, le/la, mon/ma, tính từ đuôi -e hay không… Nhớ sai giống = sai dây chuyền cả câu. App luôn đọc và hiển thị danh từ kèm un/une là vì vậy.",
      },
    ],
    tip: "Trong app, câu hỏi 'Chọn giống (un/une)' sẽ bắt đầu xuất hiện sau khi bạn học xong bài này — trả lời bằng trí nhớ + mẹo đuôi từ ở trên.",
  },
  {
    id: "mao-tu-xac-dinh",
    title: "Mạo từ xác định — le, la, les, l'",
    icon: "🎯",
    intro:
      "Tiếng Việt nói 'quyển sách' là xong; tiếng Pháp hầu như KHÔNG cho danh từ đứng trần — phải có 'từ mở đường' phía trước. le/la/les ≈ 'cái/quyển/con… (mà ta đã biết)'.",
    sections: [
      {
        heading: "Bộ tứ le / la / les / l'",
        examples: [
          { fr: "le livre", vi: "quyển sách (đực, số ít)" },
          { fr: "la table", vi: "cái bàn (cái, số ít)" },
          { fr: "les livres, les tables", vi: "những quyển sách / những cái bàn (số nhiều — dùng chung 2 giống)" },
          { fr: "l'école, l'ami", vi: "trước nguyên âm: le/la rút thành l' (bất kể giống)" },
        ],
      },
      {
        heading: "Dùng khi nào?",
        body: "Nói về thứ CỤ THỂ đã biết ('quyển sách đó') hoặc nói CHUNG cả loại ('J'aime le café' = tôi thích cà-phê nói chung). Chưa xác định thì dùng un/une/des (bài 2).",
        examples: [
          { fr: "J'aime le café.", vi: "Tôi thích cà phê (nói chung)." },
          { fr: "Le café de Paul est froid.", vi: "Ly cà phê CỦA PAUL nguội rồi (cụ thể)." },
        ],
      },
    ],
    tip: "Gặp l' thì đừng hoảng: nó chỉ là le/la bị 'nuốt âm' trước nguyên âm — l'école = la école (viết sai) → l'école.",
  },
  {
    id: "so-nhieu",
    title: "Số nhiều — thêm -s nhưng KHÔNG đọc",
    icon: "🔢",
    intro:
      "Số nhiều tiếng Pháp: thêm -s vào cuối danh từ. Cú lừa lớn nhất: chữ -s đó CÂM — 'livre' và 'livres' đọc y hệt nhau. Tai bạn phân biệt số nhiều nhờ từ đứng TRƯỚC: les, des, mes…",
    sections: [
      {
        heading: "Quy tắc + tai nghe",
        examples: [
          { fr: "un livre → des livres", vi: "một quyển sách → những quyển sách", note: "nghe khác nhau ở un/des, không phải ở livre(s)" },
          { fr: "la table → les tables", vi: "cái bàn → những cái bàn", note: "la /la/ ≠ les /lê/" },
          { fr: "un gâteau → des gâteaux", vi: "bánh ngọt: đuôi -eau thêm -x (vẫn câm)" },
        ],
      },
      {
        heading: "des = 'những/vài' (số nhiều không xác định)",
        examples: [
          { fr: "Il y a des livres sur la table.", vi: "Có vài quyển sách trên bàn." },
          { fr: "Elle achète des pommes.", vi: "Cô ấy mua táo (vài quả)." },
        ],
      },
    ],
    tip: "Nghe câu, muốn biết số ít hay số nhiều → tập trung vào MẠO TỪ (le/la ↔ les, un/une ↔ des), đừng chờ nghe -s.",
  },
  {
    id: "etre-avoir",
    title: "Être & avoir — hai động từ xương sống",
    icon: "🦴",
    intro:
      "'être' (là/ở) và 'avoir' (có) là 2 động từ xuất hiện nhiều nhất tiếng Pháp, chia hoàn toàn bất quy tắc — thuộc lòng bảng dưới là bạn đọc hiểu được nửa số câu A1.",
    sections: [
      {
        heading: "ÊTRE — là, thì, ở",
        examples: [
          { fr: "je suis", vi: "tôi là" },
          { fr: "tu es · il est", vi: "bạn là · anh ấy là" },
          { fr: "nous sommes · vous êtes · ils sont", vi: "chúng tôi là · ông/bà là · họ là" },
          { fr: "Je suis vietnamien. Elle est à Paris.", vi: "Tôi là người Việt. Cô ấy đang ở Paris." },
        ],
      },
      {
        heading: "AVOIR — có",
        examples: [
          { fr: "j'ai", vi: "tôi có" },
          { fr: "tu as · il a", vi: "bạn có · anh ấy có" },
          { fr: "nous avons · vous avez · ils ont", vi: "chúng tôi có · ông/bà có · họ có" },
          { fr: "J'ai un chat. Il a 20 ans.", vi: "Tôi có một con mèo. Anh ấy 20 tuổi.", note: "tuổi dùng AVOIR: 'có 20 năm', không dùng être!" },
        ],
      },
    ],
    tip: "Bẫy kinh điển: nói tuổi bằng avoir (J'ai 25 ans), đói/khát/nóng cũng avoir: J'ai faim = tôi đói (nghĩa đen 'tôi có cơn đói').",
  },
  {
    id: "dong-tu-er",
    title: "Động từ nhóm -er ở hiện tại",
    icon: "⚙️",
    intro:
      "~90% động từ Pháp kết thúc bằng -er (parler, aimer, manger…) và chia theo MỘT khuôn duy nhất. Học khuôn này một lần, dùng cho hàng nghìn động từ.",
    sections: [
      {
        heading: "Khuôn: bỏ -er, thêm đuôi",
        body: "parler (nói) → parl- + đuôi. Chú ý: 4/6 dạng (je, tu, il, ils) ĐỌC GIỐNG HỆT NHAU dù viết khác — đuôi -e, -es, -ent đều câm.",
        examples: [
          { fr: "je parle · tu parles · il parle", vi: "tôi/bạn/anh ấy nói — đọc y hệt nhau: /parl/" },
          { fr: "nous parlons", vi: "chúng tôi nói — /parlông/" },
          { fr: "vous parlez", vi: "ông/bà nói — /parlê/" },
          { fr: "ils parlent", vi: "họ nói — vẫn đọc /parl/ (-ent câm!)" },
        ],
      },
      {
        heading: "Áp khuôn cho từ khác",
        examples: [
          { fr: "aimer → j'aime, nous aimons", vi: "thích/yêu" },
          { fr: "regarder → je regarde, vous regardez", vi: "xem/nhìn" },
          { fr: "habiter → j'habite à Hanoï", vi: "sống ở — tôi sống ở Hà Nội" },
        ],
      },
    ],
    tip: "Nghe không phân biệt được il parle / ils parlent? Bình thường — người Pháp cũng dựa vào ngữ cảnh và liaison. Đuôi -ent của động từ KHÔNG BAO GIỜ đọc.",
  },
  {
    id: "phu-dinh",
    title: "Phủ định — ne … pas kẹp động từ",
    icon: "🚫",
    intro:
      "Tiếng Việt thêm 'không' trước động từ; tiếng Pháp dùng HAI mảnh 'ne … pas' kẹp động từ vào giữa như bánh mì kẹp.",
    sections: [
      {
        heading: "Công thức: chủ ngữ + ne + động từ + pas",
        examples: [
          { fr: "Je ne parle pas.", vi: "Tôi không nói." },
          { fr: "Il n'aime pas le café.", vi: "Anh ấy không thích cà phê.", note: "ne → n' trước nguyên âm" },
          { fr: "Nous ne sommes pas à Paris.", vi: "Chúng tôi không ở Paris." },
        ],
      },
      {
        heading: "Nói miệng: 'ne' thường bị nuốt",
        body: "Người Pháp nói nhanh hay bỏ 'ne', chỉ giữ 'pas': « Je parle pas ». Bạn cần NHẬN RA khi nghe, nhưng khi viết/làm bài thì luôn đủ ne…pas.",
        examples: [{ fr: "J'sais pas. (= Je ne sais pas.)", vi: "Tôi không biết. (văn nói)" }],
      },
    ],
    tip: "Gặp bài ghép câu có phủ định: ne đứng NGAY SAU chủ ngữ, pas đứng NGAY SAU động từ. « Je ne mange pas de pomme. »",
  },
  {
    id: "cau-hoi",
    title: "Đặt câu hỏi — 3 cách từ dễ đến trang trọng",
    icon: "❓",
    intro:
      "Tiếng Pháp có 3 cách hỏi cùng một điều, khác nhau ở mức trang trọng. Người mới chỉ cần dùng thạo 2 cách đầu.",
    sections: [
      {
        heading: "Cách 1 — lên giọng cuối câu (văn nói, dễ nhất)",
        examples: [{ fr: "Tu parles français ?", vi: "Bạn nói tiếng Pháp à? — câu thường + lên giọng ↗" }],
      },
      {
        heading: "Cách 2 — Est-ce que + câu thường (an toàn mọi tình huống)",
        examples: [
          { fr: "Est-ce que tu parles français ?", vi: "Bạn có nói tiếng Pháp không?", note: "est-ce que đọc liền /étx-cơ/" },
          { fr: "Qu'est-ce que tu manges ?", vi: "Bạn ăn gì vậy? (que + est-ce que)" },
        ],
      },
      {
        heading: "Cách 3 — đảo chủ ngữ (trang trọng, nhận diện là đủ)",
        examples: [{ fr: "Parlez-vous français ?", vi: "Ngài có nói tiếng Pháp không? — động từ đảo lên trước" }],
      },
      {
        heading: "Từ để hỏi hay gặp",
        examples: [
          { fr: "où · quand · qui", vi: "ở đâu · khi nào · ai" },
          { fr: "quoi/que · pourquoi · comment · combien", vi: "gì · tại sao · thế nào · bao nhiêu" },
        ],
      },
    ],
  },
  {
    id: "tinh-tu",
    title: "Tính từ — đứng SAU danh từ & hợp giống",
    icon: "🎨",
    intro:
      "Hai khác biệt với tiếng Việt: (1) tính từ Pháp thường đứng SAU danh từ giống tiếng Việt ('áo đỏ' = 'chemise rouge' — may quá!), nhưng một nhóm nhỏ đứng TRƯỚC; (2) tính từ phải ĐỔI DẠNG theo giống và số của danh từ.",
    sections: [
      {
        heading: "Hợp giống: thêm -e cho giống cái, -s cho số nhiều",
        examples: [
          { fr: "un petit chat → une petite table", vi: "con mèo nhỏ → cái bàn nhỏ", note: "petit → petite: chữ t cuối ĐỌC LÊN khi thêm -e" },
          { fr: "un livre vert → des livres verts", vi: "sách xanh → những quyển sách xanh (-s câm)" },
        ],
      },
      {
        heading: "Nhóm nhỏ đứng TRƯỚC danh từ (thuộc dần)",
        body: "grand/petit (to/nhỏ), bon/mauvais (tốt/tệ), beau/joli (đẹp), jeune/vieux (trẻ/già), nouveau (mới)…",
        examples: [
          { fr: "une petite maison", vi: "một ngôi nhà nhỏ (petit đứng trước)" },
          { fr: "une maison rouge", vi: "một ngôi nhà đỏ (màu sắc luôn đứng sau)" },
        ],
      },
    ],
    tip: "Khi ghép câu: thấy tính từ chỉ màu sắc/hình dáng/quốc tịch → đặt SAU danh từ; thấy grand, petit, bon, beau… → đặt TRƯỚC.",
  },
  {
    id: "so-huu",
    title: "Sở hữu — mon/ma/mes (của tôi)",
    icon: "🤲",
    intro:
      "'Của tôi' tiếng Pháp có 3 dạng mon/ma/mes — chọn dạng nào tuỳ GIỐNG VÀ SỐ của vật sở hữu (không phải của người sở hữu!).",
    sections: [
      {
        heading: "Bảng sở hữu cơ bản",
        examples: [
          { fr: "mon livre · ma table · mes amis", vi: "sách của tôi (đực) · bàn của tôi (cái) · các bạn của tôi (nhiều)" },
          { fr: "ton / ta / tes", vi: "của bạn" },
          { fr: "son / sa / ses", vi: "của anh ấy HOẶC cô ấy", note: "sa voiture = xe của anh ấy/cô ấy — theo giống của XE, không theo người!" },
          { fr: "notre / votre / leur (+s)", vi: "của chúng tôi / của ông bà / của họ (chung 2 giống)" },
        ],
      },
      {
        heading: "Ngoại lệ dễ vấp",
        examples: [
          { fr: "mon école", vi: "trường của tôi — école giống CÁI nhưng dùng MON", note: "trước nguyên âm luôn dùng mon/ton/son cho dễ đọc" },
        ],
      },
    ],
    tip: "Khác tiếng Việt nhất là son/sa: 'sa mère' có thể là 'mẹ anh ấy' hay 'mẹ cô ấy' — phải nhìn ngữ cảnh.",
  },
  {
    id: "gioi-tu-di-lai",
    title: "Giới từ hay gặp — à, de, en, chez",
    icon: "🧭",
    intro:
      "Bốn giới từ nhỏ nhưng dày đặc trong mọi câu A1. Nắm nghĩa lõi của chúng là các câu đọc bỗng 'sáng' ra.",
    sections: [
      {
        heading: "à = ở/đến/vào lúc · de = của/từ",
        examples: [
          { fr: "Je suis à Paris. Je vais à l'école.", vi: "Tôi ở Paris. Tôi đến trường." },
          { fr: "le livre de Marie", vi: "quyển sách CỦA Marie" },
          { fr: "Il vient de Hanoï.", vi: "Anh ấy đến TỪ Hà Nội." },
          { fr: "à + le → au · de + le → du", vi: "au café (đến quán cà phê) · le prix du livre (giá của quyển sách)", note: "bắt buộc rút gọn, không viết 'à le'" },
        ],
      },
      {
        heading: "en = ở/bằng (nước, tháng, chất liệu) · chez = ở nhà/chỗ của ai",
        examples: [
          { fr: "en France · en janvier · en bus", vi: "ở Pháp · vào tháng Giêng · bằng xe buýt" },
          { fr: "Je suis chez moi. On mange chez Paul.", vi: "Tôi đang ở nhà. Bọn mình ăn ở nhà Paul." },
        ],
      },
    ],
    tip: "Thấy 'au' hay 'du' trong câu? Đó là à+le và de+le bị ép dính — tách ra là hiểu ngay.",
  },
];
