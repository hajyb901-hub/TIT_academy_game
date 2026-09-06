// =========================================================
// أكاديمية تيت للسيارات - محرك اللعبة والمؤثرات ونظام المزامنة
// =========================================================

let gameState = {
    currentIndex: 0,
    scoreA: 0,
    scoreB: 0,
    currentTeam: 'A',
    hintCount: 0,
    optionsShown: false,
    teamAName: 'فريق المحركات',
    teamBName: 'فريق التيربو',
    roundQuestionCount: 15,
    deck: [], // بنك الأسئلة العشوائي للجولة الحالية
    flashTimeout: null,
    isTransitioning: false,
    roomCode: null,
    roomId: null,
    roomChannel: null
};

// =========================================================
// إعداد اتصال Supabase (نظام الغرف - مزامنة بين أجهزة مختلفة)
// المفتاح هنا هو الـ publishable key فقط، وهو آمن للظهور في المتصفح
// (محمي بصلاحيات RLS من جهة قاعدة البيانات) - لا يوضع هنا أبداً أي secret key
// =========================================================
const SUPABASE_URL = 'https://ovpjjmohrvmkyaksbjky.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Bi3tRmNu5JBrK32XtX-BjQ_JJ16IwNE';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// =========================================================
// محرك المؤثرات الصوتية التخليقي (Web Audio API Synthesizer)
// =========================================================
let audioCtx = null;

function getAudioContext() {
    if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
            audioCtx = new AudioContextClass();
        }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// 1. صوت تفحيط واحتكاك وبريك كفر السيارة (Tire Burnout & Brake Skid Sound)
function playTireScreechSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;

        const now = ctx.currentTime;
        const duration = 1.4;

        // توليد ضوضاء احتكاك المطاط بالأسفلت (White Noise for Rubber Burnout)
        const bufferSize = ctx.sampleRate * duration;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        // فلتر تمرير النطاق لصوت الصرير المميز للفرامل والتفحيط (Bandpass Filter)
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(2400, now);
        filter.frequency.exponentialRampToValueAtTime(3400, now + 0.35);
        filter.frequency.exponentialRampToValueAtTime(1600, now + 0.95);
        filter.frequency.exponentialRampToValueAtTime(700, now + duration);
        filter.Q.setValueAtTime(9, now);

        // تعديل التردد المنخفض (LFO) لإعطاء تذبذب واهتزاز التفحيط
        const lfo = ctx.createOscillator();
        lfo.type = 'sawtooth';
        lfo.frequency.setValueAtTime(20, now);
        lfo.frequency.exponentialRampToValueAtTime(9, now + duration);

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(550, now);
        lfo.connect(lfoGain);
        lfoGain.connect(filter.frequency);

        // نغمة صرير البريك الحادة (High Squeal Tone)
        const squealOsc = ctx.createOscillator();
        squealOsc.type = 'triangle';
        squealOsc.frequency.setValueAtTime(3000, now);
        squealOsc.frequency.linearRampToValueAtTime(3800, now + 0.3);
        squealOsc.frequency.exponentialRampToValueAtTime(1400, now + 0.9);
        squealOsc.frequency.exponentialRampToValueAtTime(500, now + duration);

        const squealGain = ctx.createGain();
        squealGain.gain.setValueAtTime(0, now);
        squealGain.gain.linearRampToValueAtTime(0.2, now + 0.12);
        squealGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        // محرك الاحتراق والتيربو الخلفي (Low Engine Growl)
        const engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.setValueAtTime(120, now);
        engineOsc.frequency.exponentialRampToValueAtTime(280, now + 0.45);
        engineOsc.frequency.exponentialRampToValueAtTime(90, now + duration);

        const engineFilter = ctx.createBiquadFilter();
        engineFilter.type = 'lowpass';
        engineFilter.frequency.setValueAtTime(480, now);

        const engineGain = ctx.createGain();
        engineGain.gain.setValueAtTime(0.22, now);
        engineGain.gain.linearRampToValueAtTime(0.38, now + 0.35);
        engineGain.gain.exponentialRampToValueAtTime(0.01, now + duration);

        // مجمع الصوت الرئيسي
        const masterNoiseGain = ctx.createGain();
        masterNoiseGain.gain.setValueAtTime(0.06, now);
        masterNoiseGain.gain.linearRampToValueAtTime(0.5, now + 0.18);
        masterNoiseGain.gain.setValueAtTime(0.45, now + 0.7);
        masterNoiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

        whiteNoise.connect(filter);
        filter.connect(masterNoiseGain);
        masterNoiseGain.connect(ctx.destination);

        squealOsc.connect(squealGain);
        squealGain.connect(ctx.destination);

        engineOsc.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(ctx.destination);

        // بدء التشغيل
        whiteNoise.start(now);
        lfo.start(now);
        squealOsc.start(now);
        engineOsc.start(now);

        whiteNoise.stop(now + duration);
        lfo.stop(now + duration);
        squealOsc.stop(now + duration);
        engineOsc.stop(now + duration);
    } catch (e) {
        console.warn('Audio Synthesis not allowed yet or error:', e);
    }
}

// 2. نغمة النجاح والإجابة الصحيحة
function playCorrectSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major
        chord.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + idx * 0.08);

            gain.gain.setValueAtTime(0, now + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.08 + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.7);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + idx * 0.08);
            osc.stop(now + idx * 0.08 + 0.75);
        });
    } catch (e) {}
}

// 3. نغمة الخطأ
function playWrongSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(140, now);
        osc.frequency.exponentialRampToValueAtTime(70, now + 0.45);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.5);
    } catch (e) {}
}

// 4. صوت كشف الخيارات (نغمة صاعدة بريقة)
function playRevealOptionsSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.2);
        osc.frequency.exponentialRampToValueAtTime(600, now + 0.35);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.35);
    } catch (e) {}
}

// 5. صوت التلميح (نغمة ناعمة)
function playHintSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1000, now + 0.15);

        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.25);
    } catch (e) {}
}

// 6. صوت الانتقال للسؤال التالي (نغمة بريقة صاعدة)
function playNextQuestionSound() {
    try {
        const ctx = getAudioContext();
        if (!ctx) return;
        const now = ctx.currentTime;

        // نغمة أولى
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(800, now);
        osc1.frequency.exponentialRampToValueAtTime(1200, now + 0.2);

        gain1.gain.setValueAtTime(0.15, now);
        gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.25);

        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        // نغمة ثانية بعد تأخير قصير
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(1000, now + 0.15);
        osc2.frequency.exponentialRampToValueAtTime(1400, now + 0.35);

        gain2.gain.setValueAtTime(0, now + 0.15);
        gain2.gain.linearRampToValueAtTime(0.15, now + 0.2);
        gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.25);
        osc2.start(now + 0.15);
        osc2.stop(now + 0.4);
    } catch (e) {}
}

// =========================================================
// نظام الغرف: إنشاء غرفة جديدة والاشتراك بالتحديثات اللحظية
// =========================================================
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // بدون أحرف/أرقام ملتبسة (O,0,I,1)
    let code = '';
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

async function createGameRoom(nameA, nameB, deck) {
    let data = null;
    let lastError = null;
    for (let attempt = 0; attempt < 5 && !data; attempt++) {
        const code = generateRoomCode();
        const { data: inserted, error } = await supabaseClient
            .from('rooms')
            .insert({
                room_code: code,
                team_a_name: nameA,
                team_b_name: nameB,
                deck: deck,
                question_count: deck.length,
                status: 'active'
            })
            .select()
            .single();
        if (!error) data = inserted;
        else {
            lastError = error;
            console.warn('محاولة إنشاء غرفة فشلت، إعادة محاولة...', error.message, error);
        }
    }

    if (!data) {
        console.error('تعذر إنشاء غرفة اللعبة على Supabase - سبب الخطأ:', lastError);
        const el = document.getElementById('roomCodeDisplay');
        if (el) el.textContent = 'تعذر الاتصال! افتح Console (F12)';
        return null;
    }

    gameState.roomCode = data.room_code;
    gameState.roomId = data.id;
    updateRoomCodeDisplay();
    subscribeToRoom(data.id);
    return data;
}

function updateRoomCodeDisplay() {
    const el = document.getElementById('roomCodeDisplay');
    if (el) el.textContent = gameState.roomCode || '—';
    const judgeLink = document.getElementById('judgeQuickLink');
    if (judgeLink && gameState.roomCode) {
        judgeLink.href = `judge.html?room=${gameState.roomCode}`;
    }
}

function subscribeToRoom(roomId) {
    if (gameState.roomChannel) {
        supabaseClient.removeChannel(gameState.roomChannel);
    }
    gameState.roomChannel = supabaseClient
        .channel('room-updates-' + roomId)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'rooms',
            filter: `id=eq.${roomId}`
        }, (payload) => {
            handleRoomUpdate(payload.new, payload.old || {});
        })
        .subscribe();
}

// يستقبل أي تغيير يسويه الحكم من جهازه (لوحة judge.html) ويعكسه على شاشة المتسابقين
function handleRoomUpdate(row, oldRow) {
    if (row.score_a !== oldRow.score_a) {
        gameState.scoreA = row.score_a;
        document.getElementById('scoreA').textContent = row.score_a;
    }
    if (row.score_b !== oldRow.score_b) {
        gameState.scoreB = row.score_b;
        document.getElementById('scoreB').textContent = row.score_b;
    }

    // حدث لحظي: إجابة صحيحة/خاطئة (يتغير مع كل ضغطة حتى لو نفس النوع، بفضل nonce)
    if (row.last_event && JSON.stringify(row.last_event) !== JSON.stringify(oldRow.last_event)) {
        if (row.last_event.type === 'correct') {
            triggerGlowFeedback(true);
            playCorrectSound();
        } else if (row.last_event.type === 'wrong') {
            triggerGlowFeedback(false);
            playWrongSound();
        }
    }

    if (row.current_index !== oldRow.current_index) {
        loadQuestionByIndex(row.current_index);
    }

    if (row.options_shown && !oldRow.options_shown) {
        gameState.optionsShown = true;
        revealOptionsOnScreen();
    }

    if (row.hint_nonce !== oldRow.hint_nonce && row.hint_visible) {
        revealHintOnScreen(row.hint_text);
    } else if (!row.hint_visible && oldRow.hint_visible) {
        hideHintModal();
    }
}

// =========================================================
// إدارة التنقل بين الشاشات
// =========================================================
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    const target = document.getElementById(screenId);
    if (target) {
        target.style.display = 'flex';
        target.classList.add('active');
    }
}

function showTeamSetup() {
    showScreen('teamSetupScreen');
}

function setQuestionCount(count) {
    gameState.roundQuestionCount = count;
    document.querySelectorAll('.count-btn').forEach(b => b.classList.remove('active'));
    if (window.event && window.event.target) {
        window.event.target.classList.add('active');
    }
}

// =========================================================
// خوارزمية الخلط العشوائي (Fisher-Yates Shuffle)
// =========================================================
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// =========================================================
// بدء جولة مسابقة جديدة مع حركة تفحيط الكفر وصوت البريك
// =========================================================
function startNewGameSession() {
    if (gameState.isTransitioning) return;
    gameState.isTransitioning = true;

    const nameA = document.getElementById('teamAName').value.trim() || 'فريق المحركات';
    const nameB = document.getElementById('teamBName').value.trim() || 'فريق التيربو';

    gameState.teamAName = nameA;
    gameState.teamBName = nameB;
    gameState.scoreA = 0;
    gameState.scoreB = 0;
    gameState.currentIndex = 0;
    gameState.hintCount = 0;
    gameState.optionsShown = false;

    // خلط واختيار الأسئلة عشوائياً من البنك الضخم (100 سؤال)
    const shuffledQuestions = shuffleArray(questionBank);
    const count = gameState.roundQuestionCount === 'ALL'
        ? shuffledQuestions.length
        : Math.min(Number(gameState.roundQuestionCount) || 15, shuffledQuestions.length);

    gameState.deck = shuffledQuestions.slice(0, count);

    // إنشاء غرفة اللعبة على Supabase (بالخلفية، بدون تعطيل بدء اللعبة)
    // -- يطلع كود الغرفة يعرض بأسفل شاشة المتسابقين ويربط زر "لوحة الحكم" تلقائياً
    gameState.roomCode = null;
    gameState.roomId = null;
    updateRoomCodeDisplay();
    createGameRoom(nameA, nameB, gameState.deck).catch(err => {
        console.error('خطأ أثناء إنشاء الغرفة:', err);
    });

    // تحديث واجهة العرض للمتسابقين
    document.getElementById('teamADisplay').textContent = nameA;
    document.getElementById('teamBDisplay').textContent = nameB;
    document.getElementById('scoreA').textContent = '0';
    document.getElementById('scoreB').textContent = '0';
    document.getElementById('totalQ').textContent = gameState.deck.length;

    // إخفاء شاشة البداية والإعدادات فوراً وتجهيز شاشة المتسابقين والسؤال الأول
    // خلف ستارة الكفر مباشرة (بدون أي وميض) قبل تشغيل حركة المسح
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('startScreen').classList.remove('active');
    document.getElementById('teamSetupScreen').style.display = 'none';
    document.getElementById('teamSetupScreen').classList.remove('active');
    showScreen('contestantScreen');
    loadQuestionByIndex(0);

    // إظهار ستارة الكفر (نفس حركة الانتقال بين الأسئلة) لتمسح الشاشة
    // من اليمين لليسار وتكشف شاشة المتسابقين الجاهزة خلفها
    const burnoutOverlay = document.getElementById('burnoutTransition');
    if (burnoutOverlay) {
        burnoutOverlay.style.display = 'flex';
        burnoutOverlay.classList.remove('play-burnout');
        // Force reflow لضمان بدء الأنيميشن من جديد
        void burnoutOverlay.offsetWidth;
        burnoutOverlay.classList.add('play-burnout');
    }

    // تشغيل صوت التفحيط والبريك
    playTireScreechSound();

    // بعد انتهاء حركة المسح، إخفاء ستارة الكفر
    setTimeout(() => {
        if (burnoutOverlay) {
            burnoutOverlay.style.display = 'none';
            burnoutOverlay.classList.remove('play-burnout');
        }
        gameState.isTransitioning = false;
    }, 2000); // مدة مسح الكفر (مطابقة لـ --wipe-duration في style.css)
}

// =========================================================
// تحميل وعرض السؤال
// =========================================================
function loadQuestionByIndex(index) {
    if (!gameState.deck || gameState.deck.length === 0) {
        gameState.deck = questionBank;
    }

    const q = gameState.deck[index];
    if (!q) return;

    gameState.currentIndex = index;
    gameState.hintCount = 0;
    gameState.optionsShown = false;

    clearAllGlows();

    // نصوص السؤال والشارات مع نقطتين قبل الخيارات
    document.getElementById('questionText').textContent = q.question + ' ••';
    document.getElementById('currentQ').textContent = index + 1;
    document.getElementById('totalQ').textContent = gameState.deck.length;
    document.getElementById('categoryBadge').textContent = q.category || 'ميكانيكا عامة';

    // إخفاء الخيارات مؤقتاً (التلميح أصبح في نافذة منبثقة منفصلة hintModalOverlay)
    document.getElementById('optionsContainer').style.display = 'none';
    hideHintModal();

    // تعبئة نصوص الخيارات الأربعة
    q.options.forEach((optText, i) => {
        const el = document.getElementById(`optText${i}`);
        if (el) {
            // إزالة أي بادئة כמו "أ) " أو "ب) " للحصول على النص النقي
            const textClean = optText.replace(/^[أ-د]\)\s*/, '');
            el.textContent = textClean;
            el.style.removeProperty('display');
            el.style.removeProperty('visibility');
            el.style.removeProperty('opacity');
            el.style.removeProperty('color');
            el.style.display = 'block';
        }
    });

    // مزامنة مع الحكم (تتم تلقائياً عبر Supabase Realtime عند تغيّر current_index بالغرفة)

    // تشغيل انتقالية الكفر للسؤال التالي (إذا لم تكن أول سؤال)
    if (index > 0) {
        playNextQuestionTransition();
    }
}

// =========================================================
// انتقالية الكفر والسؤال التالي
// =========================================================
function playNextQuestionTransition() {
    const burnoutOverlay = document.getElementById('burnoutTransition');
    if (!burnoutOverlay) return;

    burnoutOverlay.style.display = 'flex';
    burnoutOverlay.classList.remove('play-burnout');

    // Force reflow
    void burnoutOverlay.offsetWidth;

    burnoutOverlay.classList.add('play-burnout');

    // تشغيل صوت التفحيط والبريك
    playTireScreechSound();

    // إخفاء الانتقالية بعد انتهاء الحركة (نفس مدة حركة الكفر/الشارع/الستارة الموحدة)
    setTimeout(() => {
        burnoutOverlay.style.display = 'none';
        burnoutOverlay.classList.remove('play-burnout');
    }, 2000); // مطابقة لـ --wipe-duration في style.css
}

// =========================================================
// كشف الخيارات والتلميحات على الشاشة
// =========================================================
function revealOptionsOnScreen() {
    const box = document.getElementById('optionsContainer');
    if (box) {
        box.style.display = 'grid';
    }

    // بعد ظهور الخيارات: نقطة وحدة بس بعد نص السؤال (كانت نقطتين قبل الكشف)
    const currentQ = gameState.deck && gameState.deck[gameState.currentIndex];
    if (currentQ) {
        document.getElementById('questionText').textContent = currentQ.question + ' •';
    }

    // تشغيل صوت الكشف عن الخيارات
    playRevealOptionsSound();
}

let hintAutoHideTimeout = null;

function revealHintOnScreen(hintText) {
    const overlay = document.getElementById('hintModalOverlay');
    const textEl = document.getElementById('hintModalText');
    const timerFill = document.getElementById('hintTimerFill');

    if (overlay && textEl) {
        textEl.textContent = hintText;
        overlay.style.display = 'flex';

        // إعادة تشغيل أنيميشن المؤقت
        if (timerFill) {
            timerFill.style.animation = 'none';
            void timerFill.offsetWidth; // Force reflow
            timerFill.style.animation = 'hintTimerShrink 8s linear forwards';
        }

        // إلغاء المؤقت السابق إن وجد
        if (hintAutoHideTimeout) {
            clearTimeout(hintAutoHideTimeout);
        }

        // إخفاء تلقائي بعد 8 ثوان
        hintAutoHideTimeout = setTimeout(() => {
            hideHintModal();
        }, 8000);

        // تشغيل صوت التلميح
        playHintSound();
    }
}

function hideHintModal() {
    const overlay = document.getElementById('hintModalOverlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
    if (hintAutoHideTimeout) {
        clearTimeout(hintAutoHideTimeout);
        hintAutoHideTimeout = null;
    }
}

// =========================================================
// التوهج المزدوج: أطراف الشاشة + صندوق السؤال نفسه
// =========================================================
function triggerGlowFeedback(isCorrect) {
    const edgeOverlay = document.getElementById('screenEdgeGlow');
    const questionCard = document.getElementById('questionCardBox');
    const flashOverlay = document.getElementById('flashOverlay');

    clearAllGlows();

    // Force reflow
    if (edgeOverlay) void edgeOverlay.offsetWidth;
    if (questionCard) void questionCard.offsetWidth;

    if (isCorrect) {
        if (edgeOverlay) edgeOverlay.className = 'screen-edge-glow edge-correct';
        if (questionCard) questionCard.classList.add('card-correct');
        if (flashOverlay) flashOverlay.className = 'flash-overlay correct-glow';
    } else {
        if (edgeOverlay) edgeOverlay.className = 'screen-edge-glow edge-wrong';
        if (questionCard) questionCard.classList.add('card-wrong');
        if (flashOverlay) flashOverlay.className = 'flash-overlay wrong-glow';
    }

    if (gameState.flashTimeout) clearTimeout(gameState.flashTimeout);
    gameState.flashTimeout = setTimeout(() => {
        clearAllGlows();
    }, 2000);
}

function clearAllGlows() {
    const edgeOverlay = document.getElementById('screenEdgeGlow');
    const questionCard = document.getElementById('questionCardBox');
    const flashOverlay = document.getElementById('flashOverlay');

    if (edgeOverlay) edgeOverlay.className = 'screen-edge-glow';
    if (questionCard) {
        questionCard.classList.remove('card-correct');
        questionCard.classList.remove('card-wrong');
    }
    if (flashOverlay) flashOverlay.className = 'flash-overlay';
}

// =========================================================
// النوافذ المنبثقة والمعلومات
// =========================================================
function showModal(title, content) {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = content;
    document.getElementById('generalModal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('generalModal').style.display = 'none';
}

function showSettingsModal() {
    showModal(
        'إعدادات المسابقة',
        'يمكنك اختيار عدد الأسئلة من شاشة <strong>"ابدأ التحدي"</strong> (10، 15، 25، أو كل البنك 100 سؤال).<br><br>تتغير الأسئلة وتترتب عشوائياً في كل مرة تبدأ فيها مواجهة جديدة لضمان عدم التكرار والعدالة التامة.'
    );
}

function showAboutModal() {
    showModal(
        'عن أكاديمية تيت للسيارات',
        'تحدي مسابقات السيارات التفاعلي هو منصة تدريبية لقياس المعرفة الميكانيكية وتشخيص الأعطال.<br><br>• تحكيم مباشر ومزامنة لحظية بين الأجهزة المختلفة عن طريق نظام الغرف (Room Code).<br>• بنك أسئلة متخصص يضم 100 سؤال يغطي المحركات، التيربو، الفرامل، الكهرباء، الهايبرد، والحساسات.<br><br><strong>© جميع الحقوق محفوظة لأكاديمية تيت للسيارات</strong>'
    );
}

function openJudgePanelDirect() {
    const url = gameState.roomCode ? `judge.html?room=${gameState.roomCode}` : 'judge.html';
    window.open(url, '_blank', 'width=1000,height=800');
}

// تهيئة أولية
document.addEventListener('DOMContentLoaded', () => {
    showScreen('startScreen');
    // تهيئة مسبقة لطبقة الصوت
    document.body.addEventListener('click', () => {
        getAudioContext();
    }, { once: true });
});
