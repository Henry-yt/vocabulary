<script setup lang="ts">
import {computed, onMounted, ref, watch} from "vue";
import Clipboard from 'clipboard';
import {VOCABULARY_IMPORTS, loadVocabularyList} from "../vocabularyMap";

const KEY_LOCALSTORAGE_KNOWN = "known_words"
const KEY_LOCALSTORAGE_UNCERTAIN = "uncertain_words"
const KEY_LOCALSTORAGE_LAST_VOCABULARY = "last_vocabulary"

const knownWordsSet = ref(new Set<string>())
const knownWordsArray = ref<Array<string>>([])

const uncertainWordsSet = ref(new Set<string>())
const uncertainWordsArray = ref<Array<string>>([])


const currentVocabulary = ref<any[]>([])

const wordsRandom = computed(() => {
    return shuffle(currentVocabulary.value)
    // return currentVocabulary.value
})

/**
 * 数组乱序算法
 */
function shuffle(arr: Array<any>) {
    let length = arr.length,
        r = length,
        rand = 0;

    while (r) {
        rand = Math.floor(Math.random() * r--);
        [arr[r], arr[rand]] = [arr[rand], arr[r]];
    }
    return arr;
}

function speakWord(word: string) {
    if ('speechSynthesis' in window) {
        // 停止当前正在播放的语音
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(word);
        utterance.lang = 'en-US'; // 设置为英语
        utterance.rate = 1; // 语速稍慢一点
        utterance.volume = 0.7; // 音量
        
        window.speechSynthesis.speak(utterance);
    }
}

async function loadVocabulary(name: string) {
    currentVocabulary.value = await loadVocabularyList(name)
}

// Add a ref to track if the Ctrl key is pressed and active word
const isCtrlPressed = ref(false);
const isSlashPressed = ref(false); // Track if / is pressed
const activeWord = ref<string | null>(null);
const panelPosition = ref({ left: 0 });
const isToolPanelAtTop = ref(true); // Add new ref for container position

// Add a ref for the selected vocabulary name
const selectedVocabulary = ref('初中')

// Modify onMounted to load last vocabulary
onMounted(async () => {
    // Load last selected vocabulary
    const lastVocabulary = localStorage.getItem(KEY_LOCALSTORAGE_LAST_VOCABULARY)
    if (lastVocabulary) {
        selectedVocabulary.value = lastVocabulary
    }
    
    await loadVocabulary(selectedVocabulary.value)

    // 载入用户数据
    const knownWordsData = localStorage.getItem(KEY_LOCALSTORAGE_KNOWN)
    if (knownWordsData) {
        try {
            knownWordsArray.value = JSON.parse(knownWordsData)
            knownWordsSet.value = new Set(knownWordsArray.value)
        } catch {
            knownWordsArray.value = []
            knownWordsSet.value = new Set()
        }
    }
    const uncertainWordsData = localStorage.getItem(KEY_LOCALSTORAGE_UNCERTAIN)
    if (uncertainWordsData) {
        try {
            uncertainWordsArray.value = JSON.parse(uncertainWordsData)
            uncertainWordsSet.value = new Set(uncertainWordsArray.value)
        } catch {
            uncertainWordsArray.value = []
            uncertainWordsSet.value = new Set()
        }
    }

    // Add event listeners for keydown and keyup
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Control' || event.key === 'Meta') {
            isCtrlPressed.value = true;
        }
        if (event.key === '/' || event.keyCode === 191) {
            isSlashPressed.value = true;
        }
    });
    window.addEventListener('keyup', (event) => {
        if (event.key === 'Control' || event.key === 'Meta') {
            isCtrlPressed.value = false;
            activeWord.value = null;
        }
        if (event.key === '/' || event.keyCode === 191) {
            isSlashPressed.value = false;
        }
    });
    // Add event listener for document blur
    document.addEventListener('blur', () => {
        isCtrlPressed.value = false;
        activeWord.value = null;
    });
    // Add click event listener to hide translation when clicking outside
    document.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (!target.closest('.word-item')) {
            activeWord.value = null;
        }
    });
})

watch(knownWordsArray, () => {
    localStorage.setItem(KEY_LOCALSTORAGE_KNOWN, JSON.stringify(knownWordsArray.value));
}, { deep: true });

watch(uncertainWordsArray, () => {
    localStorage.setItem(KEY_LOCALSTORAGE_UNCERTAIN, JSON.stringify(uncertainWordsArray.value));
}, { deep: true });

// Add watch for selectedVocabulary
watch(selectedVocabulary, (newValue) => {
    localStorage.setItem(KEY_LOCALSTORAGE_LAST_VOCABULARY, newValue)
})

function addKnownWord(word: string) {
    knownWordsSet.value.add(word)
    knownWordsArray.value.push(word)
}

function deleteKnownWord(word: string) {
    knownWordsSet.value.delete(word)
    knownWordsArray.value = knownWordsArray.value.filter(w => w !== word)
}

function addUncertainWord(word: string) {
    uncertainWordsSet.value.add(word)
    uncertainWordsArray.value.push(word)
}

function deleteUncertainWord(word: string) {
    uncertainWordsSet.value.delete(word)
    uncertainWordsArray.value = uncertainWordsArray.value.filter(w => w !== word)
}

// Modify handleVocabularyChange to remove URL update
async function handleVocabularyChange(event: Event) {
    const select = event.target as HTMLSelectElement
    selectedVocabulary.value = select.value
    await loadVocabulary(selectedVocabulary.value)
}

// Modify reloadPage function to just shuffle
function reloadPage() {
    currentVocabulary.value = [...currentVocabulary.value] // Create new array to trigger reactivity
}

function handleWordHover(word: string) {
    speakWord(word);
}

// Update handleWordClick to accept event and check isSlashPressed
function handleWordClick(word: string) {
    speakWord(word);
    if (isSlashPressed.value) {
        if (knownWordsSet.value.has(word)) {
            deleteKnownWord(word);
            addUncertainWord(word);
        } else if (!uncertainWordsSet.value.has(word)) {
            addUncertainWord(word);
        }
        return;
    }
    if (isCtrlPressed.value) {
        deleteKnownWord(word);
    } else {
        if (uncertainWordsSet.value.has(word)) {
            deleteUncertainWord(word);
            addKnownWord(word);
        } else if (!knownWordsSet.value.has(word)) {
            addKnownWord(word);
        }
    }
}

function calculatePanelPosition(event: MouseEvent) {
    const wordElement = event.currentTarget as HTMLElement;
    const panelWidth = 300; // min-width from CSS
    const screenWidth = window.innerWidth;
    const offsetLeft = wordElement.offsetLeft;

    if (screenWidth > offsetLeft + panelWidth) {
        panelPosition.value.left = 0;
    } else {
        panelPosition.value.left = offsetLeft + panelWidth - screenWidth + 30;
    }
}

function exportConfigToClipboard() {
    // Deduplicate each array independently
    const uniqueKnown = Array.from(new Set(knownWordsArray.value));
    const uniqueUncertain = Array.from(new Set(uncertainWordsArray.value));
    
    const config = {
        known: uniqueKnown,
        uncertain: uniqueUncertain,
        lastVocabulary: selectedVocabulary.value
    };
    const json = JSON.stringify(config, null, 2);
    const tempBtn = document.createElement('button');
    tempBtn.setAttribute('data-clipboard-text', json);
    document.body.appendChild(tempBtn);
    const clipboard = new Clipboard(tempBtn);
    tempBtn.click();
    clipboard.destroy();
    document.body.removeChild(tempBtn);
    alert('配置已复制到剪贴板！');
}

async function importConfigFromClipboard() {
    try {
        const text = await navigator.clipboard.readText();
        const config = JSON.parse(text);
        if (Array.isArray(config.known) && Array.isArray(config.uncertain)) {
            knownWordsArray.value = config.known;
            knownWordsSet.value = new Set(config.known);
            uncertainWordsArray.value = config.uncertain;
            uncertainWordsSet.value = new Set(config.uncertain);
            localStorage.setItem(KEY_LOCALSTORAGE_KNOWN, JSON.stringify(config.known));
            localStorage.setItem(KEY_LOCALSTORAGE_UNCERTAIN, JSON.stringify(config.uncertain));
            
            // Import last vocabulary if it exists
            if (config.lastVocabulary) {
                selectedVocabulary.value = config.lastVocabulary;
                await loadVocabulary(config.lastVocabulary);
            }
            
            alert('配置已导入！');
        } else {
            alert('剪贴板内容格式不正确');
        }
    } catch (e) {
        alert('读取或解析剪贴板内容失败');
    }
}
</script>

<template>
    <div :class="['select-container', { 'container-bottom': !isToolPanelAtTop }]">

        <div class="logo-wrapper">
            <img class="logo" src="./github-mark.png" alt="logo"/>
            <a class="link" target="_blank" href="https://github.com/KyleBing/vocabulary">GITHUB: VOCABULARY</a>
        </div>

        <div class="select-content">
            <select v-model="selectedVocabulary" @change="handleVocabularyChange" class="form-select form-select-sm">
                <optgroup v-for="(group, groupName) in VOCABULARY_IMPORTS" :key="groupName" :label="groupName">
                    <option v-for="(_, name) in group" :key="name" :value="name">{{ name }}</option>
                </optgroup>
            </select>

            <div class="info-wrapper">
                <div class="info-item">
                    <div class="count">{{ knownWordsSet.size }}</div>
                    <div class="label">已掌握</div>
                </div>
                <div class="info-item">
                    <div class="count">{{ uncertainWordsSet.size }}</div>
                    <div class="label">待复习</div>
                </div>
                <div class="info-item">
                    <div class="count">{{ currentVocabulary.length }}</div>
                    <div class="label">此词库</div>
                </div>
            </div>
            <div class="btn-wrapper">
                <button @click="importConfigFromClipboard" class="btn btn-secondary btn-sm">导入配置</button>
                <button @click="exportConfigToClipboard" class="btn btn-secondary btn-sm">导出配置</button>
                <button @click="reloadPage" class="btn btn-warning btn-sm">刷新布局</button>
            </div>

            <div class="story-entry">
                <RouterLink class="story-link" to="/story">每日短文 → 用不会的单词生成短文学习</RouterLink>
            </div>
        </div>



        <div 
            :class="['top-bottom-button', { 'up': isToolPanelAtTop, 'bottom': !isToolPanelAtTop }]"
            @click="isToolPanelAtTop = !isToolPanelAtTop" >
            <svg v-if="isToolPanelAtTop" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16">
                <path d="M7.247 11.14L2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592a1 1 0 0 1 .753 1.659l-4.796 5.48a1 1 0 0 1-1.506 0z"/>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="white" viewBox="0 0 16 16">
                <path d="M7.247 4.86l-4.796 5.481c-.566.647-.106 1.659.753 1.659h9.592a1 1 0 0 0 .753-1.659l-4.796-5.48a1 1 0 0 0-1.506 0z"/>
            </svg>
        </div>
    </div>


    <div class="word-list">
        <div :class="[
                'word-item',
                {known: knownWordsSet.has(item.word)},
                {uncertain: uncertainWordsSet.has(item.word)},
            ]"
             @click="handleWordClick(item.word)"
             @contextmenu.prevent="(e) => { activeWord = item.word; calculatePanelPosition(e); }"
             @mouseenter="handleWordHover(item.word)"
             v-for="item in wordsRandom"
             :key="item"
        >
            <div class="word">{{ item.word }}</div>


            <div class="translation-panel" v-if="activeWord === item.word" :style="`left: ${-panelPosition.left}px`">
                <div class="translation-list">
                    <div class="translation-item" v-for="translation in item.translations" :key="translation.translation">
                        <div class="type">{{ translation.type }}</div>
                        <div class="translation">{{ translation.translation }}</div>
                    </div>
                </div>
                <div class="sentence-list" v-if="item.sentences && item.sentences.length > 0">
                    <div class="sentence-item" v-for="sentence in item.sentences" :key="sentence.sentence">
                        <div class="sentence-en">{{ sentence.sentence }}</div>
                        <div class="sentence-cn">{{ sentence.translation }}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
@import "vocabulary";
</style>
