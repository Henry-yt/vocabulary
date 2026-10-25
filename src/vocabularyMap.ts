type VocabularyImporter = () => Promise<{default: any[]}>

export const VOCABULARY_IMPORTS: Record<string, Record<string, VocabularyImporter>> = {
    '基础词汇': {
        '初中词汇': () => import('./vocabulary/json/1-初中-顺序.json'),
        '高中词汇': () => import('./vocabulary/json/2-高中-顺序.json'),
        '四级词汇': () => import('./vocabulary/json/3-CET4-顺序.json'),
        '六级词汇': () => import('./vocabulary/json/4-CET6-顺序.json'),
        '考研词汇': () => import('./vocabulary/json/5-考研-顺序.json'),
        '托福词汇': () => import('./vocabulary/json/6-托福-顺序.json'),
        'SAT词汇': () => import('./vocabulary/json/7-SAT-顺序.json'),
    },
    '小学词汇': {
        '人教版小学三年级上册': () => import('./vocabulary/json_original/json-sentence/PEPXiaoXue3_1.json'),
        '人教版小学三年级下册': () => import('./vocabulary/json_original/json-sentence/PEPXiaoXue3_2.json'),
        '人教版小学四年级上册': () => import('./vocabulary/json_original/json-sentence/PEPXiaoXue4_1.json'),
        '人教版小学四年级下册': () => import('./vocabulary/json_original/json-sentence/PEPXiaoXue4_2.json'),
        '人教版小学五年级上册': () => import('./vocabulary/json_original/json-sentence/PEPXiaoXue5_1.json'),
        '人教版小学五年级下册': () => import('./vocabulary/json_original/json-sentence/PEPXiaoXue5_2.json'),
        '人教版小学六年级上册': () => import('./vocabulary/json_original/json-sentence/PEPXiaoXue6_1.json'),
        '人教版小学六年级下册': () => import('./vocabulary/json_original/json-sentence/PEPXiaoXue6_2.json'),
    },
    '初中词汇': {
        '人教版初中七年级上册': () => import('./vocabulary/json_original/json-sentence/PEPChuZhong7_1.json'),
        '人教版初中七年级下册': () => import('./vocabulary/json_original/json-sentence/PEPChuZhong7_2.json'),
        '人教版初中八年级上册': () => import('./vocabulary/json_original/json-sentence/PEPChuZhong8_1.json'),
        '人教版初中八年级下册': () => import('./vocabulary/json_original/json-sentence/PEPChuZhong8_2.json'),
        '人教版初中九年级': () => import('./vocabulary/json_original/json-sentence/PEPChuZhong9_1.json'),
        '外研社初中一年级': () => import('./vocabulary/json_original/json-sentence/WaiYanSheChuZhong_1.json'),
        '外研社初中二年级': () => import('./vocabulary/json_original/json-sentence/WaiYanSheChuZhong_2.json'),
        '外研社初中三年级': () => import('./vocabulary/json_original/json-sentence/WaiYanSheChuZhong_3.json'),
        '外研社初中四年级': () => import('./vocabulary/json_original/json-sentence/WaiYanSheChuZhong_4.json'),
        '外研社初中五年级': () => import('./vocabulary/json_original/json-sentence/WaiYanSheChuZhong_5.json'),
        '外研社初中六年级': () => import('./vocabulary/json_original/json-sentence/WaiYanSheChuZhong_6.json'),
    },
    '高中词汇': {
        '人教版高中必修1': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_1.json'),
        '人教版高中必修2': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_2.json'),
        '人教版高中必修3': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_3.json'),
        '人教版高中必修4': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_4.json'),
        '人教版高中必修5': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_5.json'),
        '人教版高中选修6': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_6.json'),
        '人教版高中选修7': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_7.json'),
        '人教版高中选修8': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_8.json'),
        '人教版高中选修9': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_9.json'),
        '人教版高中选修10': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_10.json'),
        '人教版高中选修11': () => import('./vocabulary/json_original/json-sentence/PEPGaoZhong_11.json'),
        '北师大版高中必修1': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_1.json'),
        '北师大版高中必修2': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_2.json'),
        '北师大版高中必修3': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_3.json'),
        '北师大版高中必修4': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_4.json'),
        '北师大版高中必修5': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_5.json'),
        '北师大版高中选修6': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_6.json'),
        '北师大版高中选修7': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_7.json'),
        '北师大版高中选修8': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_8.json'),
        '北师大版高中选修9': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_9.json'),
        '北师大版高中选修10': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_10.json'),
        '北师大版高中选修11': () => import('./vocabulary/json_original/json-sentence/BeiShiGaoZhong_11.json'),
    },
    '大学词汇': {
        '四级真题核心词': () => import('./vocabulary/json_original/json-sentence/CET4_1.json'),
        '四级英语词汇': () => import('./vocabulary/json_original/json-sentence/CET4_2.json'),
        '六级真题核心词': () => import('./vocabulary/json_original/json-sentence/CET6_1.json'),
        '六级英语词汇': () => import('./vocabulary/json_original/json-sentence/CET6_2.json'),
        '考研必考词汇': () => import('./vocabulary/json_original/json-sentence/KaoYan_1.json'),
        '考研英语词汇': () => import('./vocabulary/json_original/json-sentence/KaoYan_2.json'),
    },
    '国际考试': {
        'TOEFL词汇': () => import('./vocabulary/json_original/json-sentence/TOEFL_2.json'),
        '雅思词汇': () => import('./vocabulary/json_original/json-sentence/IELTS_2.json'),
        'SAT词汇': () => import('./vocabulary/json_original/json-sentence/SAT_2.json'),
        'GRE词汇': () => import('./vocabulary/json_original/json-sentence/GRE_2.json'),
        'GMAT词汇': () => import('./vocabulary/json_original/json-sentence/GMAT_2.json'),
        '商务英语词汇': () => import('./vocabulary/json_original/json-sentence/BEC_2.json'),
        '专四核心词汇-1': () => import('./vocabulary/json_original/json-sentence/Level4_1.json'),
        '专四核心词汇-2': () => import('./vocabulary/json_original/json-sentence/Level4_2.json'),
        '专八核心词汇-1': () => import('./vocabulary/json_original/json-sentence/Level8_1.json'),
        '专八核心词汇-2': () => import('./vocabulary/json_original/json-sentence/Level8_2.json'),
    },
    '新东方': {
        '初中词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/ChuZhong_3.json'),
        '高中词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/GaoZhong_3.json'),
        '四级词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/CET4_3.json'),
        '六级词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/CET6_3.json'),
        '考研词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/KaoYan_3.json'),
        'TOEFL词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/TOEFL_3.json'),
        '雅思词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/IELTS_3.json'),
        'SAT词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/SAT_3.json'),
        'GRE词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/GRE_3.json'),
        'GMAT词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/GMAT_3.json'),
        'BEC词汇（新东方）': () => import('./vocabulary/json_original/json-sentence/BEC_3.json'),
    }
}

/**
 * 加载指定名称的词库列表
 */
export async function loadVocabularyList(name: string): Promise<any[]> {
    for (const group of Object.values(VOCABULARY_IMPORTS)) {
        if (name in group) {
            const module = await group[name]()
            return module.default
        }
    }
    return []
}

/**
 * 从词库列表中查找单词的中文释义（词性. 释义；…）
 */
export function findWordMeaning(words: any[], word: string): string {
    const found = words.find(w => w.word && w.word.toLowerCase() === word.toLowerCase())
    if (!found || !Array.isArray(found.translations) || found.translations.length === 0) {
        return ''
    }
    return found.translations
        .map((t: any) => `${t.type ? t.type + '. ' : ''}${t.translation}`)
        .join('；')
}
