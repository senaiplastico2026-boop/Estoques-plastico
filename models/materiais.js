import { db } from '../firebaseConfig.js';

import {
    isOnline,
    userExtraInfo
} from '../auth.js';

import {
    ref,
    get,
    set,
    push,
    update,
    remove
} from "firebase/database";

import {
    renderMoinho
} from './moinho.js';


// ============================================================
// USUÁRIO ATUAL
// ============================================================

let currentUserRole = null;
let currentUserGlobal = null;
let isUsingLocalData = false;


// ============================================================
// DEFINIR DADOS DO USUÁRIO
// ============================================================

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

}


// ============================================================
// USUÁRIO / EDITOR
// ============================================================

function obterNomeUsuario() {

    return (
        userExtraInfo?.nome ||
        currentUserGlobal?.displayName ||
        currentUserGlobal?.email?.split('@')[0] ||
        'Usuário'
    );

}


function obterPerfilUsuario() {

    if (
        currentUserRole === 'professor'
    ) {

        return 'Professor';

    }


    if (
        currentUserRole === 'aluno'
    ) {

        return 'Aluno';

    }


    return 'Usuário';

}


function obterAdicionadoPor() {

    const nome =
        obterNomeUsuario();

    const perfil =
        obterPerfilUsuario();

    return {

        nome,

        perfil,

        uid:
            currentUserGlobal?.uid || '',

        texto:
            `${nome} - ${perfil}`

    };

}


// ============================================================
// ATUALIZAR MOINHO APÓS ALTERAÇÃO DOS MATERIAIS
// ============================================================

async function atualizarMoinhoAposAlteracaoMaterial() {

    try {

        await renderMoinho();

    } catch (error) {

        console.warn(
            '⚠️ Não foi possível atualizar o Moinho automaticamente:',
            error
        );

    }

}


// ============================================================
// CAMINHO DOS MATERIAIS
// ============================================================

function obterCaminhoMateriais() { return 'estoqueGlobal/materiais'; }


// ============================================================
// CAMINHO DA LIXEIRA
// ============================================================

function obterCaminhoLixeira() { return 'estoqueGlobal/lixeira_materiais'; }


// ============================================================
// DADOS LOCAIS
// ============================================================

let localData = {

    materiais: [],

    lixeira: []

};


// ============================================================
// BUSCAR MATERIAIS
// ============================================================

async function getMateriais() {

    try {

        const turmaId = obterTurmaId() || '';


        if (
            isOnline &&
            !isUsingLocalData
        ) {

            const caminho =
                obterCaminhoMateriais();


            if (!caminho) {

                return [];

            }


            const snapshot =
                await get(
                    ref(
                        db,
                        caminho
                    )
                );


            if (
                snapshot.exists()
            ) {

                const data =
                    snapshot.val();


                return Object.keys(
                    data
                ).map(
                    key => ({

                        id: key,

                        turmaId:

                            data[key]?.turmaId ||
                            turmaId,

                        ...data[key]

                    })
                );

            }

        }


        return (
            localData.materiais || []
        );


    } catch (error) {

        console.error(
            '❌ Erro ao buscar materiais:',
            error
        );


        return (
            localData.materiais || []
        );

    }

}


// ============================================================
// BUSCAR LIXEIRA
// ============================================================

async function getLixeira() {

    try {

        const turmaId = obterTurmaId() || '';


        if (
            isOnline &&
            !isUsingLocalData
        ) {

            const caminho =
                obterCaminhoLixeira();


            if (!caminho) {

                return [];

            }


            const snapshot =
                await get(
                    ref(
                        db,
                        caminho
                    )
                );


            if (
                snapshot.exists()
            ) {

                const data =
                    snapshot.val();


                return Object.keys(
                    data
                ).map(
                    key => ({

                        id: key,

                        turmaId:

                            data[key]?.turmaId ||
                            turmaId,

                        ...data[key]

                    })
                );

            }

        }


        return (
            localData.lixeira || []
        );


    } catch (error) {

        console.warn(
            '⚠️ Erro ao buscar lixeira:',
            error
        );


        return (
            localData.lixeira || []
        );

    }

}


// ============================================================
// SALVAR MATERIAL
// ============================================================

async function saveMaterial(
    data,
    id = null
) {

    try {

        const turmaId = obterTurmaId() || '';

        const caminho =
            obterCaminhoMateriais();




        // ========================================================
        // EDITAR MATERIAL
        // ========================================================

        if (id) {

            const materialRef =
                ref(
                    db,
                    `${caminho}/${id}`
                );


            const atualizacao = {

                ...data,

                id,

                turmaId: turmaId || null

            };


            if (
                isOnline &&
                !isUsingLocalData
            ) {

                await update(
                    materialRef,
                    atualizacao
                );

            }


            const index =
                localData.materiais.findIndex(
                    material =>
                        String(material.id) ===
                        String(id)
                );


            if (
                index >= 0
            ) {

                localData.materiais[index] = {

                    ...localData.materiais[index],

                    ...atualizacao

                };

            }


            return id;

        }


        // ========================================================
        // NOVO MATERIAL
        // ========================================================

        const novoRef =
            push(
                ref(
                    db,
                    caminho
                )
            );


        const adicionador =
            obterAdicionadoPor();


        const novoMaterial = {

            ...data,

            id:
                novoRef.key,

            turmaId,

            adicionadoPor:
                adicionador.texto,

            adicionadoPorNome:
                adicionador.nome,

            adicionadoPorPerfil:
                adicionador.perfil,

            adicionadoPorUid:
                adicionador.uid,

            adicionadoEm:
                new Date()
                    .toLocaleString(
                        'pt-BR'
                    )

        };


        if (
            isOnline &&
            !isUsingLocalData
        ) {

            await set(
                novoRef,
                novoMaterial
            );

        }


        localData.materiais.push(
            novoMaterial
        );


        return novoRef.key;


    } catch (error) {

        console.error(
            '❌ Erro ao salvar material:',
            error
        );


        throw error;

    }

}


// ============================================================
// EXCLUIR MATERIAL
// ============================================================

async function deleteMaterial(
    id
) {

    try {

        const turmaId = obterTurmaId() || '';

        const materialRef =
            ref(
                db,
                `estoqueGlobal/materiais/${id}`
            );


        const lixeiraRef =
            ref(
                db,
                `estoqueGlobal/lixeira_materiais/${id}`
            );


        if (
            isOnline &&
            !isUsingLocalData
        ) {

            const snapshot =
                await get(
                    materialRef
                );


            if (
                !snapshot.exists()
            ) {

                return {

                    success: false,

                    error:
                        'Material não encontrado.'

                };

            }


            const materialData =
                snapshot.val();


            await set(
                lixeiraRef,
                {

                    ...materialData,

                    dataExclusao:
                        new Date()
                            .toLocaleString(
                                'pt-BR'
                            )

                }
            );


            await remove(
                materialRef
            );

        } else {

            const index =
                localData.materiais.findIndex(
                    material =>
                        String(material.id) ===
                        String(id)
                );


            if (
                index === -1
            ) {

                return {

                    success: false,

                    error:
                        'Material não encontrado.'

                };

            }


            const materialData =
                localData.materiais[index];


            localData.materiais.splice(
                index,
                1
            );


            localData.lixeira.push({

                ...materialData,

                dataExclusao:
                    new Date()
                        .toLocaleString(
                            'pt-BR'
                        )

            });

        }


        return {

            success: true

        };


    } catch (error) {

        console.error(
            '❌ Erro ao remover material:',
            error
        );


        return {

            success: false,

            error:
                error.message

        };

    }

}


// ============================================================
// RESTAURAR MATERIAL
// ============================================================

async function restaurarMaterialHandler(
    id
) {

    try {

        const turmaId = obterTurmaId() || '';

        if (
            isOnline &&
            !isUsingLocalData
        ) {

            const lixeiraRef =
                ref(
                    db,
                    `estoqueGlobal/lixeira_materiais/${id}`
                );


            const snapshot =
                await get(
                    lixeiraRef
                );


            if (
                !snapshot.exists()
            ) {

                return {

                    success: false,

                    error:
                        'Material não encontrado na lixeira.'

                };

            }


            const data =
                snapshot.val();


            delete data.dataExclusao;


            await set(
                ref(
                    db,
                    `estoqueGlobal/materiais/${id}`
                ),
                {

                    ...data,

                    id,

                    turmaId

                }
            );


            await remove(
                lixeiraRef
            );


            return {

                success: true

            };

        }


        const index =
            localData.lixeira.findIndex(
                material =>
                    String(material.id) ===
                    String(id)
            );


        if (
            index !== -1
        ) {

            const data =
                localData.lixeira[index];


            delete data.dataExclusao;


            localData.materiais.push({

                ...data,

                id,

                turmaId

            });


            localData.lixeira.splice(
                index,
                1
            );


            return {

                success: true

            };

        }


        return {

            success: false,

            error:
                'Material não encontrado na lixeira.'

        };


    } catch (error) {

        console.error(
            '❌ Erro ao restaurar material:',
            error
        );


        return {

            success: false,

            error:
                error.message

        };

    }

}


// ============================================================
// DELETAR PERMANENTEMENTE
// ============================================================

async function deletarPermanentemente(
    id
) {

    try {

        const turmaId = obterTurmaId() || '';

        if (
            isOnline &&
            !isUsingLocalData
        ) {

            await remove(
                ref(
                    db,
                    `estoqueGlobal/lixeira_materiais/${id}`
                )
            );

        } else {

            localData.lixeira =
                localData.lixeira.filter(
                    material =>
                        String(material.id) !==
                        String(id)
                );

        }


        return {

            success: true

        };


    } catch (error) {

        console.error(
            '❌ Erro ao deletar permanentemente:',
            error
        );


        return {

            success: false,

            error:
                error.message

        };

    }

}


// ============================================================
// RENDERIZAR MATERIAIS
// ============================================================

export async function renderMateriais() {

    try {

        const turmaId = obterTurmaId() || '';


        const materiaisList =
            await getMateriais();


        const lixeiraList =
            await getLixeira();


        let html = `

            <!-- ==================================================
                 CADASTRAR MATERIAL
            =================================================== -->

            <div class="form-card">

                <div class="form-title">

                    <i class="fas fa-plus-circle"></i>

                    Cadastrar Material

                </div>


                <div class="form-grid">

                    <div class="form-group">

                        <label>
                            Código
                        </label>

                        <input
                            type="text"
                            id="newMaterialCodigo"
                            placeholder="PP001"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Nome
                        </label>

                        <input
                            type="text"
                            id="newMaterialNome"
                            placeholder="Nome"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Quantidade (kg)
                        </label>

                        <input
                            type="number"
                            id="newMaterialQuantidade"
                            step="any"
                            min="0"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Categoria
                        </label>

                        <input
                            type="text"
                            id="newMaterialCategoria"
                            placeholder="Categoria"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Fornecedor
                        </label>

                        <input
                            type="text"
                            id="newMaterialFornecedor"
                            placeholder="Fornecedor"
                        >

                    </div>


                    <div class="form-group">

                        <label>
                            Estado
                        </label>

                        <select
                            id="newMaterialEstado"
                        >

                            <option value="Ótimo">
                                Ótimo
                            </option>

                            <option
                                value="Bom"
                                selected
                            >
                                Bom
                            </option>

                            <option value="Regular">
                                Regular
                            </option>

                            <option value="Ruim">
                                Ruim
                            </option>

                        </select>

                    </div>


                    <div class="form-group">

                        <label>
                            Estoque Mínimo (kg)
                        </label>

                        <input
                            type="number"
                            id="newMaterialEstoqueMinimo"
                            step="any"
                            min="0"
                        >

                    </div>

                </div>


                <button
                    id="btnAddMaterial"
                    class="btn-primary"
                    type="button"
                >

                    <i class="fas fa-plus"></i>

                    Cadastrar

                </button>

            </div>


            <!-- ==================================================
                 FILTROS
            =================================================== -->

            <div class="form-card">

                <div class="form-title">

                    <i class="fas fa-search"></i>

                    Filtros

                </div>


                <div class="filter-bar">

                    <input
                        type="text"
                        id="searchMaterialInput"
                        placeholder="Buscar..."
                    >


                    <input
                        type="text"
                        id="filterCategoriaInput"
                        placeholder="Categoria..."
                    >


                    <button
                        id="clearFiltersBtn"
                        class="btn-warning"
                        type="button"
                        style="
                            width:auto;
                            padding:8px 16px;
                        "
                    >

                        Limpar

                    </button>

                </div>

            </div>


            <!-- ==================================================
                 MATERIAIS
            =================================================== -->

            <div class="form-card">

                <div
                    class="form-header"
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        margin-bottom:16px;
                    "
                >

                    <h3
                        style="
                            font-size:16px;
                            font-weight:600;
                            margin:0;
                        "
                    >

                        Materiais
                        (${materiaisList.length})

                    </h3>


                    <button
                        id="btnVerLixeira"
                        class="btn-warning btn-small-action"
                        type="button"
                    >

                        <i class="fas fa-trash"></i>

                        Lixeira
                        (${lixeiraList.length})

                    </button>

                </div>


                <div class="table-container">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Código
                                </th>

                                <th>
                                    Nome
                                </th>

                                <th>
                                    Qtd
                                </th>

                                <th>
                                    Categoria
                                </th>

                                <th>
                                    Fornecedor
                                </th>

                                <th>
                                    Estado
                                </th>

                                <th>
                                    Est. Mín
                                </th>

                                <th>
                                    Adicionado por
                                </th>

                                <th>
                                    Ações
                                </th>

                            </tr>

                        </thead>


                        <tbody
                            id="materiaisTableBody"
                        >

                            ${
                                materiaisList
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

                                            data-categoria="${(
                                                m.categoria || ''
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
                                                ${m.categoria || '-'}
                                            </td>


                                            <td>
                                                ${m.fornecedor || '-'}
                                            </td>


                                            <td>
                                                ${m.estado || 'Bom'}
                                            </td>


                                            <td>
                                                ${m.estoqueMinimo || '-'}
                                            </td>


                                            <td>

                                                <strong>
                                                    ${
                                                        m.adicionadoPor ||
                                                        (
                                                            m.adicionadoPorNome
                                                                ? `${m.adicionadoPorNome} - ${m.adicionadoPorPerfil || ''}`
                                                                : '-'
                                                        )
                                                    }
                                                </strong>

                                            </td>


                                            <td>

                                                <button
                                                    class="btn-edit edit-material"
                                                    type="button"
                                                    data-id="${m.id}"
                                                    data-nome="${m.nome || ''}"
                                                    data-codigo="${m.codigo || ''}"
                                                    data-quantidade="${m.quantidade || 0}"
                                                    data-categoria="${m.categoria || ''}"
                                                    data-fornecedor="${m.fornecedor || ''}"
                                                    data-estado="${m.estado || 'Bom'}"
                                                    data-estoqueminimo="${m.estoqueMinimo || 0}"
                                                >

                                                    <i class="fas fa-edit"></i>

                                                </button>


                                                <button
                                                    class="btn-danger remove-material"
                                                    type="button"
                                                    data-id="${m.id}"
                                                    data-nome="${m.nome || ''}"
                                                >

                                                    <i class="fas fa-trash"></i>

                                                </button>

                                            </td>

                                        </tr>

                                    `
                                    )
                                    .join('')
                                    ||

                                    `
                                        <tr>

                                            <td
                                                colspan="9"
                                                style="
                                                    text-align:center;
                                                    padding:20px;
                                                "
                                            >

                                                Nenhum material

                                            </td>

                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>

            </div>


            <!-- ==================================================
                 LIXEIRA
            =================================================== -->

            <div
                id="lixeiraContainer"
                style="display:none;"
            >

                <div class="form-card">

                    <div
                        class="form-header"
                        style="
                            display:flex;
                            justify-content:space-between;
                            align-items:center;
                            margin-bottom:16px;
                        "
                    >

                        <h3
                            style="
                                font-size:16px;
                                font-weight:600;
                                margin:0;
                            "
                        >

                            <i class="fas fa-trash"></i>

                            Lixeira
                            (${lixeiraList.length})

                        </h3>


                        <div
                            style="
                                display:flex;
                                gap:8px;
                            "
                        >

                            <button
                                id="btnRestaurarSelecionados"
                                class="btn-success btn-small-action"
                                type="button"
                                style="display:none;"
                            >

                                <i class="fas fa-undo"></i>

                                Restaurar Selecionados

                            </button>


                            <button
                                id="btnDeletarSelecionados"
                                class="btn-danger btn-small-action"
                                type="button"
                                style="display:none;"
                            >

                                <i class="fas fa-trash"></i>

                                Deletar Selecionados

                            </button>


                            <button
                                id="btnFecharLixeira"
                                class="btn-cancel btn-small-action"
                                type="button"
                            >

                                <i class="fas fa-times"></i>

                                Fechar

                            </button>

                        </div>

                    </div>


                    <div
                        style="
                            margin-bottom:12px;
                        "
                    >

                        <label
                            style="
                                cursor:pointer;
                                font-size:13px;
                            "
                        >

                            <input
                                type="checkbox"
                                id="selecionarTodosLixeira"
                            >

                            Selecionar Todos

                        </label>

                    </div>


                    <div class="table-container">

                        <table>

                            <thead>

                                <tr>

                                    <th
                                        style="width:30px;"
                                    >

                                        <input
                                            type="checkbox"
                                            id="selectAllLixeira"
                                        >

                                    </th>

                                    <th>
                                        Código
                                    </th>

                                    <th>
                                        Nome
                                    </th>

                                    <th>
                                        Qtd
                                    </th>

                                    <th>
                                        Categoria
                                    </th>

                                    <th>
                                        Fornecedor
                                    </th>

                                    <th>
                                        Data Exclusão
                                    </th>

                                    <th>
                                        Ações
                                    </th>

                                </tr>

                            </thead>


                            <tbody
                                id="lixeiraTableBody"
                            >

                                ${
                                    lixeiraList
                                        .map(
                                            m => `

                                            <tr>

                                                <td>

                                                    <input
                                                        type="checkbox"
                                                        class="lixeira-checkbox"
                                                        data-id="${m.id}"
                                                    >

                                                </td>


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
                                                    ${m.categoria || '-'}
                                                </td>


                                                <td>
                                                    ${m.fornecedor || '-'}
                                                </td>


                                                <td>
                                                    ${m.dataExclusao || '-'}
                                                </td>


                                                <td>

                                                    <button
                                                        class="btn-success btn-small-action restaurar-material"
                                                        type="button"
                                                        data-id="${m.id}"
                                                        data-nome="${m.nome || ''}"
                                                    >

                                                        <i class="fas fa-undo"></i>

                                                        Restaurar

                                                    </button>


                                                    <button
                                                        class="btn-danger btn-small-action deletar-permanente"
                                                        type="button"
                                                        data-id="${m.id}"
                                                        data-nome="${m.nome || ''}"
                                                    >

                                                        <i class="fas fa-trash"></i>

                                                        Deletar

                                                    </button>

                                                </td>

                                            </tr>

                                        `
                                        )
                                        .join('')
                                        ||

                                        `
                                            <tr>

                                                <td
                                                    colspan="8"
                                                    style="
                                                        text-align:center;
                                                        padding:20px;
                                                    "
                                                >

                                                    Lixeira vazia

                                                </td>

                                            </tr>
                                        `
                                }

                            </tbody>

                        </table>

                    </div>

                </div>

            </div>

        `;


        document.getElementById(
            'tabMateriais'
        ).innerHTML = html;


        // ========================================================
        // FILTROS
        // ========================================================

        function aplicarFiltros() {

            const search =
                document
                    .getElementById(
                        'searchMaterialInput'
                    )
                    ?.value
                    .toLowerCase()
                    .trim() || '';


            const categoria =
                document
                    .getElementById(
                        'filterCategoriaInput'
                    )
                    ?.value
                    .toLowerCase()
                    .trim() || '';


            document
                .querySelectorAll(
                    '#materiaisTableBody tr'
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


                        const cat =
                            row.dataset.categoria ||
                            '';


                        const encontrouBusca =

                            nome.includes(
                                search
                            ) ||

                            codigo.includes(
                                search
                            ) ||

                            fornecedor.includes(
                                search
                            );


                        const encontrouCategoria =

                            !categoria ||

                            cat.includes(
                                categoria
                            );


                        row.style.display =

                            encontrouBusca &&
                            encontrouCategoria

                                ? ''

                                : 'none';

                    }
                );

        }


        document
            .getElementById(
                'searchMaterialInput'
            )
            ?.addEventListener(
                'input',
                aplicarFiltros
            );


        document
            .getElementById(
                'filterCategoriaInput'
            )
            ?.addEventListener(
                'input',
                aplicarFiltros
            );


        document
            .getElementById(
                'clearFiltersBtn'
            )
            ?.addEventListener(
                'click',
                () => {

                    document.getElementById(
                        'searchMaterialInput'
                    ).value = '';


                    document.getElementById(
                        'filterCategoriaInput'
                    ).value = '';


                    aplicarFiltros();

                }
            );


        // ========================================================
        // ABRIR LIXEIRA
        // ========================================================

        document
            .getElementById(
                'btnVerLixeira'
            )
            ?.addEventListener(
                'click',
                () => {

                    const container =
                        document.getElementById(
                            'lixeiraContainer'
                        );


                    container.style.display =

                        container.style.display ===
                        'none'

                            ? 'block'

                            : 'none';


                    document.getElementById(
                        'btnRestaurarSelecionados'
                    ).style.display =
                        'none';


                    document.getElementById(
                        'btnDeletarSelecionados'
                    ).style.display =
                        'none';

                }
            );


        // ========================================================
        // FECHAR LIXEIRA
        // ========================================================

        document
            .getElementById(
                'btnFecharLixeira'
            )
            ?.addEventListener(
                'click',
                () => {

                    document.getElementById(
                        'lixeiraContainer'
                    ).style.display =
                        'none';

                }
            );


        // ========================================================
        // SELECIONAR TODOS
        // ========================================================

        document
            .getElementById(
                'selectAllLixeira'
            )
            ?.addEventListener(
                'change',
                function () {

                    const checkboxes =
                        document.querySelectorAll(
                            '.lixeira-checkbox'
                        );


                    checkboxes.forEach(
                        checkbox => {

                            checkbox.checked =
                                this.checked;

                        }
                    );


                    const outro =
                        document.getElementById(
                            'selecionarTodosLixeira'
                        );


                    if (outro) {

                        outro.checked =
                            this.checked;

                    }


                    toggleBotoesLixeira();

                }
            );


        document
            .getElementById(
                'selecionarTodosLixeira'
            )
            ?.addEventListener(
                'change',
                function () {

                    const checkboxes =
                        document.querySelectorAll(
                            '.lixeira-checkbox'
                        );


                    checkboxes.forEach(
                        checkbox => {

                            checkbox.checked =
                                this.checked;

                        }
                    );


                    const selectAll =
                        document.getElementById(
                            'selectAllLixeira'
                        );


                    if (selectAll) {

                        selectAll.checked =
                            this.checked;

                    }


                    toggleBotoesLixeira();

                }
            );


        document
            .querySelectorAll(
                '.lixeira-checkbox'
            )
            .forEach(
                checkbox => {

                    checkbox.addEventListener(
                        'change',
                        toggleBotoesLixeira
                    );

                }
            );


        function toggleBotoesLixeira() {

            const selecionados =
                document.querySelectorAll(
                    '.lixeira-checkbox:checked'
                );


            const btnRestaurar =
                document.getElementById(
                    'btnRestaurarSelecionados'
                );


            const btnDeletar =
                document.getElementById(
                    'btnDeletarSelecionados'
                );


            if (
                selecionados.length > 0
            ) {

                btnRestaurar.style.display =
                    'inline-flex';


                btnDeletar.style.display =
                    'inline-flex';

            } else {

                btnRestaurar.style.display =
                    'none';


                btnDeletar.style.display =
                    'none';

            }

        }


        // ========================================================
        // RESTAURAR SELECIONADOS
        // ========================================================

        document
            .getElementById(
                'btnRestaurarSelecionados'
            )
            ?.addEventListener(
                'click',
                async () => {

                    const checkboxes =
                        document.querySelectorAll(
                            '.lixeira-checkbox:checked'
                        );


                    const ids =
                        Array.from(
                            checkboxes
                        ).map(
                            checkbox =>
                                checkbox.dataset.id
                        );


                    if (
                        ids.length === 0
                    ) {

                        return;

                    }


                    if (
                        confirm(
                            `Restaurar ${ids.length} item(ns)?`
                        )
                    ) {

                        for (
                            const id of ids
                        ) {

                            await restaurarMaterialHandler(
                                id
                            );

                        }


                        alert(
                            `✅ ${ids.length} item(ns) restaurados!`
                        );


                        await renderMateriais();


                        await atualizarMoinhoAposAlteracaoMaterial();

                    }

                }
            );


        // ========================================================
        // DELETAR SELECIONADOS
        // ========================================================

        document
            .getElementById(
                'btnDeletarSelecionados'
            )
            ?.addEventListener(
                'click',
                async () => {

                    const checkboxes =
                        document.querySelectorAll(
                            '.lixeira-checkbox:checked'
                        );


                    const ids =
                        Array.from(
                            checkboxes
                        ).map(
                            checkbox =>
                                checkbox.dataset.id
                        );


                    if (
                        ids.length === 0
                    ) {

                        return;

                    }


                    if (
                        confirm(
                            `⚠️ Deletar permanentemente ${ids.length} item(ns)?`
                        )
                    ) {

                        for (
                            const id of ids
                        ) {

                            await deletarPermanentemente(
                                id
                            );

                        }


                        alert(
                            `✅ ${ids.length} item(ns) deletados permanentemente!`
                        );


                        await renderMateriais();

                    }

                }
            );


        // ========================================================
        // BOTÃO CADASTRAR
        // ========================================================

        document
            .getElementById(
                'btnAddMaterial'
            )
            ?.addEventListener(
                'click',
                addMaterial
            );


        // ========================================================
        // BOTÕES EDITAR
        // ========================================================

        document
            .querySelectorAll(
                '.edit-material'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        () => {

                            openEditMaterialModal(

                                button.dataset.id,

                                button.dataset.nome,

                                button.dataset.codigo,

                                button.dataset.quantidade,

                                button.dataset.categoria,

                                button.dataset.fornecedor,

                                button.dataset.estado,

                                button.dataset.estoqueminimo

                            );

                        }
                    );

                }
            );


        // ========================================================
        // BOTÕES EXCLUIR
        // ========================================================

        document
            .querySelectorAll(
                '.remove-material'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        async () => {

                            const nome =
                                button.dataset.nome;


                            if (
                                confirm(
                                    `Mover "${nome}" para a lixeira?`
                                )
                            ) {

                                const result =
                                    await deleteMaterial(
                                        button.dataset.id
                                    );


                                if (
                                    result.success
                                ) {

                                    alert(
                                        `✅ Material "${nome}" movido para a lixeira!`
                                    );


                                    await renderMateriais();


                                    await atualizarMoinhoAposAlteracaoMaterial();

                                } else {

                                    alert(
                                        '❌ ' +
                                        result.error
                                    );

                                }

                            }

                        }
                    );

                }
            );


        // ========================================================
        // RESTAURAR
        // ========================================================

        document
            .querySelectorAll(
                '.restaurar-material'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        async () => {

                            const nome =
                                button.dataset.nome;


                            const result =
                                await restaurarMaterialHandler(
                                    button.dataset.id
                                );


                            if (
                                result.success
                            ) {

                                alert(
                                    `✅ "${nome}" restaurado!`
                                );


                                await renderMateriais();


                                await atualizarMoinhoAposAlteracaoMaterial();

                            } else {

                                alert(
                                    '❌ ' +
                                    result.error
                                );

                            }

                        }
                    );

                }
            );


        // ========================================================
        // DELETAR PERMANENTEMENTE
        // ========================================================

        document
            .querySelectorAll(
                '.deletar-permanente'
            )
            .forEach(
                button => {

                    button.addEventListener(
                        'click',
                        async () => {

                            const nome =
                                button.dataset.nome;


                            if (
                                confirm(
                                    `⚠️ Deletar permanentemente "${nome}"?`
                                )
                            ) {

                                const result =
                                    await deletarPermanentemente(
                                        button.dataset.id
                                    );


                                if (
                                    result.success
                                ) {

                                    alert(
                                        `✅ "${nome}" deletado permanentemente!`
                                    );


                                    await renderMateriais();


                                    await atualizarMoinhoAposAlteracaoMaterial();

                                } else {

                                    alert(
                                        '❌ ' +
                                        result.error
                                    );

                                }

                            }

                        }
                    );

                }
            );


    } catch (error) {

        console.error(
            '❌ Erro ao renderizar materiais:',
            error
        );


        document.getElementById(
            'tabMateriais'
        ).innerHTML =

            `
                <p style="color:#ef4444;">
                    Erro ao carregar materiais.
                </p>
            `;

    }

}


// ============================================================
// ADICIONAR MATERIAL
// ============================================================

async function addMaterial() {

    try {

        const codigo =
            document
                .getElementById(
                    'newMaterialCodigo'
                )
                .value
                .trim();


        const nome =
            document
                .getElementById(
                    'newMaterialNome'
                )
                .value
                .trim();


        const quantidade =
            parseFloat(
                document
                    .getElementById(
                        'newMaterialQuantidade'
                    )
                    .value
            );


        const categoria =
            document
                .getElementById(
                    'newMaterialCategoria'
                )
                .value
                .trim();


        const fornecedor =
            document
                .getElementById(
                    'newMaterialFornecedor'
                )
                .value
                .trim();


        const estado =
            document
                .getElementById(
                    'newMaterialEstado'
                )
                .value;


        const estoqueMinimo =
            parseFloat(
                document
                    .getElementById(
                        'newMaterialEstoqueMinimo'
                    )
                    .value
            ) || 0;


        if (
            !codigo ||
            !nome ||
            isNaN(quantidade)
        ) {

            alert(
                'Preencha código, nome e quantidade!'
            );

            return;

        }


        if (
            quantidade < 0
        ) {

            alert(
                'A quantidade não pode ser negativa!'
            );

            return;

        }


        // ========================================================
        // SALVAR
        // ========================================================

        const novoId =
            await saveMaterial({

                codigo,

                nome,

                quantidade,

                categoria,

                fornecedor,

                estado,

                estoqueMinimo

            });


        // ========================================================
        // ATUALIZAR MATERIAIS
        // ========================================================

        await renderMateriais();


        // ========================================================
        // ATUALIZAR MOINHO
        // ========================================================

        await atualizarMoinhoAposAlteracaoMaterial();


        // ========================================================
        // SELECIONAR O MATERIAL RECÉM-CRIADO
        // ========================================================

        const select =
            document.getElementById(
                'devolverMaterialSelect'
            );


        if (
            select &&
            novoId
        ) {

            select.value =
                novoId;

        }


        alert(
            '✅ Material cadastrado!'
        );


        // ========================================================
        // LIMPAR CAMPOS
        // ========================================================

        document.getElementById(
            'newMaterialCodigo'
        ).value = '';


        document.getElementById(
            'newMaterialNome'
        ).value = '';


        document.getElementById(
            'newMaterialQuantidade'
        ).value = '';


        document.getElementById(
            'newMaterialCategoria'
        ).value = '';


        document.getElementById(
            'newMaterialFornecedor'
        ).value = '';


        document.getElementById(
            'newMaterialEstado'
        ).value = 'Bom';


        document.getElementById(
            'newMaterialEstoqueMinimo'
        ).value = '';


    } catch (error) {

        console.error(
            '❌ Erro ao adicionar material:',
            error
        );


        alert(
            '❌ Não foi possível cadastrar o material:\n\n' +
            error.message
        );

    }

}

// ============================================================
// MODAL DE EDIÇÃO
// ============================================================

function openEditMaterialModal(

    id,
    nome,
    codigo,
    quantidade,
    categoria,
    fornecedor,
    estado,
    estoqueMinimo

) {

    document.getElementById(
        'modalTitle'
    ).innerHTML =

        '<i class="fas fa-edit"></i> Editar Material';


    document.getElementById(
        'modalBody'
    ).innerHTML = `

        <div class="form-group">

            <label>
                Código
            </label>

            <input
                type="text"
                id="editMaterialCodigo"
                value="${codigo || ''}"
            >

        </div>


        <div class="form-group">

            <label>
                Nome
            </label>

            <input
                type="text"
                id="editMaterialNome"
                value="${nome || ''}"
            >

        </div>


        <div class="form-group">

            <label>
                Quantidade (kg)
            </label>

            <input
                type="number"
                id="editMaterialQuantidade"
                value="${quantidade || 0}"
                step="any"
                min="0"
            >

        </div>


        <div class="form-group">

            <label>
                Categoria
            </label>

            <input
                type="text"
                id="editMaterialCategoria"
                value="${categoria || ''}"
            >

        </div>


        <div class="form-group">

            <label>
                Fornecedor
            </label>

            <input
                type="text"
                id="editMaterialFornecedor"
                value="${fornecedor || ''}"
            >

        </div>


        <div class="form-group">

            <label>
                Estado
            </label>

            <select
                id="editMaterialEstado"
            >

                <option
                    value="Ótimo"
                    ${estado === 'Ótimo' ? 'selected' : ''}
                >
                    Ótimo
                </option>

                <option
                    value="Bom"
                    ${estado === 'Bom' ? 'selected' : ''}
                >
                    Bom
                </option>

                <option
                    value="Regular"
                    ${estado === 'Regular' ? 'selected' : ''}
                >
                    Regular
                </option>

                <option
                    value="Ruim"
                    ${estado === 'Ruim' ? 'selected' : ''}
                >
                    Ruim
                </option>

            </select>

        </div>


        <div class="form-group">

            <label>
                Estoque Mínimo (kg)
            </label>

            <input
                type="number"
                id="editMaterialEstoqueMinimo"
                value="${estoqueMinimo || 0}"
                step="any"
                min="0"
            >

        </div>

    `;


    document.getElementById(
        'editModal'
    ).style.display =
        'block';


    document.getElementById(
        'saveModalBtn'
    ).style.display =
        'inline-flex';


    document.getElementById(
        'saveModalBtn'
    ).onclick =
        async () => {

            try {

                const data = {

                    codigo:
                        document
                            .getElementById(
                                'editMaterialCodigo'
                            )
                            .value
                            .trim(),


                    nome:
                        document
                            .getElementById(
                                'editMaterialNome'
                            )
                            .value
                            .trim(),


                    quantidade:
                        parseFloat(
                            document
                                .getElementById(
                                    'editMaterialQuantidade'
                                )
                                .value
                        ),


                    categoria:
                        document
                            .getElementById(
                                'editMaterialCategoria'
                            )
                            .value
                            .trim(),


                    fornecedor:
                        document
                            .getElementById(
                                'editMaterialFornecedor'
                            )
                            .value
                            .trim(),


                    estado:
                        document
                            .getElementById(
                                'editMaterialEstado'
                            )
                            .value,


                    estoqueMinimo:
                        parseFloat(
                            document
                                .getElementById(
                                    'editMaterialEstoqueMinimo'
                                )
                                .value
                        ) || 0

                };


                if (
                    !data.codigo ||
                    !data.nome ||
                    isNaN(data.quantidade) ||
                    data.quantidade < 0
                ) {

                    alert(
                        'Preencha todos os campos corretamente.'
                    );

                    return;

                }


                // ================================================
                // SALVAR EDIÇÃO
                // ================================================

                await saveMaterial(
                    data,
                    id
                );


                // ================================================
                // FECHAR MODAL
                // ================================================

                document.getElementById(
                    'editModal'
                ).style.display =
                    'none';


                // ================================================
                // ATUALIZAR MATERIAIS
                // ================================================

                await renderMateriais();


                // ================================================
                // ATUALIZAR MOINHO
                // ================================================

                await atualizarMoinhoAposAlteracaoMaterial();


                alert(
                    '✅ Material atualizado!'
                );


            } catch (error) {

                console.error(
                    '❌ Erro ao atualizar material:',
                    error
                );


                alert(
                    '❌ Não foi possível atualizar o material:\n\n' +
                    error.message
                );

            }

        };

}