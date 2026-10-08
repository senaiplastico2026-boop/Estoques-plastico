import { db } from '../firebaseConfig.js';
import { ref, get, set } from 'firebase/database';

const GLOBAL_PATH = 'estoqueGlobal';

export async function garantirEstoqueGlobal() {
    const globalRef = ref(db, GLOBAL_PATH);
    const atual = await get(globalRef);
    if (atual.exists()) return atual.val() || {};

    const turmasSnap = await get(ref(db, 'turmas'));
    const turmas = turmasSnap.exists() ? turmasSnap.val() || {} : {};
    const global = {
        materiais: {},
        lixeira_materiais: {},
        moinho: { materiais: [], capacidadeMax: 900, historico: [] },
        historico: {}
    };

    for (const [turmaId, turma] of Object.entries(turmas)) {
        if (!turma || typeof turma !== 'object') continue;
        for (const [id, material] of Object.entries(turma.materiais || {})) {
            if (!global.materiais[id]) global.materiais[id] = { ...material, turmaOrigemId: turmaId };
        }
        for (const [id, material] of Object.entries(turma.lixeira_materiais || {})) {
            if (!global.lixeira_materiais[id]) global.lixeira_materiais[id] = { ...material, turmaOrigemId: turmaId };
        }
        const moinho = turma.moinho;
        if (moinho?.materiais?.length && !global.moinho.materiais.length) {
            global.moinho = { ...moinho, materiais: moinho.materiais.map(item => ({ ...item, turmaOrigemId: turmaId })) };
        }
        for (const [id, registro] of Object.entries(turma.historico || {})) {
            if (!global.historico[id]) global.historico[id] = { ...registro, turmaOrigemId: turmaId };
        }
    }

    await set(globalRef, global);
    return global;
}

export { GLOBAL_PATH };
