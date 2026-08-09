/**
 * Community Q&A forum — local cache + Supabase sync (Growth Sprint 17-18).
 * @module services/community-forum
 */

const LS_QUESTIONS = 'monefyi_forum_questions';
const LS_ANSWERS = 'monefyi_forum_answers';

/** @type {object[]} */
export const SEED_QUESTIONS = [
  {
    id: 'seed_reksadana_saham',
    title: 'Baiknya invest reksadana atau saham?',
    body: 'Income 8jt, baru punya emergency fund 3 bulan.',
    answer_count: 234,
    is_anonymous: true,
    is_seed: true,
    created_at: '2026-07-01T10:00:00Z',
  },
  {
    id: 'seed_emergency_pas_pasan',
    title: 'Cara mulai emergency fund kalau income pas-pasan?',
    body: 'Take home 4.5jt, expense hampir habis setiap bulan.',
    answer_count: 178,
    is_anonymous: true,
    is_seed: true,
    created_at: '2026-06-15T08:00:00Z',
  },
  {
    id: 'seed_motor_kredit',
    title: 'Kredit motor cash atau leasing?',
    body: 'Butuh motor kerja, budget 25jt.',
    answer_count: 156,
    is_anonymous: true,
    is_seed: true,
    created_at: '2026-06-01T12:00:00Z',
  },
];

function supa() {
  return typeof window !== 'undefined' ? window.STATE?.db?.supa : null;
}

function userId() {
  return typeof window !== 'undefined' ? window.STATE?.db?.user?.id : null;
}

/**
 * @returns {object[]}
 */
export function loadLocalQuestions() {
  try {
    if (typeof localStorage === 'undefined') return [];
    return JSON.parse(localStorage.getItem(LS_QUESTIONS) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object[]} rows
 */
function saveLocalQuestions(rows) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS_QUESTIONS, JSON.stringify(rows.slice(0, 30)));
}

/**
 * @returns {object[]}
 */
export function loadLocalAnswers() {
  try {
    if (typeof localStorage === 'undefined') return [];
    return JSON.parse(localStorage.getItem(LS_ANSWERS) || '[]');
  } catch {
    return [];
  }
}

/**
 * @param {object[]} rows
 */
function saveLocalAnswers(rows) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(LS_ANSWERS, JSON.stringify(rows.slice(0, 100)));
}

/**
 * @returns {Promise<object[]>}
 */
export async function loadForumQuestions() {
  const local = loadLocalQuestions();
  const client = supa();
  const uid = userId();

  if (client && uid && navigator.onLine !== false) {
    try {
      const { data } = await client
        .from('community_questions')
        .select('id, title, body, is_anonymous, answer_count, created_at, user_id')
        .order('created_at', { ascending: false })
        .limit(20);
      if (Array.isArray(data) && data.length) {
        const merged = [...data, ...local.filter((l) => !data.some((d) => d.id === l.id))];
        return [...SEED_QUESTIONS, ...merged].slice(0, 25);
      }
    } catch (e) {
      console.warn('[community-forum] load questions', e);
    }
  }

  return [...SEED_QUESTIONS, ...local].slice(0, 25);
}

/**
 * @param {string} questionId
 * @returns {Promise<object[]>}
 */
export async function loadForumAnswers(questionId) {
  const local = loadLocalAnswers().filter((a) => a.question_id === questionId);
  const client = supa();

  if (client && navigator.onLine !== false && !String(questionId).startsWith('seed_')) {
    try {
      const { data } = await client
        .from('community_answers')
        .select('id, body, is_expert, created_at, user_id')
        .eq('question_id', questionId)
        .order('created_at', { ascending: true })
        .limit(30);
      if (Array.isArray(data)) return data;
    } catch (e) {
      console.warn('[community-forum] load answers', e);
    }
  }

  if (String(questionId).startsWith('seed_')) {
    return getSeedAnswers(questionId);
  }
  return local;
}

/**
 * @param {string} seedId
 * @returns {object[]}
 */
function getSeedAnswers(seedId) {
  const map = {
    seed_reksadana_saham: [
      { id: 'a1', body: 'Mulai reksadana pasar uang / pendapatan tetap dulu. Saham direct setelah paham volatilitas.', is_expert: true },
      { id: 'a2', body: '80% RDPU + 20% campuran selama 6 bulan pertama — biasa-biasa aja tapi konsisten.', is_expert: false },
    ],
    seed_emergency_pas_pasan: [
      { id: 'a3', body: 'Auto-transfer Rp 50rb/hari setelah gajian. Kecil tapi 1 tahun = 600rb.', is_expert: true },
    ],
    seed_motor_kredit: [
      { id: 'a4', body: 'Cash/leasing 0% kalau ada. Hindari bunga > 1%/bulan — hitung total cost.', is_expert: true },
    ],
  };
  return (map[seedId] || []).map((a, i) => ({
    ...a,
    created_at: new Date(Date.now() - i * 86400000).toISOString(),
  }));
}

/**
 * @param {object} payload
 * @returns {Promise<object>}
 */
export async function postForumQuestion(payload) {
  const { moderateForumQuestion } = await import('./community-forum-moderation.js');
  const mod = moderateForumQuestion(payload);
  if (!mod.ok) throw new Error(mod.reason || 'Konten ditolak');

  const title = String(payload.title || '').trim().slice(0, 200);
  const body = String(payload.body || '').trim().slice(0, 1000);

  const row = {
    id: `local_q_${Date.now()}`,
    title,
    body,
    is_anonymous: payload.anonymous !== false,
    answer_count: 0,
    created_at: new Date().toISOString(),
  };

  const client = supa();
  const uid = userId();

  if (client && uid && navigator.onLine !== false) {
    try {
      const { data, error } = await client.from('community_questions').insert({
        user_id: payload.anonymous === false ? uid : null,
        title,
        body,
        is_anonymous: payload.anonymous !== false,
      }).select('*').single();
      if (!error && data) {
        const local = loadLocalQuestions();
        saveLocalQuestions([data, ...local]);
        return data;
      }
    } catch (e) {
      console.warn('[community-forum] post question', e);
    }
  }

  const local = loadLocalQuestions();
  saveLocalQuestions([row, ...local]);
  return row;
}

/**
 * @param {string} questionId
 * @param {string} body
 * @returns {Promise<object>}
 */
export async function postForumAnswer(questionId, body) {
  const { moderateForumText } = await import('./community-forum-moderation.js');
  const mod = moderateForumText(body);
  if (!mod.ok) throw new Error(mod.reason || 'Jawaban ditolak');

  const text = String(body || '').trim().slice(0, 800);

  const row = {
    id: `local_a_${Date.now()}`,
    question_id: questionId,
    body: text,
    is_expert: false,
    created_at: new Date().toISOString(),
  };

  const client = supa();
  const uid = userId();

  if (client && uid && navigator.onLine !== false && !String(questionId).startsWith('seed_')) {
    try {
      const { data, error } = await client.from('community_answers').insert({
        question_id: questionId,
        user_id: uid,
        body: text,
      }).select('*').single();
      if (!error && data) {
        const answers = loadLocalAnswers();
        saveLocalAnswers([data, ...answers]);
        return data;
      }
    } catch (e) {
      console.warn('[community-forum] post answer', e);
    }
  }

  const answers = loadLocalAnswers();
  saveLocalAnswers([row, ...answers]);
  return row;
}

if (typeof window !== 'undefined') {
  window.monefyiCommunityForum = {
    loadForumQuestions, loadForumAnswers, postForumQuestion, postForumAnswer, SEED_QUESTIONS,
  };
}
