import { db } from '../firebaseConfig.js';

import {
    isOnline,
    userExtraInfo
} from '../auth.js';

import {
    ref,
    get,
    set,
    update
} from "firebase/database";


let currentUserRole = null,
    currentUserGlobal = null,
    isUsingLocalData = false;


export function setUserData(
    user,
    role,
    localFlag
) {

    currentUserGlobal = user;

    currentUserRole = role;

    isUsingLocalData =
        localFlag || false;

}


// ============================================================
// TURMA ATUAL
// ============================================================

function obterTurmaId() {

    return (
        window.senaiTurmaAtualId ||
        localStorage.getItem('turmaAtualId') ||
        null
    );

}''


// ============================================================
// USUÁRIO ATUAL
// ============================================================

function obterEditorAtual() {

    const nome =
        userExtraInfo?.nome ||
        currentUserGlobal?.displayName ||
        currentUserGlobal?.email?.split('@')[0] ||
        'Usuário';

    const perfil =
        currentUserRole === 'professor'
            ? 'Professor'
            : currentUserRole === 'aluno'
                ? 'Aluno'
                : 'Usuário';

    return `${nome} - ${perfil}`;

}


// ============================================================
// DADOS LOCAIS
// ============================================================

let localData = {

    moinho: {

        materiais: [],

        capacidadeMax: null,

        historico: []

    }

};


// ============================================================
// BUSCAR MOINHO DA TURMA ATUAL
// ============================================================

async function getMoinho() {

    try {

        const turmaId = obterTurmaId() || '';


        if (
            isOnline &&
            !isUsingLocalData
        ) {

            const snapshot =
                await get(
                    ref(
                        db,
                        `estoqueGlobal/moinho`
                    )
                );


            if (
                snapshot.exists()
            ) {

                return snapshot.val();

            }

        }


        return (
            localData.moinho || {

                materiais: [],

                capacidadeMax: 900,

                historico: []

            }
        );


    } catch (error) {

        console.error(
            'Erro ao buscar moinho:',
            error
        );


        return (
            localData.moinho || {

                materiais: [],

                capacidadeMax: 900,

                historico: []

            }
        );

    }

}


// ============================================================
// SALVAR MOINHO DA TURMA ATUAL
// ============================================================

async function saveMoinho(
    data
) {

    try {

        const turmaId = obterTurmaId() || '';


        const dadosMoinho = {

            ...data,

            turmaId:
                turmaId

        };


        if (
            isOnline &&
            !isUsingLocalData
        ) {

            await set(
                ref(
                    db,
                    `estoqueGlobal/moinho`
                ),
                dadosMoinho
            );

        }


        localData.moinho =
            dadosMoinho;


    } catch (error) {

        console.error(
            'Erro ao salvar moinho:',
            error
        );

        localData.moinho =
            data;

        throw error;

    }

}


// ============================================================
// RENDERIZAR MOINHO
// ============================================================

export async function renderMoinho() {

    try {

        const turmaId = obterTurmaId() || '';


        const moinhoData =
            await getMoinho();


        const materiais =
            Array.isArray(
                moinhoData.materiais
            )

                ? moinhoData.materiais

                : [];


        const capacidadeMax =
            Number(
                moinhoData.capacidadeMax
            ) > 0

                ? Number(
                    moinhoData.capacidadeMax
                )

                : 900;


        const totalPeso =
            materiais.reduce(
                (
                    acc,
                    m
                ) =>
                    acc +
                    (
                        Number(
                            m.peso
                        ) || 0
                    ),
                0
            );


        const percent =
            Math.min(
                (
                    totalPeso /
                    capacidadeMax
                ) * 100,
                100
            );


        const moinhoCheio =
            totalPeso >=
            capacidadeMax;


        const capacidadeDisponivel =
            Math.max(
                capacidadeMax -
                totalPeso,
                0
            );


        // ====================================================
        // MATERIAIS DA MESMA TURMA
        // ====================================================

        let materiaisDisponiveis = [];


        try {

            const snapshot =
                await get(
                    ref(
                        db,
                        `estoqueGlobal/materiais`
                    )
                );


            if (
                snapshot.exists()
            ) {

                const data =
                    snapshot.val();


                materiaisDisponiveis =
                    Object.keys(
                        data
                    ).map(
                        key => ({

                            id:
                                key,

                            turmaId:
                                turmaId,

                            ...data[key]

                        })
                    );

            }

        } catch (e) {

            console.warn(
                'Erro ao buscar materiais da turma:',
                e
            );

        }


        const acoes = [

            'Moagem',

            'Separação',

            'Lavagem',

            'Secagem',

            'Extrusão',

            'Granulação',

            'Prensagem',

            'Injeção',

            'Reciclagem',

            'Outro'

        ];


        let html = `

            <div class="form-card">

                <!-- =================================================
                     CABEÇALHO DO STATUS
                ================================================== -->

                <div
                    style="
                        display:flex;
                        align-items:center;
                        justify-content:space-between;
                        gap:12px;
                        margin-bottom:12px;
                    "
                >

                    <div
                        class="form-title"
                        style="margin-bottom:0;"
                    >

                        <i class="fas fa-recycle"></i>

                        Status do Moinho

                    </div>


                    ${
                        currentUserRole === 'professor'

                            ? `

                                <button
                                    id="btnEditarCapacidadeMoinho"
                                    type="button"
                                    class="btn-edit"
                                    style="
                                        width:auto;
                                        min-width:auto;
                                        white-space:nowrap;
                                        padding:8px 11px;
                                    "
                                >

                                    <i class="fas fa-pen"></i>

                                    Editar capacidade

                                </button>

                              `

                            : ''
                    }

                </div>


                <!-- =================================================
                     STATUS
                ================================================== -->

                <div
                    style="
                        background:${
                            moinhoCheio
                                ? '#fef2f2'
                                : percent >= 90
                                    ? '#fef2f2'
                                    : percent >= 70
                                        ? '#fffbeb'
                                        : '#ecfdf5'
                        };

                        padding:20px;

                        border-radius:16px;

                        margin-bottom:20px;

                        border:2px solid ${
                            moinhoCheio
                                ? '#ef4444'
                                : percent >= 90
                                    ? '#ef4444'
                                    : percent >= 70
                                        ? '#f59e0b'
                                        : '#10b981'
                        };
                    "
                >

                    <div
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            flex-wrap:wrap;
                            gap:10px;
                        "
                    >

                        <div>

                            <div
                                style="
                                    font-size:36px;
                                    font-weight:800;
                                    color:#e2e8f0;
                                "
                            >

                                ${totalPeso} T

                            </div>


                            <div
                                style="
                                    color:#64748b;
                                    font-size:13px;
                                "
                            >

                                Capacidade:
                                ${capacidadeMax} T
                                |
                                Itens:
                                ${materiais.length}

                            </div>

                        </div>


                        <span
                            style="
                                font-size:13px;
                                font-weight:600;
                                color:${
                                    moinhoCheio
                                        ? '#dc2626'
                                        : percent >= 90
                                            ? '#dc2626'
                                            : percent >= 70
                                                ? '#d97706'
                                                : '#059669'
                                };
                            "
                        >

                            ${
                                moinhoCheio
                                    ? '⚠️ MOINHO CHEIO'
                                    : percent >= 90
                                        ? '⚠️ QUASE CHEIO'
                                        : percent >= 70
                                            ? '⚠️ ATENÇÃO'
                                            : '✅ NORMAL'
                            }

                        </span>

                    </div>


                    <div
                        style="
                            width:100%;
                            background:#e2e8f0;
                            border-radius:8px;
                            margin-top:12px;
                            overflow:hidden;
                            height:8px;
                        "
                    >

                        <div
                            style="
                                width:${Math.min(
                                    percent,
                                    100
                                )}%;

                                background:${
                                    moinhoCheio
                                        ? '#dc2626'
                                        : percent >= 90
                                            ? '#dc2626'
                                            : percent >= 70
                                                ? '#f59e0b'
                                                : '#10b981'
                                };

                                height:100%;

                                transition:width 0.5s;
                            "
                        ></div>

                    </div>


                    ${
                        moinhoCheio

                            ? `

                                <div
                                    style="
                                        margin-top:12px;
                                        padding:10px 12px;
                                        border-radius:8px;
                                        background:#29181b;
                                        border:1px solid #51272d;
                                        color:#f87171;
                                        font-size:11px;
                                        font-weight:700;
                                        text-align:center;
                                    "
                                >

                                    ⚠️ MOINHO CHEIO — capacidade máxima atingida!

                                </div>

                              `

                            : `

                                <div
                                    style="
                                        margin-top:12px;
                                        padding:10px 12px;
                                        border-radius:8px;
                                        background:#101c18;
                                        border:1px solid #214433;
                                        color:#86efac;
                                        font-size:11px;
                                        font-weight:700;
                                        text-align:center;
                                    "
                                >

                                    ✅ Capacidade disponível:
                                    ${capacidadeDisponivel.toFixed(3)} T

                                </div>

                              `
                    }

                </div>


                <!-- =================================================
                     ADICIONAR / DEVOLVER
                ================================================== -->

                <div
                    style="
                        display:grid;
                        grid-template-columns:1fr 1fr;
                        gap:20px;
                    "
                >

                    <div>

                        <div
                            class="form-title"
                            style="font-size:14px;"
                        >

                            <i class="fas fa-plus-circle"></i>

                            Adicionar ao Moinho

                        </div>


                        <div class="form-grid">

                            <div class="form-group">

                                <label>
                                    Material
                                </label>

                                <select
                                    id="newMoinhoMaterial"
                                >
                                    <option value="">Selecione um material</option>
                                    ${materiaisDisponiveis.map(m => `
                                        <option value="${m.id}" data-codigo="${m.codigo || ''}" data-fornecedor="${m.fornecedor || ''}" data-nome="${m.nome || m.material || ''}">
                                            ${m.codigo || '-'} - ${m.nome || m.material || 'Material'}${m.fornecedor ? ` - ${m.fornecedor}` : ''}
                                        </option>
                                    `).join('')}
                                </select>

                            </div>


                            <div class="form-group">

                                <label>
                                    Peso (T)
                                </label>

                                <input
                                    type="number"
                                    id="newMoinhoPeso"
                                    step="0.001"
                                    min="0"
                                    placeholder="0.000"
                                >

                            </div>

                        </div>


                        <button
                            id="btnAddMoinho"
                            type="button"
                            class="btn-primary"
                            style="width:100%;"
                        >

                            <i class="fas fa-plus"></i>

                            Adicionar

                        </button>

                    </div>


                    <div>

                        <div
                            class="form-title"
                            style="font-size:14px;"
                        >

                            <i class="fas fa-undo"></i>

                            Devolver Material Específico

                        </div>


                        <div class="form-grid">

                            <div class="form-group">

                                <label>
                                    Material para Devolver
                                </label>


                                <select
                                    id="devolverMaterialSelect"
                                >

                                    <option value="">

                                        Selecione um material...

                                    </option>


                                    ${
                                        materiaisDisponiveis
                                            .filter(
                                                m =>
                                                    Number(
                                                        m.quantidade
                                                    ) > 0
                                            )
                                            .map(
                                                m => `

                                                <option
                                                    value="${m.id}"
                                                    data-nome="${m.nome || ''}"
                                                    data-fornecedor="${m.fornecedor || ''}"
                                                    data-qtd="${m.quantidade || 0}"
                                                    data-codigo="${m.codigo || ''}"
                                                    data-categoria="${m.categoria || ''}"
                                                >

                                                    ${m.codigo || '-'}
                                                    -
                                                    ${m.nome || 'Material'}
                                                    (${m.quantidade || 0} kg)
                                                    ${
                                                        m.fornecedor
                                                            ? '- ' + m.fornecedor
                                                            : ''
                                                    }

                                                </option>

                                            `
                                            )
                                            .join('')
                                    }

                                </select>

                            </div>


                            <div class="form-group">

                                <label>
                                    Quantidade a Devolver (T)
                                </label>

                                <input
                                    type="number"
                                    id="devolverQuantidade"
                                    step="0.001"
                                    min="0"
                                    placeholder="0.000"
                                >

                            </div>

                        </div>


                        <button
                            id="btnDevolverMoinho"
                            type="button"
                            class="btn-primary"
                            style="
                                width:auto;
                                min-width:190px;
                                display:block;
                                margin:0 auto;
                            "
                        >

                            <i class="fas fa-undo"></i>

                            Devolver ao Moinho

                        </button>

                    </div>

                </div>


                <!-- =================================================
                     AÇÕES DO MOINHO
                ================================================== -->

                <div
                    style="margin-top:16px;"
                >

                    <div
                        class="form-title"
                        style="font-size:14px;"
                    >

                        <i class="fas fa-tasks"></i>

                        Ações do Moinho

                    </div>


                    <div class="form-grid">

                        <div class="form-group">

                            <label>
                                Escrever Ação
                            </label>

                            <input
                                type="text"
                                id="acaoMoinhoInput"
                                placeholder="Digite a ação..."
                            >

                        </div>


                        <div class="form-group">

                            <label>
                                Selecionar
                            </label>


                            <select
                                id="acaoMoinhoSelect"
                            >

                                <option value="">
                                    Selecione...
                                </option>

                                ${
                                    acoes
                                        .map(
                                            a =>
                                                `<option value="${a}">${a}</option>`
                                        )
                                        .join('')
                                }

                            </select>

                        </div>

                    </div>


                    <div
                        style="
                            display:flex;
                            gap:8px;
                            flex-wrap:wrap;
                            margin-top:8px;
                        "
                    >

                        <button
                            id="btnProcessarMoinho"
                            type="button"
                            class="btn-warning"
                        >

                            <i class="fas fa-industry"></i>

                            Processar Todos

                        </button>


                        <button
                            id="btnLimparMoinho"
                            type="button"
                            class="btn-danger"
                        >

                            <i class="fas fa-trash"></i>

                            Limpar

                        </button>


                        <button
                            id="btnRegistrarAcao"
                            type="button"
                            class="btn-primary"
                        >

                            <i class="fas fa-check"></i>

                            Registrar Ação

                        </button>

                    </div>

                </div>

            </div>


            <!-- =================================================
                 MATERIAIS NO MOINHO
            ================================================== -->

            <div class="form-card">

                <div class="form-title">

                    <i class="fas fa-list"></i>

                    Materiais no Moinho
                    (${materiais.length})

                </div>


                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>Código</th>

                                <th>Material</th>

                                <th>Peso (T)</th>

                                <th>Fornecedor</th>

                                <th>Data</th>

                                <th>Ações</th>

                            </tr>

                        </thead>


                        <tbody id="moinhoTableBody">

                            ${
                                materiais
                                    .map(
                                        (
                                            m,
                                            index
                                        ) => `

                                        <tr
                                            data-material="${(
                                                m.material || ''
                                            ).toLowerCase()}"

                                            data-codigo="${(
                                                m.codigo || ''
                                            ).toLowerCase()}"

                                            data-fornecedor="${(
                                                m.fornecedor || ''
                                            ).toLowerCase()}"
                                        >

                                            <td>

                                                <strong>
                                                    ${m.codigo || '-'}
                                                </strong>

                                            </td>


                                            <td>
                                                ${m.material || '-'}
                                            </td>


                                            <td>
                                                ${m.peso || 0}
                                            </td>


                                            <td>
                                                ${m.fornecedor || '-'}
                                            </td>


                                            <td>
                                                ${m.data || '-'}
                                            </td>


                                            <td>

                                                <button
                                                    type="button"
                                                    class="btn-edit edit-moinho-item"
                                                    data-index="${index}"
                                                    data-id="${m.id || ''}"
                                                    data-nome="${m.material || ''}"
                                                    data-codigo="${m.codigo || ''}"
                                                    data-peso="${m.peso || 0}"
                                                    data-fornecedor="${m.fornecedor || ''}"
                                                >

                                                    <i class="fas fa-edit"></i>

                                                </button>


                                                <button
                                                    type="button"
                                                    class="btn-danger remove-moinho-item"
                                                    data-index="${index}"
                                                    data-id="${m.id || ''}"
                                                    data-nome="${m.material || ''}"
                                                >

                                                    <i class="fas fa-trash"></i>

                                                </button>

                                            </td>

                                        </tr>

                                    `
                                    )
                                    .join('')
                            }


                            ${
                                materiais.length === 0

                                    ? `

                                        <tr>

                                            <td colspan="6">

                                                Nenhum material

                                            </td>

                                        </tr>

                                    `

                                    : ''
                            }

                        </tbody>

                    </table>

                </div>

            </div>


            <!-- =================================================
                 HISTÓRICO
            ================================================== -->

            <div class="form-card">

                <div class="form-title">

                    <i class="fas fa-history"></i>

                    Histórico do Moinho

                </div>


                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>Data</th>

                                <th>Ação</th>

                                <th>Material</th>

                                <th>Peso (T)</th>

                                <th>Detalhes</th>

                                <th>Editado por</th>

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                (
                                    moinhoData.historico ||
                                    []
                                )
                                    .slice(
                                        -50
                                    )
                                    .reverse()
                                    .map(
                                        h => `

                                        <tr>

                                            <td>

                                                ${
                                                    h.data ||
                                                    new Date()
                                                        .toLocaleString(
                                                            'pt-BR'
                                                        )
                                                }

                                            </td>


                                            <td>

                                                <span
                                                    class="${
                                                        h.tipo === 'entrada'

                                                            ? 'text-success'

                                                            : h.tipo === 'saida'

                                                                ? 'text-danger'

                                                                : 'text-warning'
                                                    }"
                                                >

                                                    ${
                                                        h.tipo === 'entrada'

                                                            ? '➕ Entrada'

                                                            : h.tipo === 'saida'

                                                                ? '➖ Saída'

                                                                : '📋 Ação'
                                                    }

                                                </span>

                                            </td>


                                            <td>

                                                ${h.material || '-'}

                                            </td>


                                            <td>

                                                ${h.peso || 0}

                                            </td>


                                            <td>

                                                ${h.acao || '-'}

                                            </td>


                                            <td>

                                                ${
                                                    h.editadoPor ||
                                                    h.usuarioNome ||
                                                    h.nomeUsuario ||
                                                    '-'
                                                }

                                            </td>

                                        </tr>

                                    `
                                    )
                                    .join('')
                            }


                            ${
                                !(
                                    moinhoData.historico ||
                                    []
                                ).length

                                    ? `

                                        <tr>

                                            <td colspan="6">

                                                Nenhum registro

                                            </td>

                                        </tr>

                                    `

                                    : ''
                            }

                        </tbody>

                    </table>

                </div>

            </div>


            <!-- =================================================
                 MATERIAIS DISPONÍVEIS
            ================================================== -->

            <div class="form-card">

                <div class="form-title">

                    <i class="fas fa-boxes"></i>

                    Materiais Disponíveis para Devolução

                </div>


                <div class="filter-bar">

                    <input
                        type="text"
                        id="filterDisponiveis"
                        placeholder="🔍 Buscar por nome, código ou fornecedor..."
                    >

                </div>


                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>Código</th>

                                <th>Nome</th>

                                <th>Qtd (kg)</th>

                                <th>Fornecedor</th>

                                <th>Categoria</th>

                                <th>Disponível</th>

                            </tr>

                        </thead>


                        <tbody id="disponiveisTableBody">

                            ${
                                materiaisDisponiveis
                                    .map(
                                        m => `

                                        <tr
                                            data-nome="${(
                                                m.nome || ''
                                            ).toLowerCase()}"

                                            data-codigo="${(
                                                m.codigo || ''
                                            ).toLowerCase()}"

                                            data-fornecedor="${(
                                                m.fornecedor || ''
                                            ).toLowerCase()}"
                                        >

                                            <td>

                                                <strong>
                                                    ${m.codigo || '-'}
                                                </strong>

                                            </td>


                                            <td>

                                                ${m.nome || '-'}

                                            </td>


                                            <td>

                                                ${m.quantidade || 0}

                                            </td>


                                            <td>

                                                ${m.fornecedor || '-'}

                                            </td>


                                            <td>

                                                ${m.categoria || '-'}

                                            </td>


                                            <td>

                                                <span
                                                    class="${
                                                        Number(
                                                            m.quantidade
                                                        ) > 0

                                                            ? 'text-success'

                                                            : 'text-danger'
                                                    }"
                                                >

                                                    ${
                                                        Number(
                                                            m.quantidade
                                                        ) > 0

                                                            ? '✅ Disponível'

                                                            : '❌ Indisponível'
                                                    }

                                                </span>

                                            </td>

                                        </tr>

                                    `
                                    )
                                    .join('')
                            }


                            ${
                                materiaisDisponiveis.length === 0

                                    ? `

                                        <tr>

                                            <td colspan="6">

                                                Nenhum material

                                            </td>

                                        </tr>

                                    `

                                    : ''
                            }

                        </tbody>

                    </table>

                </div>

            </div>

        `;


        document.getElementById(
            'tabMoinho'
        ).innerHTML = html;


        // ====================================================
        // EDITAR CAPACIDADE MÁXIMA
        // ====================================================

        document
            .getElementById(
                'btnEditarCapacidadeMoinho'
            )
            ?.addEventListener(
                'click',
                async () => {

                    if (
                        currentUserRole !==
                        'professor'
                    ) {

                        alert(
                            '⚠️ Somente professores podem editar a capacidade do moinho.'
                        );

                        return;

                    }


                    const novaCapacidade =
                        prompt(
                            `Capacidade atual: ${capacidadeMax} T\n\nDigite a nova capacidade máxima do moinho:`
                        );


                    if (
                        novaCapacidade ===
                        null
                    ) {

                        return;

                    }


                    const valor =
                        parseFloat(
                            novaCapacidade
                        );


                    if (
                        isNaN(valor) ||
                        valor <= 0
                    ) {

                        alert(
                            '❌ Informe uma capacidade válida maior que zero.'
                        );

                        return;

                    }


                    if (
                        valor < totalPeso
                    ) {

                        alert(
                            `❌ A nova capacidade não pode ser menor que o peso atual do moinho (${totalPeso} T).`
                        );

                        return;

                    }


                    try {

                        await saveMoinho({

                            materiais:
                                materiais,

                            capacidadeMax:
                                valor,

                            historico:
                                moinhoData.historico || [],

                            turmaId:
                                turmaId

                        });


                        alert(
                            `✅ Capacidade máxima alterada para ${valor} T.`
                        );


                        await renderMoinho();


                    } catch (error) {

                        console.error(
                            'Erro ao editar capacidade:',
                            error
                        );


                        alert(
                            '❌ Não foi possível alterar a capacidade do moinho.'
                        );

                    }

                }
            );


        // ====================================================
        // FILTRO DOS MATERIAIS DISPONÍVEIS
        // ====================================================

        document
            .getElementById(
                'filterDisponiveis'
            )
            ?.addEventListener(
                'input',
                function () {

                    const search =
                        this.value
                            .toLowerCase()
                            .trim();


                    document
                        .querySelectorAll(
                            '#disponiveisTableBody tr'
                        )
                        .forEach(
                            row => {

                                const nome =
                                    row.dataset.nome ||
                                    '';

                                const codigo =
                                    row.dataset.codigo ||
                                    '';

                                const fornecedor =
                                    row.dataset.fornecedor ||
                                    '';


                                row.style.display =

                                    (
                                        nome.includes(
                                            search
                                        ) ||

                                        codigo.includes(
                                            search
                                        ) ||

                                        fornecedor.includes(
                                            search
                                        )
                                    )

                                        ? ''

                                        : 'none';

                            }
                        );

                }
            );


        // ====================================================
        // SELEÇÃO DE AÇÃO
        // ====================================================

        document
            .getElementById(
                'acaoMoinhoInput'
            )
            ?.addEventListener(
                'input',
                function () {

                    if (
                        this.value
                    ) {

                        document
                            .getElementById(
                                'acaoMoinhoSelect'
                            )
                            .value = '';

                    }

                }
            );


        document
            .getElementById(
                'acaoMoinhoSelect'
            )
            ?.addEventListener(
                'change',
                function () {

                    if (
                        this.value
                    ) {

                        document
                            .getElementById(
                                'acaoMoinhoInput'
                            )
                            .value =
                                this.value;

                    }

                }
            );


        // ====================================================
        // ADICIONAR AO MOINHO
        // ====================================================

        document
            .getElementById(
                'btnAddMoinho'
            )
            ?.addEventListener(
                'click',
                async () => {

                    try {

                        const materialSelect = document.getElementById('newMoinhoMaterial');
                        const materialOption = materialSelect?.selectedOptions?.[0];
                        const materialId = materialSelect?.value?.trim() || '';
                        const material = materialOption?.dataset?.nome?.trim() || '';
                        const codigo = materialOption?.dataset?.codigo?.trim() || '';


                        const peso =
                            parseFloat(
                                document
                                    .getElementById(
                                        'newMoinhoPeso'
                                    )
                                    ?.value
                            );


                        const fornecedor =
                            materialOption?.dataset?.fornecedor?.trim() || '';


                        if (!materialId || !material) {

                            alert(
                                '⚠️ Informe o material.'
                            );

                            return;

                        }


                        if (
                            isNaN(peso) ||
                            peso <= 0
                        ) {

                            alert(
                                '⚠️ Informe um peso válido maior que zero.'
                            );

                            return;

                        }


                        if (
                            totalPeso +
                            peso >
                            capacidadeMax
                        ) {

                            alert(
                                `❌ Capacidade excedida!\n\nDisponível: ${capacidadeDisponivel.toFixed(3)} T`
                            );

                            return;

                        }


                        const acaoInput =
                            document
                                .getElementById(
                                    'acaoMoinhoInput'
                                )
                                ?.value
                                .trim() ||
                            '';


                        const acao =
                            acaoInput ||
                            'Adição manual';


                        const editor =
                            obterEditorAtual();


                        const agora =
                            new Date()
                                .toLocaleString(
                                    'pt-BR'
                                );


                        const novoItem = {

                            codigo:
                                codigo,

                            material:
                                material,

                            peso:
                                peso,

                            fornecedor:
                                fornecedor,

                            data:
                                agora,

                            turmaId:
                                turmaId,

                            editadoPor:
                                editor,

                            editadoPorUid:
                                currentUserGlobal?.uid ||
                                ''

                        };


                        const novosMateriais =
                            [

                                ...materiais,

                                novoItem

                            ];


                        const novoHistorico =
                            [

                                ...(moinhoData.historico || []),

                                {

                                    tipo:
                                        'entrada',

                                    material:
                                        material,

                                    peso:
                                        peso,

                                    data:
                                        agora,

                                    acao:
                                        acao,

                                    turmaId:
                                        turmaId,

                                    editadoPor:
                                        editor,

                                    editadoPorUid:
                                        currentUserGlobal?.uid ||
                                        ''

                                }

                            ];


                        await saveMoinho({

                            materiais:
                                novosMateriais,

                            capacidadeMax:
                                capacidadeMax,

                            historico:
                                novoHistorico,

                            turmaId:
                                turmaId

                        });


                        alert(
                            '✅ Adicionado ao moinho!'
                        );


                        document
                            .getElementById(
                                'newMoinhoCodigo'
                            )
                            .value = '';


                        document.getElementById('newMoinhoMaterial').value = '';


                        document
                            .getElementById(
                                'newMoinhoPeso'
                            )
                            .value = '';


                        document
                            .getElementById(
                                'newMoinhoFornecedor'
                            )
                            .value = '';


                        document
                            .getElementById(
                                'acaoMoinhoInput'
                            )
                            .value = '';


                        document
                            .getElementById(
                                'acaoMoinhoSelect'
                            )
                            .value = '';


                        await renderMoinho();

                    } catch (error) {

                        console.error(
                            '❌ Erro ao adicionar ao moinho:',
                            error
                        );


                        alert(
                            '❌ Não foi possível adicionar ao moinho:\n\n' +
                            error.message
                        );

                    }

                }
            );


        // ====================================================
        // EDITAR ITEM DO MOINHO
        // ====================================================

        document
            .querySelectorAll(
                '.edit-moinho-item'
            )
            .forEach(
                btn => {

                    btn.addEventListener(
                        'click',
                        function () {

                            const index =
                                parseInt(
                                    this.dataset.index
                                );


                            const nome =
                                this.dataset.nome || '';


                            const codigo =
                                this.dataset.codigo || '';


                            const peso =
                                this.dataset.peso || '0';


                            const fornecedor =
                                this.dataset.fornecedor || '';


                            document.getElementById(
                                'modalTitle'
                            ).innerHTML =
                                '<i class="fas fa-edit"></i> Editar Item do Moinho';


                            document.getElementById(
                                'modalBody'
                            ).innerHTML = `

                                <div class="form-group">

                                    <label>
                                        Código
                                    </label>

                                    <input
                                        type="text"
                                        id="editMoinhoCodigo"
                                        value="${codigo}"
                                    >

                                </div>


                                <div class="form-group">

                                    <label>
                                        Material
                                    </label>

                                    <input
                                        type="text"
                                        id="editMoinhoMaterial"
                                        value="${nome}"
                                    >

                                </div>


                                <div class="form-group">

                                    <label>
                                        Peso (T)
                                    </label>

                                    <input
                                        type="number"
                                        id="editMoinhoPeso"
                                        step="0.001"
                                        min="0"
                                        value="${peso}"
                                    >

                                </div>


                                <div class="form-group">

                                    <label>
                                        Fornecedor
                                    </label>

                                    <input
                                        type="text"
                                        id="editMoinhoFornecedor"
                                        value="${fornecedor}"
                                    >

                                </div>

                            `;


                            document.getElementById(
                                'editModal'
                            ).style.display =
                                'block';


                            document.getElementById(
                                'saveModalBtn'
                            ).onclick =
                                async () => {

                                    try {

                                        const newCodigo =
                                            document
                                                .getElementById(
                                                    'editMoinhoCodigo'
                                                )
                                                .value
                                                .trim();


                                        const newMaterial =
                                            document
                                                .getElementById(
                                                    'editMoinhoMaterial'
                                                )
                                                .value
                                                .trim();


                                        const newPeso =
                                            parseFloat(
                                                document
                                                    .getElementById(
                                                        'editMoinhoPeso'
                                                    )
                                                    .value
                                            );


                                        const newFornecedor =
                                            document
                                                .getElementById(
                                                    'editMoinhoFornecedor'
                                                )
                                                .value
                                                .trim();


                                        if (
                                            !newMaterial ||
                                            isNaN(newPeso) ||
                                            newPeso <= 0
                                        ) {

                                            alert(
                                                'Preencha material e peso válido!'
                                            );

                                            return;

                                        }


                                        const pesoDosOutros =
                                            materiais.reduce(
                                                (
                                                    acc,
                                                    m,
                                                    i
                                                ) =>
                                                    acc +
                                                    (
                                                        i === index
                                                            ? 0
                                                            : Number(
                                                                m.peso
                                                            ) || 0
                                                    ),
                                                0
                                            );


                                        if (
                                            pesoDosOutros +
                                            newPeso >
                                            capacidadeMax
                                        ) {

                                            alert(
                                                `❌ O novo peso ultrapassa a capacidade máxima do moinho (${capacidadeMax} T).`
                                            );

                                            return;

                                        }


                                        const editor =
                                            obterEditorAtual();


                                        const novosMateriais =
                                            [
                                                ...materiais
                                            ];


                                        novosMateriais[index] =
                                            {

                                                ...novosMateriais[index],

                                                codigo:
                                                    newCodigo,

                                                material:
                                                    newMaterial,

                                                peso:
                                                    newPeso,

                                                fornecedor:
                                                    newFornecedor,

                                                turmaId:
                                                    turmaId,

                                                editadoPor:
                                                    editor,

                                                editadoPorUid:
                                                    currentUserGlobal?.uid ||
                                                    ''

                                            };


                                        await saveMoinho({

                                            materiais:
                                                novosMateriais,

                                            capacidadeMax:
                                                capacidadeMax,

                                            historico:
                                                moinhoData.historico ||
                                                [],

                                            turmaId:
                                                turmaId

                                        });


                                        alert(
                                            '✅ Item atualizado!'
                                        );


                                        document.getElementById(
                                            'editModal'
                                        ).style.display =
                                            'none';


                                        await renderMoinho();

                                    } catch (error) {

                                        console.error(
                                            '❌ Erro ao editar item:',
                                            error
                                        );


                                        alert(
                                            '❌ Não foi possível atualizar o item:\n\n' +
                                            error.message
                                        );

                                    }

                                };

                        }
                    );

                }
            );


        // ====================================================
        // REMOVER ITEM DO MOINHO
        // ====================================================

        document
            .querySelectorAll(
                '.remove-moinho-item'
            )
            .forEach(
                btn => {

                    btn.addEventListener(
                        'click',
                        async () => {

                            const index =
                                parseInt(
                                    btn.dataset.index
                                );


                            const nome =
                                btn.dataset.nome ||
                                'Material';


                            if (
                                confirm(
                                    `Remover "${nome}" do moinho?`
                                )
                            ) {

                                try {

                                    const editor =
                                        obterEditorAtual();


                                    const agora =
                                        new Date()
                                            .toLocaleString(
                                                'pt-BR'
                                            );


                                    const itemRemovido =
                                        materiais[index];


                                    const novosMateriais =
                                        materiais.filter(
                                            (
                                                _,
                                                i
                                            ) =>
                                                i !==
                                                index
                                        );


                                    const novoHistorico =
                                        [

                                            ...(moinhoData.historico || []),

                                            {

                                                tipo:
                                                    'saida',

                                                material:
                                                    itemRemovido?.material ||
                                                    nome,

                                                peso:
                                                    Number(
                                                        itemRemovido?.peso ||
                                                        0
                                                    ),

                                                data:
                                                    agora,

                                                acao:
                                                    'Remoção manual',

                                                turmaId:
                                                    turmaId,

                                                editadoPor:
                                                    editor,

                                                editadoPorUid:
                                                    currentUserGlobal?.uid ||
                                                    ''

                                            }

                                        ];


                                    await saveMoinho({

                                        materiais:
                                            novosMateriais,

                                        capacidadeMax:
                                            capacidadeMax,

                                        historico:
                                            novoHistorico,

                                        turmaId:
                                            turmaId

                                    });


                                    alert(
                                        '✅ Item removido do moinho!'
                                    );


                                    await renderMoinho();

                                } catch (error) {

                                    console.error(
                                        '❌ Erro ao remover item:',
                                        error
                                    );


                                    alert(
                                        '❌ Não foi possível remover o item:\n\n' +
                                        error.message
                                    );

                                }

                            }

                        }
                    );

                }
            );


        // ====================================================
        // DEVOLVER MATERIAL AO MOINHO
        // ====================================================

        document
            .getElementById(
                'btnDevolverMoinho'
            )
            ?.addEventListener(
                'click',
                async () => {

                    try {

                        const select =
                            document.getElementById(
                                'devolverMaterialSelect'
                            );


                        const quantidade =
                            parseFloat(
                                document
                                    .getElementById(
                                        'devolverQuantidade'
                                    )
                                    .value
                            );


                        if (
                            !select?.value
                        ) {

                            alert(
                                '⚠️ Selecione um material para devolver!'
                            );

                            return;

                        }


                        if (
                            !quantidade ||
                            quantidade <= 0
                        ) {

                            alert(
                                '⚠️ Informe uma quantidade válida!'
                            );

                            return;

                        }


                        const opt =
                            select.options[
                                select.selectedIndex
                            ];


                        const nome =
                            opt.dataset.nome ||
                            'Material';


                        const fornecedor =
                            opt.dataset.fornecedor ||
                            '';


                        const qtdDisponivel =
                            parseFloat(
                                opt.dataset.qtd
                            );


                        if (
                            quantidade >
                            qtdDisponivel
                        ) {

                            alert(
                                `⚠️ Quantidade indisponível! Disponível: ${qtdDisponivel} kg`
                            );

                            return;

                        }


                        if (
                            totalPeso +
                            quantidade >
                            capacidadeMax
                        ) {

                            alert(
                                `⚠️ Capacidade do moinho excedida! Disponível: ${capacidadeDisponivel.toFixed(3)} T`
                            );

                            return;

                        }


                        const acaoInput =
                            document
                                .getElementById(
                                    'acaoMoinhoInput'
                                )
                                ?.value
                                .trim() ||
                            '';


                        const acao =
                            acaoInput ||
                            'Devolução de material';


                        const editor =
                            obterEditorAtual();


                        const agora =
                            new Date()
                                .toLocaleString(
                                    'pt-BR'
                                );


                        const materialRef =
                            ref(
                                db,
                                `estoqueGlobal/materiais/${select.value}`
                            );


                        const snapshot =
                            await get(
                                materialRef
                            );


                        if (
                            snapshot.exists()
                        ) {

                            const data =
                                snapshot.val();


                            await update(
                                materialRef,
                                {

                                    quantidade:
                                        Number(
                                            data.quantidade ||
                                            0
                                        ) -
                                        quantidade

                                }
                            );

                        }


                        const novoItem = {

                            codigo:
                                opt.dataset.codigo ||
                                select.value,

                            material:
                                nome,

                            peso:
                                quantidade,

                            fornecedor:
                                fornecedor,

                            data:
                                agora,

                            turmaId:
                                turmaId,

                            editadoPor:
                                editor,

                            editadoPorUid:
                                currentUserGlobal?.uid ||
                                ''

                        };


                        const novosMateriais =
                            [

                                ...materiais,

                                novoItem

                            ];


                        const novoHistorico =
                            [

                                ...(moinhoData.historico || []),

                                {

                                    tipo:
                                        'entrada',

                                    material:
                                        nome,

                                    peso:
                                        quantidade,

                                    data:
                                        agora,

                                    acao:
                                        acao,

                                    turmaId:
                                        turmaId,

                                    editadoPor:
                                        editor,

                                    editadoPorUid:
                                        currentUserGlobal?.uid ||
                                        ''

                                }

                            ];


                        await saveMoinho({

                            materiais:
                                novosMateriais,

                            capacidadeMax:
                                capacidadeMax,

                            historico:
                                novoHistorico,

                            turmaId:
                                turmaId

                        });


                        alert(
                            `✅ Material "${nome}" devolvido ao moinho!`
                        );


                        await renderMoinho();

                    } catch (error) {

                        console.error(
                            '❌ Erro ao devolver material:',
                            error
                        );


                        alert(
                            '❌ Não foi possível devolver o material:\n\n' +
                            error.message
                        );

                    }

                }
            );


        // ====================================================
        // REGISTRAR AÇÃO
        // ====================================================

        document
            .getElementById(
                'btnRegistrarAcao'
            )
            ?.addEventListener(
                'click',
                async () => {

                    try {

                        const acao =
                            document
                                .getElementById(
                                    'acaoMoinhoInput'
                                )
                                .value
                                .trim();


                        if (
                            !acao
                        ) {

                            alert(
                                'Digite ou selecione uma ação!'
                            );

                            return;

                        }


                        if (
                            materiais.length ===
                            0
                        ) {

                            alert(
                                'Moinho vazio!'
                            );

                            return;

                        }


                        const editor =
                            obterEditorAtual();


                        const agora =
                            new Date()
                                .toLocaleString(
                                    'pt-BR'
                                );


                        const novoHistorico =
                            [
                                ...(moinhoData.historico || [])
                            ];


                        materiais.forEach(
                            m => {

                                novoHistorico.push({

                                    tipo:
                                        'acao',

                                    material:
                                        m.material,

                                    peso:
                                        m.peso,

                                    data:
                                        agora,

                                    acao:
                                        acao,

                                    turmaId:
                                        turmaId,

                                    editadoPor:
                                        editor,

                                    editadoPorUid:
                                        currentUserGlobal?.uid ||
                                        ''

                                });

                            }
                        );


                        await saveMoinho({

                            materiais:
                                materiais,

                            capacidadeMax:
                                capacidadeMax,

                            historico:
                                novoHistorico,

                            turmaId:
                                turmaId

                        });


                        alert(
                            `✅ Ação "${acao}" registrada!`
                        );


                        document
                            .getElementById(
                                'acaoMoinhoInput'
                            )
                            .value = '';


                        document
                            .getElementById(
                                'acaoMoinhoSelect'
                            )
                            .value = '';


                        await renderMoinho();

                    } catch (error) {

                        console.error(
                            '❌ Erro ao registrar ação:',
                            error
                        );


                        alert(
                            '❌ Não foi possível registrar a ação:\n\n' +
                            error.message
                        );

                    }

                }
            );


        // ====================================================
        // PROCESSAR MOINHO
        // ====================================================

        document
            .getElementById(
                'btnProcessarMoinho'
            )
            ?.addEventListener(
                'click',
                async () => {

                    try {

                        if (
                            materiais.length ===
                            0
                        ) {

                            alert(
                                'Moinho vazio!'
                            );

                            return;

                        }


                        const acaoInput =
                            document
                                .getElementById(
                                    'acaoMoinhoInput'
                                )
                                ?.value
                                .trim() ||
                            '';


                        const acao =
                            acaoInput ||
                            'Processamento';


                        if (
                            confirm(
                                `Processar ${materiais.length} itens (${totalPeso} T)?`
                            )
                        ) {

                            const editor =
                                obterEditorAtual();


                            const agora =
                                new Date()
                                    .toLocaleString(
                                        'pt-BR'
                                    );


                            const novoHistorico =
                                [
                                    ...(moinhoData.historico || [])
                                ];


                            materiais.forEach(
                                m => {

                                    novoHistorico.push({

                                        tipo:
                                            'saida',

                                        material:
                                            m.material,

                                        peso:
                                            m.peso,

                                        data:
                                            agora,

                                        acao:
                                            acao,

                                        turmaId:
                                            turmaId,

                                        editadoPor:
                                            editor,

                                        editadoPorUid:
                                            currentUserGlobal?.uid ||
                                            ''

                                    });

                                }
                            );


                            await saveMoinho({

                                materiais:
                                    [],

                                capacidadeMax:
                                    capacidadeMax,

                                historico:
                                    novoHistorico,

                                turmaId:
                                    turmaId

                            });


                            alert(
                                '✅ Moinho processado!'
                            );


                            await renderMoinho();

                        }

                    } catch (error) {

                        console.error(
                            '❌ Erro ao processar moinho:',
                            error
                        );


                        alert(
                            '❌ Não foi possível processar o moinho:\n\n' +
                            error.message
                        );

                    }

                }
            );


        // ====================================================
        // LIMPAR MOINHO
        // ====================================================

        document
            .getElementById(
                'btnLimparMoinho'
            )
            ?.addEventListener(
                'click',
                async () => {

                    try {

                        if (
                            materiais.length ===
                            0
                        ) {

                            alert(
                                'Moinho vazio!'
                            );

                            return;

                        }


                        if (
                            confirm(
                                'Limpar moinho?'
                            )
                        ) {

                            const editor =
                                obterEditorAtual();


                            const agora =
                                new Date()
                                    .toLocaleString(
                                        'pt-BR'
                                    );


                            const novoHistorico =
                                [

                                    ...(moinhoData.historico || []),

                                    {

                                        tipo:
                                            'saida',

                                        material:
                                            'Todos os materiais',

                                        peso:
                                            totalPeso,

                                        data:
                                            agora,

                                        acao:
                                            'Limpeza do moinho',

                                        turmaId:
                                            turmaId,

                                        editadoPor:
                                            editor,

                                        editadoPorUid:
                                            currentUserGlobal?.uid ||
                                            ''

                                    }

                                ];


                            await saveMoinho({

                                materiais:
                                    [],

                                capacidadeMax:
                                    capacidadeMax,

                                historico:
                                    novoHistorico,

                                turmaId:
                                    turmaId

                            });


                            alert(
                                '✅ Moinho limpo!'
                            );


                            await renderMoinho();

                        }

                    } catch (error) {

                        console.error(
                            '❌ Erro ao limpar moinho:',
                            error
                        );


                        alert(
                            '❌ Não foi possível limpar o moinho:\n\n' +
                            error.message
                        );

                    }

                }
            );

    } catch (error) {

        console.error(
            'Erro ao renderizar moinho:',
            error
        );


        document.getElementById(
            'tabMoinho'
        ).innerHTML =
            '<p style="color:#ef4444;">Erro ao carregar moinho.</p>';

    }

}