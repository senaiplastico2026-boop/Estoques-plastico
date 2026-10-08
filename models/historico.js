import {
    listarUltimosAcessos
} from '../auth.js';


// =========================================================
// VARIÁVEIS
// =========================================================

let currentUserRole = null;
let currentUserGlobal = null;
let isUsingLocalData = false;


// =========================================================
// RECEBER DADOS DO USUÁRIO
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
// ESCAPAR HTML
// =========================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {

        return '';

    }

    return String(value)
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


// =========================================================
// OBTER PROFESSORES DO ALUNO
// =========================================================

function obterProfessoresDoAluno(
    login
) {

    if (!login) {

        return [];

    }


    // ---------------------------------------------------------
    // PROFESSORES PELO CAMPO professoresNomes
    // ---------------------------------------------------------

    if (
        Array.isArray(
            login.professoresNomes
        ) &&
        login.professoresNomes.length
    ) {

        return login.professoresNomes
            .map(
                professor => {

                    if (
                        typeof professor ===
                        'string'
                    ) {

                        return professor.trim();

                    }

                    return (
                        professor?.nome ||
                        professor?.email ||
                        ''
                    ).trim();

                }
            )
            .filter(Boolean);

    }


    // ---------------------------------------------------------
    // PROFESSOR PELO CAMPO professorNome
    // ---------------------------------------------------------

    if (
        typeof login.professorNome ===
        'string' &&
        login.professorNome.trim()
    ) {

        return [
            login.professorNome.trim()
        ];

    }


    // ---------------------------------------------------------
    // PROFESSOR PELO CAMPO professor
    // ---------------------------------------------------------

    if (
        typeof login.professor ===
        'string' &&
        login.professor.trim()
    ) {

        return [
            login.professor.trim()
        ];

    }


    // ---------------------------------------------------------
    // professor como objeto
    // ---------------------------------------------------------

    if (
        login.professor &&
        typeof login.professor === 'object'
    ) {

        const nome =
            login.professor.nome ||
            login.professor.email ||
            '';

        if (nome) {

            return [
                nome
            ];

        }

    }


    // ---------------------------------------------------------
    // PROFESSORES VINCULADOS
    // ---------------------------------------------------------

    if (
        Array.isArray(
            login.professoresVinculados
        ) &&
        login.professoresVinculados.length
    ) {

        return login.professoresVinculados
            .map(
                professor => {

                    if (
                        typeof professor ===
                        'string'
                    ) {

                        return professor.trim();

                    }

                    return (
                        professor?.nome ||
                        professor?.email ||
                        ''
                    ).trim();

                }
            )
            .filter(Boolean);

    }


    // ---------------------------------------------------------
    // CAMPO professores
    // ---------------------------------------------------------

    if (
        Array.isArray(
            login.professores
        ) &&
        login.professores.length
    ) {

        return login.professores
            .map(
                professor => {

                    if (
                        typeof professor ===
                        'string'
                    ) {

                        return professor.trim();

                    }

                    return (
                        professor?.nome ||
                        professor?.email ||
                        ''
                    ).trim();

                }
            )
            .filter(Boolean);

    }


    // ---------------------------------------------------------
    // professores como objeto
    // ---------------------------------------------------------

    if (
        login.professores &&
        typeof login.professores === 'object'
    ) {

        return Object.values(
            login.professores
        )
            .map(
                professor => {

                    if (
                        typeof professor ===
                        'string'
                    ) {

                        return professor.trim();

                    }

                    return (
                        professor?.nome ||
                        professor?.email ||
                        ''
                    ).trim();

                }
            )
            .filter(Boolean);

    }


    return [];

}


// =========================================================
// FORMAR TEXTO DOS PROFESSORES
// =========================================================

function formatarProfessoresAluno(
    login
) {

    const professores =
        obterProfessoresDoAluno(
            login
        );


    if (
        !professores.length
    ) {

        return 'Aluno';

    }


    const nomesUnicos =
        [
            ...new Set(
                professores
            )
        ];


    if (
        nomesUnicos.length === 1
    ) {

        return `Aluno de ${nomesUnicos[0]}`;

    }


    if (
        nomesUnicos.length === 2
    ) {

        return `Aluno de ${nomesUnicos[0]} e ${nomesUnicos[1]}`;

    }


    const ultimo =
        nomesUnicos[
        nomesUnicos.length - 1
        ];


    const restantes =
        nomesUnicos.slice(
            0,
            -1
        );


    return `Aluno de ${restantes.join(', ')} e ${ultimo}`;

}


// =========================================================
// RENDERIZAR HISTÓRICO
// SOMENTE LOGINS
// =========================================================

export async function renderHistorico() {

    try {

        // =====================================================
        // ÚLTIMOS 10 ACESSOS DE ALUNOS
        // =====================================================

        const ultimosAlunos =
            await listarUltimosAcessos(
                'aluno',
                10
            );


        // =====================================================
        // ÚLTIMOS 10 ACESSOS DE PROFESSORES
        // =====================================================

        const ultimosProfessores =
            await listarUltimosAcessos(
                'professor',
                10
            );


        // =====================================================
        // CONTAINER
        // =====================================================

        const container =
            document.getElementById(
                'tabHistorico'
            );


        if (!container) {

            return;

        }


        // =====================================================
        // HTML
        // =====================================================

        container.innerHTML = `

            <div class="historico-page">


                <!-- =================================================
                     CABEÇALHO
                ================================================== -->

                <div class="historico-page-header">

                    <div>

                        <span class="historico-page-label">

                            REGISTROS

                        </span>

                        <h2>

                            Histórico de Acessos

                        </h2>

                        <p>

                            Acompanhe os últimos acessos de alunos e professores ao sistema.

                        </p>

                    </div>

                </div>



                <!-- =================================================
                     CARDS
                ================================================== -->

                <div class="historico-acessos-grid">


                    <!-- =================================================
                         ALUNOS
                    ================================================== -->

                    <div class="form-card historico-acesso-card">


                        <div class="historico-card-header">

                            <div class="historico-card-title">

                                <div class="historico-icon aluno">

                                    <i class="fas fa-user-graduate"></i>

                                </div>

                                <div>

                                    <h3>

                                        Últimos Acessos

                                    </h3>

                                    <span>

                                        Alunos

                                    </span>

                                </div>

                            </div>


                            <div class="historico-count aluno">

                                ${ultimosAlunos.length}

                            </div>

                        </div>



                        <!-- LISTA -->

                        <div class="historico-list">


                            ${ultimosAlunos.length > 0

                ?

                ultimosAlunos.map(
                    login => {

                        const nome =
                            login.nome ||
                            login.email ||
                            'Aluno';

                        const data =
                            login.data ||
                            'Data não informada';

                        const professoresTexto =
                            formatarProfessoresAluno(
                                login
                            );


                        return `

                                            <div class="log-entry">


                                                <div class="log-user-area">


                                                    <div class="log-avatar aluno">

                                                        <i class="fas fa-user-graduate"></i>

                                                    </div>


                                                    <div class="log-user-info">

                                                        <strong class="log-user">

                                                            ${escapeHTML(nome)}

                                                        </strong>


                                                        <span
                                                            class="log-role"
                                                            style="
                                                                display:block;
                                                                margin-top:2px;
                                                            "
                                                        >

                                                            ${escapeHTML(
                            professoresTexto
                        )}

                                                        </span>

                                                    </div>

                                                </div>


                                                <div class="log-date">

                                                    <i class="far fa-clock"></i>

                                                    <span>

                                                        ${escapeHTML(data)}

                                                    </span>

                                                </div>


                                            </div>

                                        `;

                    }
                ).join('')

                :

                `

                                    <div class="historico-vazio">

                                        <div class="historico-vazio-icon">

                                            <i class="fas fa-user-slash"></i>

                                        </div>

                                        <span>

                                            Nenhum acesso de aluno registrado.

                                        </span>

                                    </div>

                                `
            }


                        </div>

                    </div>



                    <!-- =================================================
                         PROFESSORES
                    ================================================== -->

                    <div class="form-card historico-acesso-card">


                        <div class="historico-card-header">

                            <div class="historico-card-title">

                                <div class="historico-icon professor">

                                    <i class="fas fa-chalkboard-user"></i>

                                </div>

                                <div>

                                    <h3>

                                        Últimos Acessos

                                    </h3>

                                    <span>

                                        Professores

                                    </span>

                                </div>

                            </div>


                            <div class="historico-count professor">

                                ${ultimosProfessores.length}

                            </div>

                        </div>



                        <!-- LISTA -->

                        <div class="historico-list">


                            ${ultimosProfessores.length > 0

                ?

                ultimosProfessores.map(
                    login => {

                        const nome =
                            login.nome ||
                            login.email ||
                            'Professor';

                        const data =
                            login.data ||
                            'Data não informada';


                        return `

                                            <div class="log-entry">


                                                <div class="log-user-area">


                                                    <div class="log-avatar professor">

                                                        <i class="fas fa-chalkboard-user"></i>

                                                    </div>


                                                    <div class="log-user-info">

                                                        <strong class="log-user">

                                                            ${escapeHTML(nome)}

                                                        </strong>

                                                        <span class="log-role">

                                                            Professor

                                                        </span>

                                                    </div>

                                                </div>


                                                <div class="log-date">

                                                    <i class="far fa-clock"></i>

                                                    <span>

                                                        ${escapeHTML(data)}

                                                    </span>

                                                </div>


                                            </div>

                                        `;

                    }
                ).join('')

                :

                `

                                    <div class="historico-vazio">

                                        <div class="historico-vazio-icon">

                                            <i class="fas fa-user-slash"></i>

                                        </div>

                                        <span>

                                            Nenhum acesso de professor registrado.

                                        </span>

                                    </div>

                                `
            }


                        </div>

                    </div>


                </div>

            </div>

        `;


    } catch (error) {

        console.error(
            'Erro ao renderizar histórico:',
            error
        );


        const container =
            document.getElementById(
                'tabHistorico'
            );


        if (container) {

            container.innerHTML = `

                <div class="form-card historico-erro">

                    <div class="historico-card-title">

                        <div class="historico-icon erro">

                            <i class="fas fa-circle-exclamation"></i>

                        </div>

                        <div>

                            <h3>

                                Erro ao carregar histórico

                            </h3>

                            <span>

                                Não foi possível carregar os acessos.

                            </span>

                        </div>

                    </div>


                    <button
                        type="button"
                        class="btn-primary"
                        onclick="location.reload()"
                    >

                        <i class="fas fa-rotate-right"></i>

                        Recarregar

                    </button>

                </div>

            `;

        }

    }

}