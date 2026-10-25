import {findWordMeaning, loadVocabularyList} from "../vocabularyMap";

export interface StoryWord {
    word: string
    meaning: string
}

export interface DailyStory {
    /** 生成日期 YYYY-MM-DD，每天只保留一篇 */
    date: string
    /** 本篇包含的生词（原形） */
    words: string[]
    /** 短文标题 */
    title: string
    /** 英文短文正文 */
    story: string
    /** 中文翻译 */
    translation: string
    /** 生词释义列表 */
    wordList: StoryWord[]
    /** 生成方式：ai / demo */
    source: 'ai' | 'demo'
    /** 使用的模型或说明 */
    model: string
    /** 本篇中属于"重复使用"的词（生词池耗尽后循环补充的） */
    reusedWords: string[]
}

export interface StoryApiSettings {
    /** OpenAI 兼容接口地址，例如 https://api.deepseek.com/v1 */
    baseUrl: string
    apiKey: string
    model: string
}

export interface StoryOptions {
    /** 每篇短文的生词数量 */
    wordCount: number
    /** 生词来源：待复习 / 未标记 / 待复习+未标记 */
    source: 'uncertain' | 'unmarked' | 'both'
}

const KEY_HISTORY = 'story_history'
const KEY_USED_WORDS = 'story_used_words'
const KEY_SETTINGS = 'story_settings'
const KEY_OPTIONS = 'story_options'

const KEY_KNOWN = 'known_words'
const KEY_UNCERTAIN = 'uncertain_words'
const KEY_LAST_VOCABULARY = 'last_vocabulary'

const DEFAULT_SETTINGS: StoryApiSettings = {
    baseUrl: 'https://api.deepseek.com/v1',
    apiKey: '',
    model: 'deepseek-chat',
}

const DEFAULT_OPTIONS: StoryOptions = {
    wordCount: 8,
    source: 'uncertain',
}

export function todayString(): string {
    const d = new Date()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${m}-${day}`
}

function readJson<T>(key: string, fallback: T): T {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return fallback
        return JSON.parse(raw) as T
    } catch {
        return fallback
    }
}

function writeJson(key: string, value: any) {
    localStorage.setItem(key, JSON.stringify(value))
}

export function getHistory(): DailyStory[] {
    return readJson<DailyStory[]>(KEY_HISTORY, [])
}

export function saveHistory(history: DailyStory[]) {
    writeJson(KEY_HISTORY, history)
}

/** 以词为键、首次使用日期为值 */
export function getUsedWords(): Record<string, string> {
    return readJson<Record<string, string>>(KEY_USED_WORDS, {})
}

export function saveUsedWords(used: Record<string, string>) {
    writeJson(KEY_USED_WORDS, used)
}

export function getSettings(): StoryApiSettings {
    const saved = readJson<Partial<StoryApiSettings>>(KEY_SETTINGS, {})
    return {...DEFAULT_SETTINGS, ...saved}
}

export function saveSettings(settings: StoryApiSettings) {
    writeJson(KEY_SETTINGS, settings)
}

export function getOptions(): StoryOptions {
    const saved = readJson<Partial<StoryOptions>>(KEY_OPTIONS, {})
    return {...DEFAULT_OPTIONS, ...saved}
}

export function saveOptions(options: StoryOptions) {
    writeJson(KEY_OPTIONS, options)
}

export function getKnownWords(): string[] {
    return readJson<string[]>(KEY_KNOWN, [])
}

export function getUncertainWords(): string[] {
    return readJson<string[]>(KEY_UNCERTAIN, [])
}

/**
 * 构建生词池。
 * uncertain：待复习列表；unmarked：当前词库中既未标记已掌握也未标记待复习的词；
 * both：两者合并。同时尽量从当前词库中查出每个词的中文释义。
 * 返回的 vocab 为当前词库列表，供短文中双击查词使用。
 */
export async function buildWordPool(source: StoryOptions['source']): Promise<{
    words: string[]
    meanings: Record<string, string>
    vocab: any[]
}> {
    const uncertain = getUncertainWords()
    const lastVocabularyName = localStorage.getItem(KEY_LAST_VOCABULARY) || ''

    let words: string[] = []
    // 无论哪种来源都加载当前词库：unmarked/both 需要它算未标记词，双击查词也需要它
    const vocabList: any[] = lastVocabularyName
        ? await loadVocabularyList(lastVocabularyName)
        : []

    if (source === 'uncertain' || source === 'both') {
        words = [...uncertain]
    }
    if ((source === 'unmarked' || source === 'both') && vocabList.length > 0) {
        const knownSet = new Set(getKnownWords().map(w => w.toLowerCase()))
        const uncertainSet = new Set(uncertain.map(w => w.toLowerCase()))
        const unmarked = vocabList
            .filter(w => w.word && !knownSet.has(w.word.toLowerCase()) && !uncertainSet.has(w.word.toLowerCase()))
            .map(w => w.word)
        words = [...words, ...unmarked]
    }

    const uniqueWords = Array.from(new Set(words))
    const meanings: Record<string, string> = {}
    for (const w of uniqueWords) {
        meanings[w] = vocabList.length > 0 ? findWordMeaning(vocabList, w) : ''
    }
    return {words: uniqueWords, meanings, vocab: vocabList}
}

/**
 * 在词库中查词，带简单的词形还原：
 * 先精确匹配，再依次尝试去掉常见屈折后缀（ies/ied/ing/ed/es/s/d/ly）。
 */
export function lookupInVocab(vocab: any[], word: string): string {
    const candidates: string[] = []
    const w = word.toLowerCase()
    candidates.push(w)
    if (w.endsWith('ied')) candidates.push(w.slice(0, -3) + 'y')
    if (w.endsWith('ies')) candidates.push(w.slice(0, -3) + 'y', w.slice(0, -2))
    if (w.endsWith('ing')) candidates.push(w.slice(0, -3), w.slice(0, -3) + 'e')
    if (w.endsWith('ed')) candidates.push(w.slice(0, -2), w.slice(0, -1))
    if (w.endsWith('es')) candidates.push(w.slice(0, -2), w.slice(0, -1))
    else if (w.endsWith('s') && !w.endsWith('ss') && !w.endsWith('us')) candidates.push(w.slice(0, -1))
    if (w.endsWith('ly')) candidates.push(w.slice(0, -2))
    for (const candidate of Array.from(new Set(candidates))) {
        const meaning = findWordMeaning(vocab, candidate)
        if (meaning) return meaning
    }
    return ''
}

function shuffle<T>(arr: T[]): T[] {
    const result = [...arr]
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[result[i], result[j]] = [result[j], result[i]]
    }
    return result
}

/**
 * 选词：优先选从未用过的新词；新词不足时，按"最早使用"的顺序循环补充，
 * 保证每天的短文生词不重复，直到整个生词池用完一轮。
 */
export function pickWords(
    pool: string[],
    count: number,
    used: Record<string, string>
): {words: string[]; reusedWords: string[]} {
    const fresh = shuffle(pool.filter(w => !used[w]))
    const usedPool = pool
        .filter(w => used[w])
        .sort((a, b) => (used[a] || '').localeCompare(used[b] || ''))

    const words = fresh.slice(0, count)
    const reusedWords: string[] = []
    for (const w of usedPool) {
        if (words.length >= count) break
        words.push(w)
        reusedWords.push(w)
    }
    return {words, reusedWords}
}

const SYSTEM_PROMPT = [
    '你是一名专业的英语学习助手，擅长为英语学习者编写短小、有趣、自然的英文小故事。',
    '你只输出一个 JSON 对象，不要输出任何其他文字。JSON 格式为：',
    '{"title": string, "story": string, "translation": string, "words": [{"word": string, "meaning": string}]}',
    '要求：',
    '1. story 是一篇约 180 词的英文小故事，语言自然地道，难度适合备考雅思的学习者；',
    '2. 用户给出的每个单词必须以原形在 story 中恰好出现一次（名词可加冠词或复数等合理屈折变化）；',
    '3. translation 是 story 的完整中文翻译，一一对应；',
    '4. words 数组必须包含用户给出的全部单词，meaning 是该词在文中的中文释义。',
].join('\n')

export function buildPrompt(words: string[], meanings: Record<string, string>): string {
    const wordLines = words
        .map(w => (meanings[w] ? `- ${w}（${meanings[w]}）` : `- ${w}`))
        .join('\n')
    return [
        '请写一篇英文小故事，必须自然地包含以下全部单词：',
        wordLines,
        '注意：输出必须是合法的 JSON 对象，包含 title、story、translation、words 四个字段。',
    ].join('\n')
}

export interface StoryContent {
    title: string
    story: string
    translation: string
    words: StoryWord[]
}

function extractJson(content: string): StoryContent {
    try {
        return JSON.parse(content) as StoryContent
    } catch {
        // 有的模型会在 JSON 外面套上说明文字，尝试截取第一个 {...} 块
        const start = content.indexOf('{')
        const end = content.lastIndexOf('}')
        if (start === -1 || end === -1 || end <= start) {
            throw new Error('模型返回内容不是合法 JSON：' + content.slice(0, 200))
        }
        return JSON.parse(content.slice(start, end + 1)) as StoryContent
    }
}

function normalizeContent(data: StoryContent, targetWords: string[]): StoryContent {
    const words = Array.isArray(data.words)
        ? data.words.filter(w => w && typeof w.word === 'string')
        : []
    for (const target of targetWords) {
        if (!words.some(w => w.word.toLowerCase() === target.toLowerCase())) {
            words.push({word: target, meaning: ''})
        }
    }
    return {
        title: typeof data.title === 'string' ? data.title : '今日短文',
        story: typeof data.story === 'string' ? data.story : '',
        translation: typeof data.translation === 'string' ? data.translation : '',
        words,
    }
}

/**
 * 调用 OpenAI 兼容的 chat/completions 接口生成短文。
 * 直接从前端请求，因此所选服务需允许浏览器跨域（如 DeepSeek、OpenAI 均可）。
 */
export async function callLLM(settings: StoryApiSettings, targetWords: string[], meanings: Record<string, string>): Promise<StoryContent> {
    const url = settings.baseUrl.replace(/\/+$/, '') + '/chat/completions'
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
            model: settings.model,
            temperature: 0.9,
            response_format: {type: 'json_object'},
            messages: [
                {role: 'system', content: SYSTEM_PROMPT},
                {role: 'user', content: buildPrompt(targetWords, meanings)},
            ],
        }),
    })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        if (response.status === 401 || response.status === 403) {
            throw new Error('API Key 无效或没有权限（401/403），请检查设置')
        }
        throw new Error(`请求失败（${response.status}）：${text.slice(0, 300)}`)
    }

    const data = await response.json()
    const content: string = data?.choices?.[0]?.message?.content ?? ''
    if (!content) {
        throw new Error('模型返回内容为空')
    }
    return normalizeContent(extractJson(content), targetWords)
}

/**
 * 未配置 API Key 时的本地示例短文：模板故事生成器。
 * 根据词性（名词/动词/形容词/副词）把生词填进一个有起承转合的小故事框架，
 * 每个词的句子按位置推进情节，避免流水账式罗列。
 */

interface DemoTpl {
    en: string
    zh: string
}

type DemoPos = 'noun' | 'verb' | 'adj' | 'adv'

const DEMO_TITLES = [
    '小镇奇遇',
    '不寻常的一天',
    '木盒的秘密',
    '意外的客人',
    '柳溪镇的故事',
]

const DEMO_OPENINGS: DemoTpl[] = [
    {en: "It was a quiet Saturday morning in the small town of Willowbrook, and Emma had a strange feeling about the day.", zh: "那是柳溪小镇一个安静的星期六早晨，艾玛对这一天有种奇怪的预感。"},
    {en: "Leo woke up early and found a small wooden box on his desk that had not been there the night before.", zh: "利奥早早醒来，发现书桌上有一个昨晚还不存在的小木盒。"},
    {en: "The morning train stopped at the tiny station, and only one passenger stepped off.", zh: "清晨的火车停在小站，只有一位乘客下了车。"},
]

const DEMO_CLOSINGS: DemoTpl[] = [
    {en: "By the time the sun went down, everything felt different — in a good way.", zh: "太阳落山时，一切都变得不一样了——而且是好的那种不一样。"},
    {en: "That night, she wrote everything down in her diary, smiling at the day she had just lived.", zh: "那天晚上，她把一切写进日记，微笑着回味这刚刚过去的一天。"},
    {en: "And from that day on, the little town was never quite the same.", zh: "从那天起，这座小镇就再也不一样了。"},
]

/** 按故事推进位置组织的句子模板，{w} 为生词占位（zh 中填入该词的中文释义） */
const DEMO_STAGES: Record<DemoPos, DemoTpl[]> = {
    noun: [
        {en: "At first, the {w} caught everyone's attention.", zh: "起初，{w}引起了所有人的注意。"},
        {en: "Soon, the {w} became the talk of the whole town.", zh: "很快，{w}成了全镇人谈论的话题。"},
        {en: "By noon, the {w} had become the center of her world.", zh: "中午时分，{w}成了她世界的中心。"},
        {en: "Later, she wrote everything she knew about the {w} in her notebook.", zh: "后来，她把自己所知道的关于{w}的一切都写进了笔记本。"},
        {en: "Meanwhile, her brother could not stop talking about the {w}.", zh: "与此同时，她弟弟一直在不停地谈论{w}。"},
        {en: "That afternoon, a stranger came to ask about the {w}.", zh: "那天下午，有个陌生人来打听{w}。"},
        {en: "To make things even stranger, everything seemed to be about the {w}.", zh: "更奇怪的是，这一切似乎都与{w}有关。"},
        {en: "At that moment, she realized the {w} would change everything.", zh: "那一刻，她意识到{w}将改变一切。"},
        {en: "Then, an old man told her the story behind the {w}.", zh: "接着，一位老人给她讲了{w}背后的故事。"},
        {en: "After a while, she began to see the {w} in a new light.", zh: "过了一会儿，她开始用全新的眼光看待{w}。"},
        {en: "Finally, she understood the secret hidden in the {w}.", zh: "最后，她终于明白了藏在{w}里的秘密。"},
        {en: "In the end, the {w} turned out to be the key to everything.", zh: "最终，{w}原来是一切的关键。"},
    ],
    verb: [
        {en: "At first, she tried to {w} as quietly as possible.", zh: "起初，她试着安静地去做{w}这件事。"},
        {en: "Soon, he decided to {w} before anyone could notice.", zh: "很快，他决定趁没人注意时去做{w}这件事。"},
        {en: "By noon, they all wanted to {w} together.", zh: "中午时分，他们都想一起聊聊{w}这件事。"},
        {en: "Later, she had no choice but to {w} once more.", zh: "后来，她别无选择，只能再次面对{w}这件事。"},
        {en: "Meanwhile, her brother refused to {w} no matter what she said.", zh: "与此同时，不管她怎么说，弟弟都拒绝谈{w}这件事。"},
        {en: "That afternoon, the stranger kindly offered to {w} for her.", zh: "那天下午，陌生人好心地提出，{w}这件事交给他来做。"},
        {en: "To make things even stranger, the little box seemed to {w} all by itself.", zh: "更奇怪的是，那个小盒子似乎和{w}脱不了干系。"},
        {en: "At that moment, she finally understood why she had to {w}.", zh: "那一刻，她终于明白自己为什么必须面对{w}。"},
        {en: "Then, the two of them made a plan to {w} at midnight.", zh: "接着，他们俩定下计划，准备午夜时分着手{w}这件事。"},
        {en: "After a while, even the old cat wanted to {w} with them.", zh: "过了一会儿，连那只老猫都凑过来，想参与{w}这件事。"},
        {en: "Finally, she gathered her courage and began to {w}.", zh: "最后，她鼓起勇气，决定从{w}这件事开始。"},
        {en: "In the end, everyone in the town learned to {w}.", zh: "最终，镇上每个人都学会了如何面对{w}。"},
    ],
    adj: [
        {en: "At first, everything felt {w}.", zh: "起初，一切都让人感到{w}。"},
        {en: "Soon, the weather turned {w} without any warning.", zh: "很快，天气毫无征兆地变得{w}。"},
        {en: "By noon, the whole street seemed {w} and quiet.", zh: "中午时分，整条街都显得{w}而安静。"},
        {en: "Later, she noticed the box looked {w} in the sunlight.", zh: "后来，她发现那盒子在阳光下看起来{w}。"},
        {en: "Meanwhile, his voice sounded {w} on the phone.", zh: "与此同时，电话里他的声音听起来{w}。"},
        {en: "That afternoon, the stranger's words felt {w} and strange.", zh: "那天下午，陌生人的话让人感到{w}而古怪。"},
        {en: "To make things even stranger, the cat began to act {w}.", zh: "更奇怪的是，那只猫开始表现得{w}。"},
        {en: "At that moment, the silence in the room grew {w}.", zh: "那一刻，房间里的寂静变得{w}。"},
        {en: "Then, a {w} light appeared in the distance.", zh: "接着，远处出现了一道{w}的光。"},
        {en: "After a while, even the air smelled {w}.", zh: "过了一会儿，连空气闻起来都{w}。"},
        {en: "Finally, she no longer felt {w} at all.", zh: "最后，她一点儿也不觉得{w}了。"},
        {en: "In the end, the whole adventure turned out to be {w} in the best possible way.", zh: "最终，这场冒险以最好的方式变得{w}。"},
    ],
    adv: [
        {en: "She nodded {w}.", zh: "她{w}点了点头。"},
        {en: "Soon, he replied {w}, without even looking up.", zh: "很快，他{w}回答，连头也没抬。"},
        {en: "By noon, the news had spread {w}.", zh: "中午时分，这消息{w}传开了。"},
        {en: "Later, she whispered {w} to her brother.", zh: "后来，她{w}对弟弟小声说了句话。"},
        {en: "Meanwhile, the rain kept falling {w}.", zh: "与此同时，雨{w}下个不停。"},
        {en: "That afternoon, the stranger smiled {w} and walked away.", zh: "那天下午，陌生人{w}一笑，转身离开。"},
        {en: "To make things even stranger, the door opened {w} by itself.", zh: "更奇怪的是，门自己{w}开了。"},
        {en: "At that moment, everything changed {w}.", zh: "那一刻，一切{w}改变了。"},
        {en: "Then, she turned around {w} and froze.", zh: "接着，她{w}转过身，愣住了。"},
        {en: "After a while, the music stopped {w}.", zh: "过了一会儿，音乐{w}停了。"},
        {en: "Finally, he nodded and agreed {w}.", zh: "最后，他点了点头，{w}同意了。"},
        {en: "In the end, the day passed {w}, but happily.", zh: "最终，这一天{w}过去了，但很快乐。"},
    ],
}

/** 从释义字符串（如 "v. 离弃；放弃"、"n&a. 土著(的)"）推断词性 */
function demoPosOf(meaning: string): DemoPos {
    if (!meaning) return 'noun'
    const type = meaning.split(/[.\s]/)[0].toLowerCase()
    if (type.includes('adj')) return 'adj'
    if (type.includes('ad')) return 'adv'
    if (type.includes('v')) return 'verb'
    if (type.includes('n')) return 'noun'
    if (type.includes('a')) return 'adj'
    return 'noun'
}

/** 提取释义的中文部分（去掉词性前缀与括号说明，只取第一个义项） */
function demoMeaningZh(meaning: string): string {
    if (!meaning) return ''
    return meaning
        .replace(/^[a-z&]+\.\s*/i, '')
        .split(/[；，]/)[0]
        .replace(/^[(（][^)）]*[)）]/, '')
        .replace(/[(（][^)）]*[)）]$/, '')
}

/** 这些副词后面通常不加"地" */
const ADV_NO_DE = new Set([
    '终于', '已经', '曾经', '早已', '很', '都', '不', '就', '还', '又', '再', '也',
    '正在', '刚刚', '马上', '一直', '总是', '经常', '常常', '通常', '也许', '可能',
    '大概', '几乎', '非常', '特别', '比较', '更加', '越来越', '渐渐', '快', '慢',
])

/** 生成副词的中文形式：需要时补"地"，避免"在别处地""终于地"这类错误 */
function demoAdvZh(meaning: string): string {
    const zh = demoMeaningZh(meaning)
    if (!zh) return ''
    if (zh.startsWith('在') || ADV_NO_DE.has(zh) || zh.endsWith('地')) return zh
    return zh + '地'
}

let lastOpening = -1
let lastClosing = -1
let lastTitle = -1

function randomIndexAvoid(len: number, avoid: number): number {
    let i = Math.floor(Math.random() * len)
    if (len > 1 && i === avoid) {
        i = (i + 1) % len
    }
    return i
}

export function buildDemoStory(targetWords: string[], meanings: Record<string, string>): StoryContent {
    lastOpening = randomIndexAvoid(DEMO_OPENINGS.length, lastOpening)
    lastClosing = randomIndexAvoid(DEMO_CLOSINGS.length, lastClosing)
    lastTitle = randomIndexAvoid(DEMO_TITLES.length, lastTitle)
    const opening = DEMO_OPENINGS[lastOpening]
    const closing = DEMO_CLOSINGS[lastClosing]
    const title = DEMO_TITLES[lastTitle]

    const sentences: DemoTpl[] = []
    for (let i = 0; i < targetWords.length; i++) {
        const w = targetWords[i]
        const pos = demoPosOf(meanings[w])
        const templates = DEMO_STAGES[pos]
        const tpl = templates[Math.min(i, templates.length - 1)]
        let zhPart = demoMeaningZh(meanings[w]) || w
        if (pos === 'adv') {
            zhPart = demoAdvZh(meanings[w]) || w
        } else if (pos === 'adj') {
            zhPart = zhPart.replace(/的$/, '')
        }
        sentences.push({en: tpl.en.replace('{w}', w), zh: tpl.zh.replace('{w}', zhPart)})
    }

    const mid = Math.ceil(sentences.length / 2)
    const enFirst = [opening.en, ...sentences.slice(0, mid).map(s => s.en)].join(' ')
    const enSecond = [...sentences.slice(mid).map(s => s.en), closing.en].join(' ')
    const zhFirst = [opening.zh, ...sentences.slice(0, mid).map(s => s.zh)].join('')
    const zhSecond = [...sentences.slice(mid).map(s => s.zh), closing.zh].join('')

    return {
        title,
        story: `${enFirst}\n\n${enSecond}`,
        translation: `${zhFirst}\n\n${zhSecond}`,
        words: targetWords.map(w => ({word: w, meaning: meanings[w] || ''})),
    }
}

/**
 * 记录一篇短文：更新已用词表，并保证历史中同一天只保留一篇。
 */
export function commitStory(
    story: DailyStory,
    history: DailyStory[],
    used: Record<string, string>
): {history: DailyStory[]; used: Record<string, string>} {
    const newHistory = [story, ...history.filter(h => h.date !== story.date)]
    const newUsed = {...used}
    for (const w of story.words) {
        if (!newUsed[w]) {
            newUsed[w] = story.date
        }
    }
    saveHistory(newHistory)
    saveUsedWords(newUsed)
    return {history: newHistory, used: newUsed}
}
