<script setup lang="ts">
import {computed, onBeforeUnmount, onMounted, ref, watch} from "vue";
import type {DailyStory, StoryApiSettings, StoryContent, StoryWord} from "./story";
import {
    buildDemoStory,
    buildWordPool,
    callLLM,
    commitStory,
    getHistory,
    getOptions,
    getSettings,
    getUsedWords,
    lookupInVocab,
    pickWords,
    saveOptions,
    saveSettings,
    todayString,
} from "./story";

const API_PRESETS: Array<{name: string; baseUrl: string; model: string}> = [
    {name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat'},
    {name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini'},
]

const options = ref(getOptions())
const settings = ref<StoryApiSettings>(getSettings())
const history = ref<DailyStory[]>(getHistory())
const used = ref<Record<string, string>>(getUsedWords())

const pool = ref<{words: string[]; meanings: Record<string, string>; vocab: any[]}>({words: [], meanings: {}, vocab: []})
const poolLoading = ref(false)
const generating = ref(false)
const errorMessage = ref('')
const showTranslation = ref(true)
const showSettingsPanel = ref(false)
const settingsDraft = ref<StoryApiSettings>({...settings.value})
const expandedHistoryDate = ref<string | null>(null)

const today = computed(() => history.value.find(h => h.date === todayString()))

const freshLeft = computed(() => pool.value.words.filter(w => !used.value[w]).length)

const hasApiKey = computed(() => settings.value.apiKey.trim().length > 0)

watch(options, () => {
    saveOptions(options.value)
    refreshPool()
}, {deep: true})

onMounted(() => {
    refreshPool()
    document.addEventListener('click', closeWordPopup)
    document.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', closeWordPopup)
    document.removeEventListener('keydown', onKeydown)
})

interface WordPopup {
    word: string
    meaning: string
    x: number
    y: number
}

const popup = ref<WordPopup | null>(null)

function closeWordPopup() {
    popup.value = null
}

function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
        closeWordPopup()
    }
}

/** 双击短文中的单词：弹出释义并朗读 */
function onStoryDblClick(e: MouseEvent, wordList: StoryWord[]) {
    const selected = window.getSelection()?.toString() ?? ''
    const match = selected.trim().match(/[a-zA-Z][a-zA-Z'-]*/)
    if (!match) return
    const word = match[0]
    let meaning = wordList.find(it => it.word.toLowerCase() === word.toLowerCase())?.meaning ?? ''
    if (!meaning) {
        meaning = lookupInVocab(pool.value.vocab, word)
    }
    popup.value = {
        word,
        meaning: meaning || '未在词库中找到释义',
        x: Math.max(8, Math.min(e.clientX - 60, window.innerWidth - 340)),
        y: e.clientY + 16,
    }
    speak(word)
}

async function refreshPool() {
    poolLoading.value = true
    try {
        pool.value = await buildWordPool(options.value.source)
    } finally {
        poolLoading.value = false
    }
}

async function generateWithWords(words: string[], reusedWords: string[]) {
    generating.value = true
    errorMessage.value = ''
    try {
        let content: StoryContent
        let source: 'ai' | 'demo'
        let model: string
        if (hasApiKey.value) {
            content = await callLLM(settings.value, words, pool.value.meanings)
            source = 'ai'
            model = settings.value.model
        } else {
            content = buildDemoStory(words, pool.value.meanings)
            source = 'demo'
            model = '本地示例（未配置 API）'
        }
        const story: DailyStory = {
            date: todayString(),
            words,
            title: content.title,
            story: content.story,
            translation: content.translation,
            wordList: content.words.map(w => ({
                word: w.word,
                meaning: w.meaning || pool.value.meanings[w.word] || '',
            })),
            source,
            model,
            reusedWords,
        }
        const result = commitStory(story, history.value, used.value)
        history.value = result.history
        used.value = result.used
    } catch (e: any) {
        errorMessage.value = e?.message || String(e)
    } finally {
        generating.value = false
    }
}

/** 生成今日短文：优先挑选从未用过的生词 */
async function generateNew() {
    if (pool.value.words.length === 0) {
        errorMessage.value = '生词池为空：请先到单词页用 / + 点击 把不会的词标记为"待复习"，或切换生词来源。'
        return
    }
    const {words, reusedWords} = pickWords(pool.value.words, options.value.wordCount, used.value)
    await generateWithWords(words, reusedWords)
}

/** 用今天的同一批词重新生成（不会消耗新词） */
async function regenerateSameWords() {
    if (!today.value) return
    await generateWithWords(today.value.words, today.value.reusedWords)
}

/** 换一批新词重新生成今天的短文 */
async function regenerateNewWords() {
    if (!today.value) return
    if (pool.value.words.length === 0) {
        errorMessage.value = '生词池为空，无法换词。'
        return
    }
    const {words, reusedWords} = pickWords(pool.value.words, options.value.wordCount, used.value)
    await generateWithWords(words, reusedWords)
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function escapeRegExp(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** 把短文中的生词包上高亮标签，悬停显示释义 */
function highlightWith(text: string, wordList: StoryWord[]): string {
    let html = escapeHtml(text)
    for (const item of wordList) {
        const word = item.word.trim()
        if (!word) continue
        const re = new RegExp(`\\b${escapeRegExp(word)}\\b`, 'gi')
        html = html.replace(re, m => `<span class="sw" data-meaning="${escapeHtml(item.meaning)}">${m}</span>`)
    }
    return html
}

function paragraphs(text: string): string[] {
    return text.split(/\n+/).map(p => p.trim()).filter(p => p.length > 0)
}

function speak(text: string) {
    if (!('speechSynthesis' in window) || !text) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    window.speechSynthesis.speak(utterance)
}

function applyPreset(preset: {baseUrl: string; model: string}) {
    settingsDraft.value.baseUrl = preset.baseUrl
    settingsDraft.value.model = preset.model
}

function saveSettingsAction() {
    settings.value = {...settingsDraft.value}
    saveSettings(settings.value)
    showSettingsPanel.value = false
}

function resetUsedWords() {
    if (!confirm('确定清空"已用过"记录吗？之后每天的短文将重新从全部生词中挑选（历史记录保留）。')) return
    used.value = {}
    localStorage.removeItem('story_used_words')
}

function removeHistoryItem(date: string) {
    if (!confirm(`确定删除 ${date} 的短文吗？`)) return
    history.value = history.value.filter(h => h.date !== date)
    localStorage.setItem('story_history', JSON.stringify(history.value))
    if (expandedHistoryDate.value === date) {
        expandedHistoryDate.value = null
    }
}

function toggleHistory(date: string) {
    expandedHistoryDate.value = expandedHistoryDate.value === date ? null : date
}

const todayParagraphs = computed(() => (today.value ? paragraphs(today.value.story) : []))
const todayTranslationParagraphs = computed(() => (today.value ? paragraphs(today.value.translation) : []))
</script>

<template>
    <div class="story-page">

        <div class="top-bar">
            <div class="panel brand-panel">
                <RouterLink class="back-link" to="/">← 单词</RouterLink>
                <h1 class="page-title">每日短文</h1>
                <button class="btn btn-secondary btn-sm" @click="showSettingsPanel = true">API 设置</button>
            </div>

            <div class="panel controls-panel">
                <div class="controls-row">
                    <label class="control-label">
                        生词来源
                        <select v-model="options.source" class="form-select form-select-sm">
                            <option value="uncertain">待复习（/ 标记的词）</option>
                            <option value="unmarked">当前词库未标记</option>
                            <option value="both">待复习 + 未标记</option>
                        </select>
                    </label>
                    <label class="control-label">
                        每篇生词数
                        <select v-model.number="options.wordCount" class="form-select form-select-sm">
                            <option :value="4">4 个</option>
                            <option :value="6">6 个</option>
                            <option :value="8">8 个</option>
                            <option :value="10">10 个</option>
                            <option :value="12">12 个</option>
                        </select>
                    </label>
                </div>

                <div class="pool-stats">
                    <span>生词池 {{ pool.words.length }} 个</span>
                    <span>未用过 {{ freshLeft }} 个</span>
                    <span>已用过 {{ pool.words.length - freshLeft }} 个</span>
                    <span v-if="poolLoading">加载中…</span>
                </div>

                <div class="btn-row">
                    <button v-if="!today" class="btn btn-primary" :disabled="generating" @click="generateNew">
                        {{ generating ? '生成中…' : '生成今日短文' }}
                    </button>
                    <template v-else>
                        <button class="btn btn-primary" :disabled="generating" @click="regenerateSameWords">
                            {{ generating ? '生成中…' : '重新生成（同批词）' }}
                        </button>
                        <button class="btn btn-secondary" :disabled="generating" @click="regenerateNewWords">
                            换一批词
                        </button>
                    </template>
                    <button v-if="Object.keys(used).length > 0" class="btn btn-secondary btn-sm" @click="resetUsedWords">
                        清空已用记录
                    </button>
                </div>

                <div v-if="errorMessage" class="error-message">{{ errorMessage }}</div>

                <div v-if="!hasApiKey" class="hint-message">
                    未配置 API Key，将生成本地示例短文。点击右上角"API 设置"填入 Key 后即可用 AI 生成。
                </div>
            </div>
        </div>

        <div class="main-content">
            <section v-if="today" class="panel story-card">
                <div class="story-meta">
                    <span class="story-date">{{ today.date }}</span>
                    <span v-if="today.source === 'ai'" class="badge badge-ai">AI 生成 · {{ today.model }}</span>
                    <span v-else class="badge badge-demo">本地示例</span>
                </div>

                <h2 class="story-title">{{ today.title }}</h2>

                <div class="story-text" @dblclick="onStoryDblClick($event, today.wordList)">
                    <p v-for="(p, i) in todayParagraphs" :key="i" v-html="highlightWith(p, today.wordList)"></p>
                </div>

                <div v-if="today.reusedWords.length > 0" class="reused-note">
                    生词池中新词不足，以下词为循环复用：{{ today.reusedWords.join('、') }}
                </div>

                <div class="story-actions">
                    <button class="btn btn-secondary btn-sm" @click="speak(today.story)">朗读短文</button>
                    <button class="btn btn-secondary btn-sm" @click="showTranslation = !showTranslation">
                        {{ showTranslation ? '隐藏译文' : '显示译文' }}
                    </button>
                </div>
                <div class="dbl-tip">双击短文中的任意单词，查看释义并朗读</div>

                <div v-if="showTranslation" class="story-translation">
                    <p v-for="(p, i) in todayTranslationParagraphs" :key="i">{{ p }}</p>
                </div>

                <div class="word-chips">
                    <button
                        v-for="item in today.wordList"
                        :key="item.word"
                        class="word-chip"
                        :title="item.meaning"
                        @click="speak(item.word)"
                    >
                        <span class="chip-word">{{ item.word }}</span>
                        <span class="chip-meaning">{{ item.meaning }}</span>
                    </button>
                </div>
            </section>

            <section v-else class="panel empty-state">
                <p>还没有今天的短文。</p>
                <p class="empty-tip">
                    流程：在单词页把不会的词标记为"待复习"（按 <b>/</b> 再点击单词）→ 回到本页生成今日短文。
                    每天会从没用过的生词里挑选，直到生词池用完一轮，不会天天重复。
                </p>
            </section>

            <section class="panel history-panel" v-if="history.length > 0">
                <h3 class="section-title">历史记录（{{ history.length }} 篇，保存在本机）</h3>
                <div class="history-list">
                    <div v-for="item in history" :key="item.date" class="history-item">
                        <div class="history-item-head" @click="toggleHistory(item.date)">
                            <span class="history-date">{{ item.date }}</span>
                            <span class="history-title">{{ item.title }}</span>
                            <span class="history-words">{{ item.words.join('、') }}</span>
                            <span class="history-arrow">{{ expandedHistoryDate === item.date ? '▲' : '▼' }}</span>
                        </div>
                        <div v-if="expandedHistoryDate === item.date" class="history-item-body">
                            <div class="story-text" @dblclick="onStoryDblClick($event, item.wordList)">
                                <p v-for="(p, i) in paragraphs(item.story)" :key="i" v-html="highlightWith(p, item.wordList)"></p>
                            </div>
                            <div class="story-translation">
                                <p v-for="(p, i) in paragraphs(item.translation)" :key="i">{{ p }}</p>
                            </div>
                            <div class="history-item-actions">
                                <button class="btn btn-secondary btn-sm" @click="speak(item.story)">朗读</button>
                                <button class="btn btn-danger btn-sm" @click="removeHistoryItem(item.date)">删除</button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>

        <div v-if="showSettingsPanel" class="modal-mask" @click.self="showSettingsPanel = false">
            <div class="panel settings-panel">
                <h3 class="section-title">API 设置</h3>
                <p class="hint-message">
                    短文由大模型生成，接口需兼容 OpenAI chat/completions 且允许浏览器跨域（DeepSeek、OpenAI 均可）。
                    Key 仅保存在本机 localStorage，不会上传到任何服务器。
                </p>

                <div class="preset-row">
                    <button
                        v-for="preset in API_PRESETS"
                        :key="preset.name"
                        class="btn btn-secondary btn-sm"
                        @click="applyPreset(preset)"
                    >
                        {{ preset.name }} 预设
                    </button>
                </div>

                <label class="settings-field">
                    接口地址
                    <input v-model="settingsDraft.baseUrl" type="text" class="form-control" placeholder="https://api.deepseek.com/v1"/>
                </label>
                <label class="settings-field">
                    API Key
                    <input v-model="settingsDraft.apiKey" type="password" class="form-control" placeholder="sk-…"/>
                </label>
                <label class="settings-field">
                    模型
                    <input v-model="settingsDraft.model" type="text" class="form-control" placeholder="deepseek-chat"/>
                </label>

                <div class="btn-row">
                    <button class="btn btn-primary" @click="saveSettingsAction">保存</button>
                    <button class="btn btn-secondary" @click="showSettingsPanel = false">取消</button>
                </div>
            </div>
        </div>

        <div
            v-if="popup"
            class="word-popup"
            :style="{left: popup.x + 'px', top: popup.y + 'px'}"
            @click.stop
        >
            <div class="wp-word">{{ popup.word }}</div>
            <div class="wp-meaning">{{ popup.meaning }}</div>
        </div>
    </div>
</template>

<style scoped lang="scss">
@import "story";
</style>
