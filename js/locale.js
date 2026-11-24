(() => {
    const key = 'vibecreai.language';
    const korean = {
        'Language': '언어 선택', 'Video Arcade': '전자오락실', '25 CENTS': '100원', 'COIN EXCHANGE': '동전 교환',
        '3D Arcade': '3D 오락실', 'VibeCreAI Arcade': 'VibeCreAI 오락실',
        'VibeCreAI - Vibe coding + Creative + AI': 'VibeCreAI · 바이브 코딩과 AI로 만드는 게임과 앱',
        'Loading the arcade': '오락실을 여는 중', 'Starting the display': '화면을 켜는 중',
        'Loading Samson’s desk': '샘슨의 작업대를 불러오는 중', 'Powering on the arcade': '오락기에 전원을 넣는 중',
        'Samson’s desk is ready': '샘슨의 작업대 준비 완료', 'Arcade loading progress': '오락실 로딩 진행률',
        'Open 2D homepage ↗': '2D 홈페이지 열기 ↗', 'Open the homepage': '홈페이지 열기',
        'Explore the VibeCreAI homepage': 'VibeCreAI 홈페이지 둘러보기',
        'Return to Samson’s desk': '샘슨의 작업대로 돌아가기', 'Samson’s desk': '샘슨의 작업대',
        'Station select': '스테이션 선택', 'Arcade sound': '오락실 소리',
        'Arcade settings': '오락실 설정', 'Sound': '소리', 'Off': '꺼짐', 'On': '켜짐',
        'Station navigation': '스테이션 이동', 'Previous station': '이전 스테이션', 'Next station': '다음 스테이션',
        'Choose a station': '스테이션 선택', 'Choose a station (M)': '스테이션 선택 (M)',
        'Close station select': '스테이션 선택 닫기', 'Travel to a station': '스테이션으로 이동',
        'Featured social channels': '주요 소셜 채널', 'All social and contact links': '모든 소셜 채널과 연락처',
        'Station content': '스테이션 소개', '← Back to the floor': '← 오락실로 돌아가기',
        'Meet the Developer': '개발자 소개', 'Astrocade': '아스트로케이드',
        'Chroma Award': '크로마 어워즈', 'Bonus Stage': '보너스 스테이지',
        'Station': '스테이션', 'Running to': '달려가는 중', 'Walking to': '걸어가는 중', 'the desk': '작업대',
        'Walking back': '돌아가는 중', 'On the arcade floor': '오락실 탐방 중', 'Leaving the desk': '자리에서 일어나는 중',
        'Next': '다음', 'Back to the desk': '작업대로 돌아가기', 'Return to the desk': '작업대로 돌아가기',
        'SAMSON': '샘슨', 'AI COLLAB': 'AI와 협업', 'CHROMA AWARDS': '크로마 어워즈',
        'HOLLOW STRIDER': '할로우 스트라이더', 'Vibe Survivor': '바이브 서바이버', 'VIBE SURVIVOR': '바이브 서바이버',
        'Spin2Pick': '스핀투픽', 'SPIN2PICK': '스핀투픽', 'VibeTube': '바이브튜브', 'VIBETUBE': '바이브튜브',
        'ECO Guardian': '에코 가디언', 'FLY FOR BRAINROT': '플라이 포 브레인롯', 'Fly for Brainrots': '플라이 포 브레인롯',
        'Slash a Brainrot': '슬래시 어 브레인롯', 'Kaiju vs. MK: City Rampage': '카이주 vs. MK: 도시 대난동',
        'CITY RAMPAGE': '도시 대난동', 'Circle Traffic': '서클 트래픽', 'CIRCLE TRAFFIC': '서클 트래픽',
        'Superheroes vs. Brainrots': '슈퍼히어로 vs. 브레인롯', 'Hero Link: Zombie City': '히어로 링크: 좀비 시티',
        'Forge Beyond': '포지 비욘드', 'Sword Merger Defense': '소드 머저 디펜스',
        "Who's The Killer?": '범인은 누구?', 'Neon Circle Traffic': '네온 서클 트래픽',
        '1ST PLACE': '1위', 'FIGHTING & SHOOTER': '격투 · 슈팅', 'SEASON 1  /  2025': '시즌 1  /  2025',
        'VIBE CODING': '바이브 코딩', 'CREATIVE': '창작',
        'HOME': '홈', 'ABOUT': '소개', 'APPS': '작품', 'CONTACT': '연락처', 'Menu': '메뉴',
        'MEET THE CREATOR': '개발자 소개', 'SOLO DEVELOPER': '1인 개발자', 'AI COLLABORATION': 'AI와 함께 만들기',
        'FUN FIRST': '재미가 먼저', 'MY AI CREATIONS': 'AI로 만든 작품',
        'How a complete coding beginner is building the future with AI': '코딩을 처음 시작한 제가 AI와 함께 게임을 만들게 된 이야기예요.',
        "From zero code to real apps - here's what I've built with AI!": '코딩 초보였던 제가 AI와 함께 만든 게임과 앱을 만나 보세요!',
        'My Astrocade games': '나의 아스트로케이드 게임', 'total plays across my games': '내 게임 전체 누적 플레이',
        'Explore my arcade': '내 오락실 둘러보기', 'Preview profile': '프로필 미리보기',
        'Top 10 by plays': '가장 많이 플레이한 게임 10선', 'Showing saved play counts.': '마지막으로 확인한 플레이 수예요.',
        'plays': '회 플레이', 'Chroma Awards · Season 2 submission': '크로마 어워즈 · 시즌 2 출품작',
        'Chroma Awards · Season 1': '크로마 어워즈 · 시즌 1',
        'Play the game': '게임 플레이', 'View Chroma entry': '출품작 보기', 'Watch trailer': '예고편 보기',
        'Watch the HOLLOW STRIDER trailer': 'HOLLOW STRIDER 예고편 보기', 'HOLLOW STRIDER trailer': 'HOLLOW STRIDER 예고편',
        '1st Place, Chroma Awards 2025 • Fighting & Shooters': '2025 크로마 어워즈 격투·슈팅 부문 1위',
        'Open VibeTube Broadcast ↗': 'VibeTube Broadcast 열기 ↗', 'WEB APP': '웹 앱', 'ANDROID': '안드로이드',
        'DEMO': '시연 영상', 'VIBE JAM': '바이브 잼', 'App Demo': '앱 시연', 'App preview': '앱 미리보기',
        'Close preview': '미리보기 닫기', 'VibeCreAI on Astrocade': '아스트로케이드의 VibeCreAI',
        'Spin2Pick Demo': 'Spin2Pick 시연', 'ECO Guardian Demo': 'ECO Guardian 시연', 'Vibe Survivor Demo': 'Vibe Survivor 시연',
        'Open on Astrocade ↗': '아스트로케이드에서 열기 ↗', 'Watch on YouTube ↗': '유튜브에서 보기 ↗',
        "LET'S CONNECT": '연락하기', "Got ideas? Questions? Or just want to say hi? I'd love to hear from you!": '아이디어나 궁금한 점이 있나요? 가벼운 인사도 좋아요!',
        'ENTER YOUR EMAIL': '이메일 주소를 입력하세요', 'JOIN THE VIBE': '소식 받아보기', 'JOIN': '구독',
        'SUBSCRIBING...': '구독 신청 중…', 'SUBSCRIBED!': '구독 완료!',
        'Quick social links': '소셜 채널 바로가기', 'Contact and social links': '연락처와 소셜 채널',
        'Email': '이메일', 'KakaoTalk Open Chat': '카카오톡 오픈채팅', 'YouTube': '유튜브', 'Instagram': '인스타그램',
        'Discord': '디스코드', 'TikTok': '틱톡', 'GitHub': '깃허브', 'Twitter': 'X (트위터)',
        'Workstation terminal for Samson': '샘슨의 작업대 터미널', "Click '/next' to navigate:": "'/next'를 눌러 다음 페이지로",
        'Drag or use the arrow keys to rotate. Home resets the view. Select to toggle the terminal.': '드래그하거나 방향키로 돌려 보세요. Home 키로 시점을 되돌리고, 선택하면 터미널을 열거나 닫을 수 있어요.',
        'Minimize': '최소화', 'Maximize': '최대화', 'Close': '닫기', 'Switch Vibe Theme': '테마 바꾸기',
        'Samson greeting visitors': '방문객에게 인사하는 샘슨', 'Samson dancing beside the AI bot': 'AI 봇과 함께 춤추는 샘슨',
        'Samson celebrating': '기뻐하는 샘슨', 'VIBECREAI - CREATING THE FUTURE WITH AI': 'VIBECREAI · AI와 함께 만드는 미래',
        'BOOTING': '전원 켜는 중', 'LOADING': '불러오는 중', 'READY': '준비 완료',
        'Initializing AI core…': 'AI 코어를 깨우는 중…', 'Deploying pixel maze scouts…': '픽셀 미로에 정찰대를 보내는 중…',
        'Calibrating neon shaders…': '네온 조명을 맞추는 중…', 'Enjoy the vibes!': '재미있게 둘러보세요!',
        'Building the future with AI...': 'AI와 함께 미래를 만드는 중…', 'Solo developer + AI agents = ∞': '1인 개발자 + AI 에이전트 = ∞',
        'Creating fun digital experiences': '즐거운 디지털 경험을 만들어요', 'Vibe coding in progress...': '바이브 코딩 중…',
        'Press this to open terminal!': '여기를 누르면 터미널이 열려요!', 'Where creativity meets AI': '상상력과 AI가 만나는 곳',
        'ABOUT THIS PROJECT': '프로젝트 소개', 'TECH STACK': '사용 기술', 'THE VIBE CODE': '바이브 코딩 철학', 'GET THE SOURCE': '소스 코드 보기',
        'Default': '기본', 'Matrix': '매트릭스', 'Ghost': '고스트', 'Synthwave': '신스웨이브'
    };
    let language = 'en';
    try { if (localStorage.getItem(key) === 'ko') language = 'ko'; } catch { /* Optional storage. */ }
    const originals = new WeakMap();
    const originalAttributes = new WeakMap();
    const t = (english) => language === 'ko' && Object.hasOwn(korean, english) ? korean[english] : english;

    // Translate individual text nodes so icons, counters, links and their handlers stay mounted.
    function localize(root) {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
            acceptNode(node) {
                return node.nodeType === 1 && node.matches('script,style,svg,canvas,[data-language]')
                    ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
            }
        });
        let node;
        while ((node = walker.nextNode())) {
            if (node.nodeType === 1) {
                for (const attr of ['aria-label', 'aria-description', 'title', 'placeholder']) {
                    const current = node.getAttribute(attr);
                    if (!current) continue;
                    const attrs = originalAttributes.get(node) || {};
                    const english = attrs[attr]?.last === current ? attrs[attr].english : current;
                    if (!Object.hasOwn(korean, english)) continue;
                    const last = t(english);
                    if (current !== last) node.setAttribute(attr, last);
                    attrs[attr] = { english, last };
                    originalAttributes.set(node, attrs);
                }
                continue;
            }
            const original = originals.get(node);
            const english = original?.last === node.data ? original.english : node.data;
            const source = english.trim();
            const translation = node.parentElement?.dataset.ko || (Object.hasOwn(korean, source) && korean[source]);
            if (!translation || !source) continue;
            const last = language === 'en' ? english : english.replace(source, () => translation);
            if (node.data !== last) node.data = last;
            originals.set(node, { english, last });
        }
    }
    function updateControls() {
        for (const button of document.querySelectorAll('[data-language]'))
            button.setAttribute('aria-pressed', String(button.dataset.language === language));
    }
    function apply() {
        document.documentElement.lang = language;
        localize(document.body);
        updateControls();
    }
    function readyFont() {
        // Canvas signs and open cards must use the same faces on the first draw and after a language switch.
        return Promise.allSettled([
            document.fonts.load('16px VibeWordmark', 'VIBECREAI'),
            document.fonts.load('16px DungGeunMo', 'Arcade 123 한글')
        ]);
    }
    document.documentElement.lang = language;
    window.VibeLocale = { t, localize, readyFont, get language() { return language; } };
    document.addEventListener('DOMContentLoaded', apply);
    let requestedLanguage = language;
    document.addEventListener('click', async (event) => {
        const next = event.target.closest('[data-language]')?.dataset.language;
        if (next !== 'en' && next !== 'ko') return;
        requestedLanguage = next;
        if (language === next) return;
        await readyFont();
        if (requestedLanguage !== next || language === next) return;
        language = next;
        try { localStorage.setItem(key, language); } catch { /* Works for this visit. */ }
        apply();
        document.dispatchEvent(new Event('vibe-language-change'));
    });
})();
