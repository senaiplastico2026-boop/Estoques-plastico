import { auth, db } from '../firebaseConfig.js';
import { isOnline, userExtraInfo, userRole } from '../auth.js';
import { ref, get, runTransaction, serverTimestamp } from 'firebase/database';
import { converterParaGramas, obterQuantidadeEmGramas, formatarQuantidade, pesoMoinhoEmGramas } from './quantidades.js';

export function contextoEstoque() {
    const turmaId = window.obterTurmaAtualId?.();
    if (!turmaId || String(turmaId) !== String(window.senaiTurmaAtualId || '')) throw new Error('Turma inválida. Selecione novamente a turma.');
    if (!auth.currentUser?.uid) throw new Error('Usuário não identificado. Entre novamente.');
    if (!isOnline || navigator.onLine === false) throw new Error('Sem conexão. Reconecte antes de movimentar o estoque.');
    return {
        turmaId: String(turmaId), uid: auth.currentUser.uid, executadoPor: {
            uid: auth.currentUser.uid, nome: userExtraInfo?.nome || auth.currentUser.displayName || auth.currentUser.email || 'Não informado',
            email: auth.currentUser.email || '', role: userRole || 'Não informado'
        }
    };
}

export function conferirContexto(contexto) {
    const atual = contextoEstoque();
    if (atual.uid !== contexto.uid || atual.turmaId !== contexto.turmaId) throw new Error('A turma ou sessão mudou. Reabra a operação na turma atual.');
}

export function professoresResponsaveis(turma) {
    const lista = [];
    const mapa = turma.professores || {};
    for (const [chave, valor] of Object.entries(mapa)) {
        if (valor === true && !Array.isArray(mapa)) lista.push({ uid: chave, nome: '', email: '' });
        else if (valor && typeof valor === 'object') {
            const uid = valor.uid || (!Array.isArray(mapa) && !chave.includes('@') && !/^\d+$/.test(chave) ? chave : '');
            if (uid || valor.email) lista.push({ uid, nome: valor.nome || '', email: valor.email || '' });
        }
    }
    if (turma.criadoPorUid && !lista.some(p => p.uid === turma.criadoPorUid)) lista.push({ uid: turma.criadoPorUid, nome: turma.criadoPorNome || '', email: turma.criadoPorEmail || '' });
    if (!lista.length && turma.criadoPorEmail) lista.push({ uid: '', nome: turma.criadoPorNome || '', email: turma.criadoPorEmail });
    return lista.filter((p, i) => lista.findIndex(q => (q.uid || q.email) === (p.uid || p.email)) === i);
}

export function mensagemErroEstoque(error) {
    const code = String(error?.code || '').toLowerCase();
    if (code.includes('permission') || code.includes('denied')) return 'Permissão negada pelo Firebase. Nenhuma operação foi confirmada.';
    if (/network|disconnect|unavailable/.test(code)) return 'Falha de rede. Aguarde a conexão e tente novamente com a mesma operação.';
    return error?.message || 'Erro inesperado. A operação não foi confirmada.';
}

const pendentes = new Set();
export async function transacionarEstoque(contexto, operacaoId, modificar) {
    conferirContexto(contexto);
    if (pendentes.has(operacaoId)) throw new Error('Esta operação já está em processamento.');
    pendentes.add(operacaoId);
    try {
        const caminho = ref(db, `turmas/${contexto.turmaId}`);
        const inicial = await get(caminho);
        if (!inicial.exists()) throw new Error('Turma inválida ou removida.');
        conferirContexto(contexto);
        const timestamp = serverTimestamp();
        let falha;
        const resultado = await runTransaction(caminho, atual => {
            falha = null;
            try {
                conferirContexto(contexto);
                // O SDK pode começar com cache vazio; null força confronto com o servidor.
                if (atual === null) return null;
                if (atual.ativo === false) throw new Error('Turma inválida ou inativa.');
                if (atual.historico?.[operacaoId]) return atual; // retry idempotente
                const turma = structuredClone(atual);
                const registro = {
                    id: operacaoId, turmaId: contexto.turmaId, turmaNome: turma.nome || 'Não informado',
                    executadoPor: contexto.executadoPor, professoresResponsaveis: professoresResponsaveis(turma),
                    timestamp, versao: 1
                };
                modificar(turma, registro);
                turma.historico = { ...turma.historico, [operacaoId]: registro };
                return turma;
            } catch (error) { falha = error; return undefined; }
        }, { applyLocally: false });
        if (!resultado.committed || !resultado.snapshot.val()?.historico?.[operacaoId]) throw falha || new Error('Operação não confirmada. A turma pode ter sido removida.');
        return resultado.snapshot.val().historico[operacaoId];
    } finally { pendentes.delete(operacaoId); }
}

function saldoMovimentavel(material) {
    const g = obterQuantidadeEmGramas(material);
    if (!Number.isSafeInteger(g)) throw new Error('Este saldo legado possui fração menor que 1 g ou excede o limite. Preserve o registro e revise-o antes de movimentar.');
    return g;
}

export function aplicarMovimentacao(turma, registro, pedido) {
    const { tipo, itens, motivo = '', observacao = '' } = pedido;
    if (!['ENTRADA', 'SAIDA', 'MOINHO'].includes(tipo)) throw new Error('Tipo de movimentação inválido.');
    if (!Array.isArray(itens) || !itens.length) throw new Error('Adicione pelo menos um material.');
    if (tipo === 'SAIDA' && !motivo) throw new Error('Selecione o motivo da saída.');
    const consolidados = new Map();
    for (const item of itens) {
        if (!item.materialId) throw new Error('Selecione o material.');
        const gramas = converterParaGramas(item.quantidade, item.unidade);
        const grupo = consolidados.get(item.materialId) || { materialId: item.materialId, quantidadeGramas: 0, informados: [] };
        grupo.quantidadeGramas += gramas;
        if (!Number.isSafeInteger(grupo.quantidadeGramas)) throw new Error('Quantidade acima do limite.');
        grupo.informados.push({ quantidade: String(item.quantidade).trim(), unidade: item.unidade });
        consolidados.set(item.materialId, grupo);
    }
    const movimentos = [...consolidados.values()].map(item => {
        const material = turma.materiais?.[item.materialId];
        if (!material) throw new Error('Material inexistente ou removido. Atualize a lista.');
        const anterior = saldoMovimentavel(material);
        const resultante = anterior + (tipo === 'ENTRADA' ? 1 : -1) * item.quantidadeGramas;
        if (resultante < 0) throw new Error(`Quantidade insuficiente em estoque. Disponível: ${formatarQuantidade(anterior)} (${material.nome || item.materialId}).`);
        if (!Number.isSafeInteger(resultante)) throw new Error('Saldo acima do limite.');
        return { ...item, materialNome: material.nome || 'Não informado', estoqueAnteriorGramas: anterior, estoqueResultanteGramas: resultante };
    });
    if (tipo === 'MOINHO') {
        const moinho = turma.moinho || { materiais: [], capacidadeMax: 900, historico: [] };
        const atuais = Object.values(moinho.materiais || {});
        const total = atuais.reduce((s, m) => s + pesoMoinhoEmGramas(m), 0) + movimentos.reduce((s, m) => s + m.quantidadeGramas, 0);
        const capacidade = moinho.capacidadeGramas ?? Number(moinho.capacidadeMax || 900) * 1000000;
        if (total > capacidade) throw new Error('Capacidade do moinho excedida.');
        moinho.materiais = [...atuais, ...movimentos.map(item => ({
            id: `${registro.id}-${item.materialId}`, operacaoId: registro.id, materialId: item.materialId,
            material: item.materialNome, codigo: turma.materiais[item.materialId].codigo || '',
            fornecedor: turma.materiais[item.materialId].fornecedor || '',
            pesoGramas: item.quantidadeGramas, peso: item.quantidadeGramas / 1000000,
            turmaId: registro.turmaId, timestamp: registro.timestamp,
            editadoPor: registro.executadoPor.nome, editadoPorUid: registro.executadoPor.uid
        }))];
        moinho.operacoes = { ...moinho.operacoes, [registro.id]: { ...registro, tipo, origem: 'moinho', acao: pedido.acao || 'Moagem', observacao, itens: movimentos } };
        turma.moinho = moinho;
    }
    // Só modifica saldos após validar TODOS os itens e capacidade.
    for (const item of movimentos) {
        Object.assign(turma.materiais[item.materialId], { quantidadeGramas: item.estoqueResultanteGramas, quantidade: item.estoqueResultanteGramas / 1000 });
    }
    Object.assign(registro, { tipo, origem: tipo === 'MOINHO' ? 'moinho' : 'manual', motivo, observacao, acao: pedido.acao || '', itens: movimentos });
}

export function movimentarEstoque(contexto, pedido, id = crypto.randomUUID()) {
    return transacionarEstoque(contexto, id, (turma, registro) => aplicarMovimentacao(turma, registro, pedido));
}

export async function salvarCadastroMaterial(contexto, dados, id, operacaoId = crypto.randomUUID()) {
    const novo = !id;
    const materialId = id || crypto.randomUUID();
    await transacionarEstoque(contexto, operacaoId, (turma, registro) => {
        if (!dados.nome?.trim() || !dados.codigo?.trim()) throw new Error('Informe código e nome.');
        const minimo = converterParaGramas(dados.estoqueMinimo ?? '0', dados.unidadeMinimo || 'kg', true);
        const atual = turma.materiais?.[materialId];
        if (!novo && !atual) throw new Error('Material inexistente ou removido.');
        const cadastro = {
            ...atual, id: materialId, turmaId: contexto.turmaId,
            nome: dados.nome, codigo: dados.codigo, categoria: dados.categoria || '', fornecedor: dados.fornecedor || '', estado: dados.estado || 'Bom',
            estoqueMinimoGramas: minimo, estoqueMinimo: minimo / 1000
        };
        if (novo) Object.assign(cadastro, { quantidade: 0, quantidadeGramas: 0, adicionadoPor: contexto.executadoPor.nome, adicionadoPorNome: contexto.executadoPor.nome, adicionadoPorUid: contexto.uid, adicionadoPorPerfil: contexto.executadoPor.role });
        turma.materiais = { ...turma.materiais, [materialId]: cadastro };
        Object.assign(registro, { tipo: 'CADASTRO', origem: 'manual', motivo: novo ? 'Cadastro de material' : 'Edição do cadastro', materialId, materialNome: dados.nome });
        if (novo) {
            converterParaGramas(dados.quantidade, dados.unidade || 'kg');
            aplicarMovimentacao(turma, registro, { tipo: 'ENTRADA', motivo: 'Cadastro inicial', itens: [{ materialId, quantidade: dados.quantidade, unidade: dados.unidade || 'kg' }] });
        }
    });
    return materialId;
}

export function movimentarLixeira(contexto, materialId, acao) {
    return transacionarEstoque(contexto, crypto.randomUUID(), (turma, registro) => {
        const restaurar = acao === 'restaurar';
        const origem = restaurar || acao === 'excluir' ? 'lixeira_materiais' : 'materiais';
        const material = turma[origem]?.[materialId];
        if (!material) throw new Error('Material inexistente ou removido.');
        Object.assign(registro, { tipo: 'CADASTRO', origem: 'manual', motivo: acao, materialId, materialNome: material.nome || 'Não informado', quantidadeGramas: obterQuantidadeEmGramas(material) });
        if (acao !== 'excluir') {
            const destino = restaurar ? 'materiais' : 'lixeira_materiais';
            if (turma[destino]?.[materialId]) throw new Error('Já existe material com esse identificador no destino.');
            turma[destino] = { ...turma[destino], [materialId]: { ...material } };
            if (!restaurar) turma[destino][materialId].dataExclusao = new Date().toLocaleString('pt-BR');
            else delete turma[destino][materialId].dataExclusao;
        }
        delete turma[origem][materialId];
    });
}

// Ações antigas do moinho são comparadas com a versão vista pelo usuário.
// Não sobrescrevem operação concorrente nem alteram o consumo já registrado.
export function salvarMoinhoCompativel(contexto, anterior, proximo) {
    return transacionarEstoque(contexto, crypto.randomUUID(), (turma, registro) => {
        const atual = turma.moinho || { materiais: [], capacidadeMax: 900, historico: [] };
        if (JSON.stringify(atual) !== JSON.stringify(anterior)) throw new Error('O moinho mudou. Atualize a tela antes de tentar novamente.');
        if (Number(proximo.capacidadeMax) !== Number(atual.capacidadeMax) && contexto.executadoPor.role !== 'professor') throw new Error('Somente professores podem editar a capacidade.');
        const itens = Object.values(proximo.materiais || {});
        for (const item of itens) {
            const velho = Object.values(atual.materiais || {}).find(m => m.id && m.id === item.id);
            if (velho?.materialId && (item.peso !== velho.peso || item.material !== velho.material)) throw new Error('O peso e material de um consumo registrado não podem ser reescritos. Registre uma nova operação.');
            if (!(pesoMoinhoEmGramas(item) > 0)) throw new Error('Peso inválido.');
        }
        const capacidade = Number(proximo.capacidadeMax) * 1000000;
        if (!Number.isFinite(capacidade) || capacidade <= 0 || itens.reduce((s, i) => s + pesoMoinhoEmGramas(i), 0) > capacidade) throw new Error('Capacidade do moinho inválida ou excedida.');
        turma.moinho = { ...atual, ...proximo, capacidadeGramas: capacidade };
        const anteriores = Object.values(atual.historico || {});
        const adicionados = Object.values(proximo.historico || {}).slice(anteriores.length);
        Object.assign(registro, {
            tipo: 'MOINHO', origem: 'moinho', motivo: adicionados[0]?.acao || 'Edição do moinho', observacao: 'Ação sobre o conteúdo do moinho; sem novo desconto do estoque.',
            itensMoinhoAntes: Object.values(atual.materiais || {}), itensMoinhoDepois: itens, capacidadeAnteriorGramas: Number(atual.capacidadeMax || 900) * 1000000, capacidadeResultanteGramas: capacidade
        });
    });
}
