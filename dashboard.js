import { db } from './firebaseConfig.js';

import {
    userExtraInfo,
    isOnline
} from './auth.js';

import {
    ref,
    get
} from 'firebase/database';


let currentUserGlobal = null;
let currentUserRole = null;
let isUsingLocalData = false;


// =========================================================
// USER DATA
// =========================================================

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


// =========================================================
// TURMA ATUAL
// =========================================================

function obterTurmaAtualId() {

    return (
        window.senaiTurmaAtualId ||
        localStorage.getItem('turmaAtualId') ||
        userExtraInfo?.turmaAtualId ||
        null
    );

}


// =========================================================
// BUSCAR DADOS DA TURMA
// =========================================================

async function getData(
    collectionName
) {

    try {

        if (
            !isOnline ||
            isUsingLocalData
        ) {

            return [];

        }

        // O estoque é global e não depende de uma turma selecionada.
        // Cada turma continua existindo separadamente, mas os dados do
        // Dashboard são sempre lidos do mesmo estoqueGlobal.
        const caminho = `estoqueGlobal/${collectionName}`;

        const snapshot =
            await get(
                ref(
                    db,
                    caminho
                )
            );

        if (!snapshot.exists()) {

            return [];

        }

        const data =
            snapshot.val();


        if (
            collectionName === 'materiais'
        ) {

            return Object.keys(data)
                .map(key => ({

                    id: key,

                    ...data[key]

                }));

        }


        return data;

    } catch (error) {

        console.error(
            'Erro buscando:',
            collectionName,
            error
        );

        return [];

    }

}


// =========================================================
// DASHBOARD
// =========================================================

export async function renderDashboard() {

    const container =
        document.getElementById(
            'tabDashboard'
        );

    if (!container) {

        return;

    }


    try {

        // =====================================================
        // MATERIAIS
        // =====================================================

        const materiais =
            await getData(
                'materiais'
            );


        // =====================================================
        // MOINHO
        // =====================================================

        const moinho =
            await getData(
                'moinho'
            );


        const listaMoinho =
            Array.isArray(
                moinho?.materiais
            )
                ? moinho.materiais
                : [];


        // =====================================================
        // TOTAIS
        // =====================================================

        const totalMateriais =
            materiais.length;


        const totalQuantidade =
            materiais.reduce(
                (
                    total,
                    material
                ) =>
                    total +
                    Number(
                        material.quantidade || 0
                    ),
                0
            );


        const quantidadeMoinho =
            listaMoinho.length;


        const pesoMoinho =
            listaMoinho.reduce(
                (
                    total,
                    material
                ) =>
                    total +
                    Number(
                        material.peso || 0
                    ),
                0
            );


        // =====================================================
        // CAPACIDADE DO MOINHO
        //
        // USA EXATAMENTE O VALOR SALVO NA ABA MOINHO
        // =====================================================

        const capacidade =
            Number(
                moinho?.capacidadeMax
            ) || 900;


        const percentual =
            capacidade > 0
                ? Math.min(
                    (
                        pesoMoinho /
                        capacidade
                    ) * 100,
                    100
                )
                : 0;


        // =====================================================
        // NOME DO USUÁRIO
        // =====================================================

        const nome =
            userExtraInfo?.nome ||
            currentUserGlobal?.email?.split('@')[0] ||
            'Usuário';


        // =====================================================
        // STATUS
        // =====================================================

        let statusTexto =
            'Capacidade normal';

        let statusClass =
            'normal';


        if (
            percentual >= 90
        ) {

            statusTexto =
                'Capacidade crítica';

            statusClass =
                'danger';

        } else if (
            percentual >= 70
        ) {

            statusTexto =
                'Atenção à capacidade';

            statusClass =
                'warning';

        }


        // =====================================================
        // MOINHO CHEIO
        // =====================================================

        const moinhoCheio =
            pesoMoinho >= capacidade;


        if (moinhoCheio) {

            statusTexto =
                'MOINHO CHEIO';

            statusClass =
                'danger';

        }


        // =====================================================
        // DASHBOARD
        // =====================================================

        container.innerHTML = `

            <!-- BOAS-VINDAS -->

            <div class="dashboard-welcome">

                <div>

                    <h2>
                        Olá, ${escapeHtml(nome)}! 👋
                    </h2>

                    <p>
                        Informações do <strong>Estoque Global</strong>, compartilhadas por todas as turmas.
                    </p>

                </div>


                <div class="dashboard-status">

                    <i class="fas fa-circle"></i>

                    ${
                        isOnline
                            ? 'Sistema online'
                            : 'Modo offline'
                    }

                </div>

            </div>


            <!-- CARDS -->

            <div
                class="dashboard-grid"
                style="
                    gap:18px;
                    margin-bottom:20px;
                "
            >


                <!-- MATERIAIS -->

                <div
                    class="dashboard-card"
                    style="
                        min-height:165px;
                        padding:22px;
                    "
                >

                    <div class="dashboard-card-top">

                        <div>

                            <div class="dashboard-card-label">

                                Materiais cadastrados

                            </div>

                            <div class="dashboard-card-value">

                                ${totalMateriais}

                            </div>

                        </div>


                        <div class="dashboard-icon">

                            <i class="fas fa-cubes"></i>

                        </div>

                    </div>


                    <div class="dashboard-card-footer">

                        Quantidade total:

                        <strong>

                            ${totalQuantidade} kg

                        </strong>

                    </div>

                </div>


                <!-- MOINHO -->

                <div
                    class="dashboard-card"
                    style="
                        min-height:165px;
                        padding:22px;
                    "
                >

                    <div class="dashboard-card-top">

                        <div>

                            <div class="dashboard-card-label">

                                Materiais no moinho

                            </div>

                            <div class="dashboard-card-value">

                                ${quantidadeMoinho}

                            </div>

                        </div>


                        <div class="dashboard-icon">

                            <i class="fas fa-recycle"></i>

                        </div>

                    </div>


                    <div class="dashboard-card-footer">

                        Peso total:

                        <strong>

                            ${pesoMoinho} T

                        </strong>

                    </div>

                </div>


                <!-- CAPACIDADE -->

                <div
                    class="dashboard-card"
                    style="
                        min-height:165px;
                        padding:22px;
                    "
                >

                    <div class="dashboard-card-top">

                        <div>

                            <div class="dashboard-card-label">

                                Capacidade do moinho

                            </div>

                            <div class="dashboard-card-value">

                                ${percentual.toFixed(1)}%

                            </div>

                        </div>


                        <div class="dashboard-icon">

                            <i class="fas fa-gauge-high"></i>

                        </div>

                    </div>


                    <div class="dashboard-card-footer">

                        ${
                            moinhoCheio
                                ? '<strong style="color:#dc2626;">MOINHO CHEIO</strong>'
                                : statusTexto
                        }

                    </div>

                </div>


            </div>


            <!-- MOINHO -->

            <div
                class="dashboard-card"
                style="
                    margin-bottom:10px;
                "
            >

                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        align-items:center;
                        gap:15px;
                        margin-bottom:15px;
                    "
                >

                    <div>

                        <div
                            style="
                                font-size:14px;
                                font-weight:700;
                                margin-bottom:4px;
                            "
                        >

                            Capacidade do moinho

                        </div>


                        <div
                            style="
                                font-size:11px;
                                color:var(--text-secondary);
                            "
                        >

                            Acompanhamento do material reciclado

                        </div>

                    </div>


                    <strong>

                        ${pesoMoinho} / ${capacidade} T

                    </strong>

                </div>


                <!-- BARRA -->

                <div
                    style="
                        width:100%;
                        height:10px;
                        background:var(--border);
                        border-radius:20px;
                        overflow:hidden;
                    "
                >

                    <div
                        style="
                            width:${percentual}%;
                            height:100%;

                            background:
                                ${
                                    moinhoCheio
                                        ? '#dc2626'
                                        : statusClass === 'danger'
                                            ? '#dc2626'
                                            : statusClass === 'warning'
                                                ? '#f59e0b'
                                                : '#10b981'
                                };

                            border-radius:20px;

                            transition:
                                width .5s ease;
                        "
                    ></div>

                </div>


                <div
                    style="
                        display:flex;
                        justify-content:space-between;
                        margin-top:8px;
                        color:var(--text-secondary);
                        font-size:10px;
                    "
                >

                    <span>

                        0 T

                    </span>


                    <span>

                        ${capacidade} T

                    </span>

                </div>


                ${
                    moinhoCheio
                        ? `

                            <div
                                style="
                                    margin-top:15px;
                                    padding:12px;
                                    border-radius:10px;
                                    background:rgba(220,38,38,.10);
                                    color:#dc2626;
                                    font-weight:700;
                                    font-size:12px;
                                    text-align:center;
                                "
                            >

                                <i class="fas fa-triangle-exclamation"></i>

                                MOINHO CHEIO

                            </div>

                          `
                        : ''
                }

            </div>


            <!-- INFORMAÇÃO -->

            <div
                class="dashboard-card"
                style="
                    margin-top:10px;
                    display:flex;
                    align-items:center;
                    gap:15px;
                "
            >

                <div class="dashboard-icon">

                    <i class="fas fa-info"></i>

                </div>


                <div>

                    <strong
                        style="
                            display:block;
                            margin-bottom:4px;
                            font-size:13px;
                        "
                    >

                        Gerenciamento de Plásticos

                    </strong>


                    <span
                        style="
                            font-size:11px;
                            color:var(--text-secondary);
                        "
                    >

                        Sistema desenvolvido para auxiliar no controle
                        dos materiais plásticos e do processo de reciclagem.

                    </span>

                </div>

            </div>

        `;

    } catch (error) {

        console.error(
            'Erro dashboard:',
            error
        );


        container.innerHTML = `

            <div class="dashboard-card">

                <h3>

                    Erro ao carregar dashboard

                </h3>

                <p>

                    ${escapeHtml(
                        error.message
                    )}

                </p>

            </div>

        `;

    }

}


// =========================================================
// ESCAPAR HTML
// =========================================================

function escapeHtml(valor) {

    return String(valor ?? '')
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );

}