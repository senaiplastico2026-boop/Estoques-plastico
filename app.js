// ============================================================
// APP.JS - SENAI PLÁSTICOS
// ============================================================

import {
    loginProfessor,
    loginAluno,
    cadastrarAluno,
    cadastrarProfessor,
    redefinirSenha,
    logoutUser,
    excluirMinhaConta,
    removerTurma,
    onAuthStateChange,
    listarProfessores,
    criarTurma,
    entrarAlunoPorCodigo,
    acessarTurmaDoProfessor,
    professorPertenceTurma,
    restaurarTurmaDoAluno,
    userExtraInfo,
    isOnline
} from './auth.js';

import { db } from './firebaseConfig.js';
import { garantirEstoqueGlobal } from './models/estoqueGlobal.js';

import {
    ref,
    get
} from 'firebase/database';

import {
    renderDashboard,
    setUserData as setDashboardData
} from './dashboard.js';

import {
    renderProfessor,
    setUserData as setProfessorData
} from './models/professor.js';

import {
    renderAluno,
    setUserData as setAlunoData
} from './models/aluno.js';

import {
    renderMateriais,
    setUserData as setMateriaisData
} from './models/materiais.js';

import {
    renderMoinho,
    setUserData as setMoinhoData
} from './models/moinho.js';

import {
    renderHistorico,
    setUserData as setHistoricoData
} from './models/historico.js';

import {
    renderMeuPerfil,
    setUserData as setMeuPerfilData
} from './models/meuperfil.js';


// ============================================================
// ESTADO
// ============================================================

let currentUser = null;
let currentUserRole = null;
let isUsingLocalData = false;

let loginIniciadoManualmente = false;
let ultimaSessaoPreparada = null;

let currentTurma = null;
let turmaSelecionada = null;
let turmasDisponiveis = [];
let processandoEntradaAluno = false;
let processandoEntradaProfessor = false;

let authEstadoInicializado = false;
let processandoEstadoAuth = false;


// ============================================================
// ELEMENTOS
// ============================================================

const loginContainer =
    document.getElementById('loginContainer');

const appContainer =
    document.getElementById('appContainer');

const loginProfBtn =
    document.getElementById('doLoginProfBtn');

const loginAlunoBtn =
    document.getElementById('doLoginAlunoBtn');

const logoutBtn =
    document.getElementById('logoutBtnGlobal');

const sidebar =
    document.getElementById('sidebar');

const sidebarOverlay =
    document.getElementById('sidebarOverlay');

const mobileMenuBtn =
    document.getElementById('mobileMenuBtn');

const sidebarUserName =
    document.getElementById('sidebarUserName');

const sidebarUserRole =
    document.getElementById('sidebarUserRole');

const editModal =
    document.getElementById('editModal');

const removeModal =
    document.getElementById('removeModal');

const cadastrarProfModal =
    document.getElementById('cadastrarProfModal');

const cadastrarAlunoModal =
    document.getElementById('cadastrarAlunoModal');

const esqueciSenhaModal =
    document.getElementById('esqueciSenhaModal');

const gerenciarAlunosModal =
    document.getElementById('gerenciarAlunosModal');

const gerenciarProfessoresModal =
    document.getElementById('gerenciarProfessoresModal');

const criarTurmaModal =
    document.getElementById('criarTurmaModal');


// ============================================================
// UTILITÁRIOS
// ============================================================

function normalizarTexto(valor) {

    return String(valor ?? '')
        .trim()
        .toLowerCase();

}

function escapeHtml(valor) {

    return String(valor ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');

}

function obterNomeUsuario() {

    return (
        userExtraInfo?.nome ||
        currentUser?.email?.split('@')[0] ||
        'Usuário'
    );

}


// ============================================================
// TURMA ATUAL
// ============================================================

function obterTurmaAtualId() {

    return (
        currentTurma?.id ||
        localStorage.getItem('turmaAtualId') ||
        null
    );

}

function definirTurmaAtual(turma) {

    if (!turma?.id) {

        currentTurma = null;
        turmaSelecionada = null;

        localStorage.removeItem('turmaAtual');
        localStorage.removeItem('turmaAtualId');
        localStorage.removeItem('turmaAtualNome');
        localStorage.removeItem('turmaAtualCodigo');

        window.senaiTurmaAtualId = null;

        return null;

    }

    currentTurma = {
        ...turma
    };

    turmaSelecionada = {
        ...turma
    };

    localStorage.setItem(
        'turmaAtual',
        JSON.stringify(currentTurma)
    );

    localStorage.setItem(
        'turmaAtualId',
        String(turma.id)
    );

    localStorage.setItem(
        'turmaAtualNome',
        turma.nome || ''
    );

    localStorage.setItem(
        'turmaAtualCodigo',
        turma.codigo || ''
    );

    window.senaiTurmaAtualId =
        String(turma.id);

    return currentTurma;

}

window.obterTurmaAtualId =
    obterTurmaAtualId;


// ============================================================
// TELAS
// ============================================================

function mostrarSomenteLogin() {

    if (loginContainer) {

        loginContainer.style.display =
            'flex';

    }

    if (appContainer) {

        appContainer.style.display =
            'none';

    }

    const gate =
        document.getElementById('turmaGate');

    if (gate) {

        gate.style.display =
            'none';

    }

    fecharTodosModais();
    closeSidebar();

}

function mostrarApp() {

    if (loginContainer) {

        loginContainer.style.display =
            'none';

    }

    const gate =
        document.getElementById('turmaGate');

    if (gate) {

        gate.style.display =
            'none';

    }

    if (appContainer) {

        appContainer.style.display =
            'block';

    }

}

function showConnectionStatus() {

    let status =
        document.getElementById(
            'connectionStatus'
        );

    if (!status) {

        status =
            document.createElement('div');

        status.id =
            'connectionStatus';

        status.style.cssText = `
            position: fixed;
            right: 20px;
            bottom: 20px;
            z-index: 9999;
            padding: 8px 15px;
            border-radius: 20px;
            color: #fff;
            font-size: 11px;
            font-weight: 600;
            box-shadow: 0 5px 18px rgba(0,0,0,.25);
        `;

        document.body.appendChild(status);

    }

    status.style.background =
        isOnline
            ? '#10b981'
            : '#ef4444';

    status.textContent =
        isOnline
            ? '🟢 Online'
            : '🔴 Offline';

}


// ============================================================
// ABAS DE LOGIN
// ============================================================

document
    .querySelectorAll('.login-tab')
    .forEach(tab => {

        tab.addEventListener(
            'click',
            function () {

                document
                    .querySelectorAll('.login-tab')
                    .forEach(item => {

                        item.classList.remove(
                            'active'
                        );

                    });

                this.classList.add('active');

                const target =
                    this.dataset.tab;

                document
                    .querySelectorAll('.login-form')
                    .forEach(form => {

                        form.classList.remove(
                            'active'
                        );

                    });

                const form =
                    document.getElementById(
                        `login${
                            target.charAt(0).toUpperCase()
                        }${target.slice(1)}`
                    );

                if (form) {

                    form.classList.add(
                        'active'
                    );

                }

            }
        );

    });


// ============================================================
// PROFESSORES - CHECKLIST DA TURMA
// ============================================================

async function carregarProfessoresParaTurma() {

    const container =
        document.getElementById(
            'turmaProfessoresCheckboxes'
        );

    if (!container) {

        return;

    }

    container.innerHTML = `
        <div class="checkbox-loading">
            <i class="fas fa-spinner fa-spin"></i>
            Carregando professores...
        </div>
    `;

    try {

        const professores =
            await listarProfessores();

        if (!professores?.length) {

            container.innerHTML = `
                <div class="checkbox-loading">
                    <i class="fas fa-user-slash"></i>
                    Nenhum professor cadastrado.
                </div>
            `;

            return;

        }

        container.innerHTML =
            professores.map(professor => {

                const uid =
                    professor.uid ||
                    professor.id ||
                    '';

                const nome =
                    professor.nome ||
                    professor.email?.split('@')[0] ||
                    'Professor';

                const email =
                    professor.email ||
                    '';

                const selecionado =
                    currentUser?.uid &&
                    uid === currentUser.uid
                        ? 'checked'
                        : '';

                return `
                    <label
                        class="checkbox-item turma-professor-item">

                        <input
                            type="checkbox"
                            class="turma-professor-check"
                            value="${escapeHtml(nome)}"
                            data-uid="${escapeHtml(uid)}"
                            data-nome="${escapeHtml(nome)}"
                            data-email="${escapeHtml(email)}"
                            ${selecionado}>

                        <span>

                            <strong>
                                ${escapeHtml(nome)}
                            </strong>

                            ${
                                email
                                    ? `
                                        <small>
                                            ${escapeHtml(email)}
                                        </small>
                                      `
                                    : ''
                            }

                        </span>

                    </label>
                `;

            }).join('');

    } catch (error) {

        console.error(
            'Erro ao carregar professores da turma:',
            error
        );

        container.innerHTML = `
            <div class="checkbox-loading">
                <i class="fas fa-circle-exclamation"></i>
                Erro ao carregar professores.
            </div>
        `;

    }

}


// ============================================================
// CADASTRO DE PROFESSOR
// ============================================================

document
    .getElementById('btnAbrirCadastroProf')
    ?.addEventListener(
        'click',
        () => {

            if (cadastrarProfModal) {

                cadastrarProfModal.style.display =
                    'block';

            }

        }
    );

document
    .querySelector('.close-cadastrar-prof')
    ?.addEventListener(
        'click',
        () => {

            if (cadastrarProfModal) {

                cadastrarProfModal.style.display =
                    'none';

            }

        }
    );

document
    .getElementById('btnCadastrarNovoProf')
    ?.addEventListener(
        'click',
        async () => {

            const email =
                document
                    .getElementById(
                        'novoProfEmail'
                    )
                    ?.value
                    .trim();

            const senha =
                document
                    .getElementById(
                        'novoProfSenha'
                    )
                    ?.value
                    .trim();

            const btn =
                document.getElementById(
                    'btnCadastrarNovoProf'
                );

            if (!email || !senha) {

                alert(
                    '⚠️ Preencha email e senha!'
                );

                return;

            }

            if (senha.length < 6) {

                alert(
                    '⚠️ A senha deve ter pelo menos 6 caracteres!'
                );

                return;

            }

            try {

                if (btn) {

                    btn.disabled =
                        true;

                    btn.innerHTML =
                        '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';

                }

                const result =
                    await cadastrarProfessor(
                        email,
                        senha
                    );

                if (!result?.success) {

                    alert(
                        '❌ ' +
                        (
                            result?.error ||
                            'Erro ao cadastrar professor.'
                        )
                    );

                    return;

                }

                alert(
                    `✅ Professor cadastrado com sucesso!\n\nEmail: ${email}`
                );

                if (cadastrarProfModal) {

                    cadastrarProfModal.style.display =
                        'none';

                }

                const novoEmail =
                    document.getElementById(
                        'novoProfEmail'
                    );

                const novaSenha =
                    document.getElementById(
                        'novoProfSenha'
                    );

                const loginEmail =
                    document.getElementById(
                        'loginProfEmail'
                    );

                if (novoEmail) {

                    novoEmail.value = '';

                }

                if (novaSenha) {

                    novaSenha.value = '';

                }

                if (loginEmail) {

                    loginEmail.value = email;

                }

            } catch (error) {

                console.error(
                    'Erro cadastro professor:',
                    error
                );

                alert(
                    '❌ Erro ao cadastrar professor:\n' +
                    error.message
                );

            } finally {

                if (btn) {

                    btn.disabled =
                        false;

                    btn.innerHTML =
                        '<i class="fas fa-user-plus"></i> Cadastrar';

                }

            }

        }
    );


// ============================================================
// CADASTRO DE ALUNO
// ============================================================

document
    .getElementById('btnAbrirCadastroAluno')
    ?.addEventListener('click', () => {
        if (cadastrarAlunoModal) {
            cadastrarAlunoModal.style.display = 'block';
            document.getElementById('novoAlunoNome')?.focus();
        }
    });

document
    .querySelectorAll('.close-cadastrar-aluno')
    .forEach(button => {
        button.addEventListener('click', () => {
            if (cadastrarAlunoModal) {
                cadastrarAlunoModal.style.display = 'none';
            }
        });
    });

document
    .getElementById('btnCadastrarNovoAluno')
    ?.addEventListener('click', async () => {
        const nome = document.getElementById('novoAlunoNome')?.value.trim() || '';
        const email = document.getElementById('novoAlunoEmail')?.value.trim() || '';
        const senha = document.getElementById('novoAlunoSenha')?.value || '';
        const confirmarSenha = document.getElementById('novoAlunoConfirmarSenha')?.value || '';
        const turno = document.getElementById('novoAlunoTurno')?.value || '';
        const btn = document.getElementById('btnCadastrarNovoAluno');

        if (btn?.disabled) {
            return;
        }

        if (!nome || !email || !senha.trim() || !confirmarSenha.trim()) {
            alert('⚠️ Preencha nome, e-mail, senha e confirmação de senha!');
            return;
        }

        if (senha !== confirmarSenha) {
            alert('⚠️ As senhas não são iguais!');
            return;
        }

        // Mantém a normalização de senha utilizada pelo cadastro e login atuais.
        if (senha.trim().length < 6) {
            alert('⚠️ A senha deve ter pelo menos 6 caracteres!');
            return;
        }

        if (!['Manhã', 'Tarde', 'Noite'].includes(turno)) {
            alert('⚠️ Selecione um turno válido!');
            return;
        }

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Cadastrando...';
            }

            const result = await cadastrarAluno({
                nome,
                email,
                senha: senha.trim(),
                turno
            });

            if (!result?.success) {
                alert(result?.error || '❌ Erro ao cadastrar aluno.');
                return;
            }

            alert(`✅ Aluno "${nome}" cadastrado com sucesso!`);

            if (cadastrarAlunoModal) {
                cadastrarAlunoModal.style.display = 'none';
            }

            ['novoAlunoNome', 'novoAlunoEmail', 'novoAlunoSenha', 'novoAlunoConfirmarSenha']
                .forEach(id => {
                    const input = document.getElementById(id);
                    if (input) {
                        input.value = '';
                    }
                });

            const loginEmail = document.getElementById('loginAlunoEmail');
            if (loginEmail) {
                loginEmail.value = email;
            }
        } catch (error) {
            console.error('Erro cadastro aluno:', error);
            alert('❌ Erro cadastro aluno:\n' + error.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-user-plus"></i> Cadastrar';
            }
        }
    });


// ============================================================
// REDEFINIÇÃO DE SENHA
// ============================================================

function abrirResetSenha() {

    if (esqueciSenhaModal) {

        esqueciSenhaModal.style.display =
            'block';

    }

}

document
    .getElementById('esqueciSenhaProfBtn')
    ?.addEventListener(
        'click',
        abrirResetSenha
    );

document
    .getElementById('esqueciSenhaAlunoBtn')
    ?.addEventListener(
        'click',
        abrirResetSenha
    );

document
    .querySelector('.close-esqueci-senha')
    ?.addEventListener(
        'click',
        () => {

            if (esqueciSenhaModal) {

                esqueciSenhaModal.style.display =
                    'none';

            }

        }
    );

document
    .getElementById('btnResetarSenha')
    ?.addEventListener(
        'click',
        async () => {

            const email =
                document
                    .getElementById(
                        'resetEmailInput'
                    )
                    ?.value
                    .trim();

            const novaSenha =
                document
                    .getElementById(
                        'resetNovaSenha'
                    )
                    ?.value
                    .trim();

            const confirmarSenha =
                document
                    .getElementById(
                        'resetConfirmarSenha'
                    )
                    ?.value
                    .trim();

            const btn =
                document.getElementById(
                    'btnResetarSenha'
                );

            if (
                !email ||
                !novaSenha ||
                !confirmarSenha
            ) {

                alert(
                    '⚠️ Preencha todos os campos!'
                );

                return;

            }

            if (novaSenha.length < 6) {

                alert(
                    '⚠️ A nova senha deve ter pelo menos 6 caracteres!'
                );

                return;

            }

            if (
                novaSenha !==
                confirmarSenha
            ) {

                alert(
                    '❌ As senhas não são iguais!'
                );

                return;

            }

            try {

                if (btn) {

                    btn.disabled =
                        true;

                    btn.innerHTML =
                        '<i class="fas fa-spinner fa-spin"></i> Redefinindo...';

                }

                const result =
                    await redefinirSenha(
                        email,
                        novaSenha,
                        confirmarSenha
                    );

                alert(
                    result?.message ||
                    result?.error ||
                    'Operação concluída.'
                );

                if (
                    result?.success &&
                    esqueciSenhaModal
                ) {

                    esqueciSenhaModal.style.display =
                        'none';

                }

            } catch (error) {

                console.error(
                    'Erro redefinir senha:',
                    error
                );

                alert(
                    '❌ Erro ao redefinir senha:\n' +
                    error.message
                );

            } finally {

                if (btn) {

                    btn.disabled =
                        false;

                    btn.innerHTML =
                        '<i class="fas fa-key"></i> Redefinir';

                }

            }

        }
    );


// ============================================================
// BUSCAR TODAS AS TURMAS
// ============================================================

async function buscarTodasTurmas() {

    if (
        !isOnline ||
        isUsingLocalData
    ) {

        return [];

    }

    try {

        const snapshot =
            await get(
                ref(
                    db,
                    'turmas'
                )
            );

        if (!snapshot.exists()) {

            return [];

        }

        const data =
            snapshot.val();

        return Object.entries(data).map(
            ([id, turma]) => ({

                id,

                ...turma

            })
        );

    } catch (error) {

        console.error(
            'Erro buscando turmas:',
            error
        );

        return [];

    }

}


// ============================================================
// PROFESSORES DA TURMA
// ============================================================

function obterProfessoresTurma(turma) {

    if (!turma) {

        return [];

    }

    if (
        Array.isArray(
            turma.professores
        )
    ) {

        return [
            ...turma.professores
        ];

    }

    if (
        turma.professores &&
        typeof turma.professores === 'object'
    ) {

        return Object.values(
            turma.professores
        );

    }

    return [];

}


// ============================================================
// PROFESSOR PERTENCE À TURMA
// ============================================================

// ============================================================
// CARREGAR TURMAS DISPONÍVEIS
// ============================================================

async function carregarTurmasDisponiveis() {
    // Listagem disponível exclusivamente para o fluxo existente do professor.
    if (currentUserRole !== 'professor') {
        turmasDisponiveis = [];
        return turmasDisponiveis;
    }
    const todas = await buscarTodasTurmas();
    if (currentUserRole !== 'professor') return [];
    turmasDisponiveis = todas.filter(turma => professorPertenceTurma(turma, currentUser));
    turmasDisponiveis.sort((a, b) => normalizarTexto(a.nome).localeCompare(normalizarTexto(b.nome)));
    return turmasDisponiveis;
}


// ============================================================
// FILTRAR TURMAS
// ============================================================

function filtrarTurmas(
    lista,
    texto
) {

    const termo =
        normalizarTexto(
            texto
        );

    if (!termo) {

        return lista;

    }

    return lista.filter(
        turma =>

            normalizarTexto(
                turma.nome
            ).includes(
                termo
            ) ||

            normalizarTexto(
                turma.codigo
            ).includes(
                termo
            ) ||

            normalizarTexto(
                turma.descricao
            ).includes(
                termo
            )
    );

}


// ============================================================
// GARANTIR GATE DE TURMA
// ============================================================

function garantirTurmaGate(role = currentUserRole) {
    if (currentUserRole === 'professor') return null;
    const perfil = 'aluno';
    let gate = document.getElementById('turmaGate');
    if (!gate) {
        gate = document.createElement('div');
        gate.id = 'turmaGate';
        gate.className = 'turma-gate';
        gate.style.display = 'none';
        document.body.appendChild(gate);
    }
    if (gate.dataset.perfil !== perfil || !gate.querySelector('#btnEntrarTurma')) {
        const template = document.getElementById(
            'turmaGateAlunoTemplate'
        );
        if (!template) {
            throw new Error('A estrutura da tela de acesso à turma não foi encontrada.');
        }
        gate.replaceChildren(template.content.cloneNode(true));
        gate.dataset.perfil = perfil;
    }
    return gate;
}


// ============================================================
// MOSTRAR GATE
// ============================================================

function mostrarGate(
    role
) {

    if (currentUserRole === 'professor') {
        mostrarApp();
        const gate = document.getElementById('turmaGate');
        if (gate) gate.style.display = 'none';
        window.showTab('turmas');
        return;
    }
    const gate = garantirTurmaGate(role);

    if (gate.dataset.perfil === 'aluno') {
        turmaSelecionada = null;
        turmasDisponiveis = [];
        const input = document.getElementById('codigoTurmaEntrada');
        if (input) input.value = '';
        document.getElementById('turmaAlunoMensagem').textContent = '';
        if (appContainer) appContainer.style.display = 'none';
        if (loginContainer) loginContainer.style.display = 'none';
        gate.style.display = 'flex';
        closeSidebar();
        input?.focus();
        return;
    }

}


// ============================================================
// SELECIONAR TURMA
// ============================================================

function selecionarTurma(turma) {
    if (currentUserRole === 'professor' && turma?.id) return abrirTurmaDoProfessor(turma.id);
}


// ============================================================
// RENDERIZAR LISTA DO GATE
// ============================================================

function renderListaTurmasGate(
    lista = turmasDisponiveis
) {
    if (currentUserRole !== 'professor') return;

    const container =
        document.getElementById(
            'turmasLista'
        );

    if (!container) {

        return;

    }

    if (!lista?.length) {

        container.innerHTML = `

            <div class="turmas-empty">

                <div class="turmas-empty-icon">

                    <i class="fas fa-users-slash"></i>

                </div>

                <strong>
                    Nenhuma turma disponível
                </strong>

                <span>

                    ${
                        'Você ainda não está vinculado a nenhuma turma.'
                    }

                </span>

            </div>

        `;

        return;

    }

    container.innerHTML =
        lista
            .map(
                turma => {

                    const ativa =
                        String(
                            turmaSelecionada?.id || ''
                        ) ===
                        String(
                            turma.id || ''
                        );

                    const professores =
                        obterProfessoresTurma(
                            turma
                        );

                    return `

                        <button
                            type="button"
                            class="
                                turma-item
                                ${ativa ? 'active' : ''}
                            "
                            data-turma-id="${escapeHtml(turma.id)}">

                            <div class="turma-item-icon">

                                <i class="fas fa-users"></i>

                            </div>

                            <div class="turma-item-content">

                                <strong>

                                    ${escapeHtml(
                                        turma.nome ||
                                        'Turma sem nome'
                                    )}

                                </strong>

                                <span>

                                    ${escapeHtml(
                                        turma.descricao ||
                                        `${professores.length} professor(es) vinculado(s)`
                                    )}

                                </span>

                            </div>

                            <div class="turma-item-arrow">

                                <i class="fas fa-chevron-right"></i>

                            </div>

                        </button>

                    `;

                }
            )
            .join('');

    container
        .querySelectorAll(
            '.turma-item'
        )
        .forEach(
            item => {

                item.addEventListener(
                    'click',
                    () => {

                        const turma =
                            turmasDisponiveis.find(
                                registro =>
                                    String(
                                        registro.id
                                    ) ===
                                    String(
                                        item.dataset.turmaId
                                    )
                            );

                        selecionarTurma(
                            turma
                        );

                    }
                );

            }
        );

}


// ============================================================
// FILTRO DO GATE
// ============================================================

document.addEventListener(
    'input',
    event => {

        if (
            event.target?.id !==
            'filtroTurma'
        ) {

            return;

        }

        renderListaTurmasGate(
            filtrarTurmas(
                turmasDisponiveis,
                event.target.value
            )
        );

    }
);


// ============================================================
// ENTRADA E RESTAURAÇÃO DO ALUNO
// ============================================================

function atualizarProcessamentoAluno(processando, texto = 'Entrando...') {
    const gate = document.getElementById('turmaGate');
    if (gate?.dataset.perfil !== 'aluno') return;
    const button = document.getElementById('btnEntrarTurma');
    const input = document.getElementById('codigoTurmaEntrada');
    if (button) {
        button.disabled = processando;
        button.innerHTML = processando
            ? `<i class="fas fa-spinner fa-spin"></i> ${texto}`
            : '<i class="fas fa-right-to-bracket"></i> Entrar na turma';
    }
    if (input) input.disabled = processando;
}

async function abrirTurmaDoAluno(turma) {
    definirTurmaAtual(turma);
    // Os perfis e userExtraInfo já foram atualizados após a confirmação do Firebase.
    await abrirSistemaNaTurma();
    if (currentUserRole === 'aluno') window.showTab('dashboard');
}

async function confirmarEntradaAlunoPorCodigo() {
    if (processandoEntradaAluno || currentUserRole !== 'aluno' || !currentUser) return;
    const userUid = currentUser.uid;
    const input = document.getElementById('codigoTurmaEntrada');
    const codigo = String(input?.value ?? '').trim().toUpperCase();
    const mensagem = document.getElementById('turmaAlunoMensagem');
    if (!codigo) {
        if (mensagem) mensagem.textContent = 'Digite o código fornecido pelo seu professor.';
        input?.focus();
        return;
    }
    processandoEntradaAluno = true;
    atualizarProcessamentoAluno(true);
    if (mensagem) mensagem.textContent = '';
    try {
        const result = await entrarAlunoPorCodigo(codigo);
        if (currentUser?.uid !== userUid || currentUserRole !== 'aluno') return;
        if (!result.success) {
            if (mensagem) mensagem.textContent = result.error;
            return;
        }
        await abrirTurmaDoAluno(result.turma);
    } catch (error) {
        console.error('Erro ao abrir turma do aluno:', error);
        if (currentUser?.uid === userUid && mensagem) {
            mensagem.textContent = 'Não foi possível concluir a entrada. Tente novamente.';
        }
    } finally {
        processandoEntradaAluno = false;
        atualizarProcessamentoAluno(false);
    }
}

async function prepararTurmaDoAluno(user) {
    // Cache local não comprova matrícula. A restauração consulta os dois perfis e a turma.
    definirTurmaAtual(null);
    userExtraInfo.turmaAtualId = null;
    userExtraInfo.turmaAtualNome = '';
    userExtraInfo.turmaAtualCodigo = '';
    mostrarGate('aluno');
    processandoEntradaAluno = true;
    atualizarProcessamentoAluno(true, 'Verificando vínculo...');
    try {
        const result = await restaurarTurmaDoAluno();
        if (currentUser?.uid !== user.uid || currentUserRole !== 'aluno') return;
        if (!result.success) {
            document.getElementById('turmaAlunoMensagem').textContent = result.error;
            return;
        }
        if (result.turma) await abrirTurmaDoAluno(result.turma);
    } finally {
        processandoEntradaAluno = false;
        atualizarProcessamentoAluno(false);
    }
}


// ============================================================
// ENTRAR NA TURMA
// ============================================================

async function abrirTurmaDoProfessor(turmaId) {
    if (processandoEntradaProfessor || !currentUser || currentUserRole !== 'professor') return;
    const uid = currentUser.uid;
    processandoEntradaProfessor = true;
    const botoes = document.querySelectorAll('.turma-entrar-page');
    botoes.forEach(btn => { btn.disabled = true; });
    try {
        const resultado = await acessarTurmaDoProfessor(turmaId);
        if (currentUser?.uid !== uid || currentUserRole !== 'professor') return;
        if (!resultado.success) { alert(resultado.error); return; }
        definirTurmaAtual(resultado.turma);
        for (const id of ['tabDashboard', 'tabMateriais', 'tabMoinho', 'tabHistorico', 'tabPerfil']) {
            document.getElementById(id)?.replaceChildren();
        }
        await garantirEstoqueGlobal();
        await abrirSistemaNaTurma();
        if (currentUser?.uid === uid && currentUserRole === 'professor') window.showTab('dashboard', true);
    } catch (error) {
        console.error('Erro ao abrir turma do professor:', error);
        alert('Não foi possível abrir a turma. Tente novamente.');
    } finally {
        processandoEntradaProfessor = false;
        botoes.forEach(btn => { btn.disabled = false; });
    }
}

async function confirmarEntradaNaTurma() {
    if (!currentUser) return mostrarSomenteLogin();
    if (currentUserRole === 'aluno') return confirmarEntradaAlunoPorCodigo();
    if (currentUserRole === 'professor' && turmaSelecionada?.id) return abrirTurmaDoProfessor(turmaSelecionada.id);
}


document.addEventListener(
    'click',
    event => {

        const btn =
            event.target.closest(
                '#btnEntrarTurma'
            );

        if (btn) {

            confirmarEntradaNaTurma();

        }

    }
);


// ============================================================
// ABRIR SISTEMA NA TURMA
// ============================================================

async function abrirSistemaNaTurma() {

    if (
        !currentUser ||
        !currentTurma
    ) {

        return;

    }

    window.senaiTurmaAtualId =
        String(
            currentTurma.id
        );

    localStorage.setItem(
        'turmaAtual',
        JSON.stringify(
            currentTurma
        )
    );

    localStorage.setItem(
        'turmaAtualId',
        String(
            currentTurma.id
        )
    );

    localStorage.setItem(
        'turmaAtualNome',
        currentTurma.nome ||
        ''
    );

    localStorage.setItem(
        'turmaAtualCodigo',
        currentTurma.codigo ||
        ''
    );

    const gate =
        document.getElementById(
            'turmaGate'
        );

    if (gate) {

        gate.style.display =
            'none';

    }

    mostrarApp();

    atualizarTurmaInterface();

    closeSidebar();

    try {

        await renderDashboard();

        await renderMateriais();

        await renderMoinho();

        await renderHistorico();

    } catch (error) {

        console.error(
            'Erro carregando módulos:',
            error
        );

    }

}


// ============================================================
// INTERFACE TURMA ATUAL
// ============================================================

function atualizarTurmaInterface() {
    fecharModalCodigoTurma();

    const nome =
        document.getElementById(
            'turmaAtualHeader'
        );

    const codigo =
        document.getElementById(
            'turmaAtualCodigo'
        );

    if (nome) {

        nome.textContent =
            currentTurma?.nome ||
            'ESTOQUE GLOBAL';

    }

    if (codigo) {

        const valor = String(currentTurma?.codigo ?? '');
        codigo.textContent = valor || 'GLOBAL';
        if (currentUserRole === 'professor' && valor) {
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'codigo-turma-botao';
            botao.dataset.codigoTurma = 'atual';
            botao.setAttribute('aria-haspopup', 'dialog');
            botao.setAttribute('aria-controls', 'modalCodigoTurma');
            botao.setAttribute('aria-label', 'Exibir código da turma: ' + valor);
            botao.textContent = valor;
            codigo.replaceChildren(botao);
        }

    }

}


// Visualização apenas: não seleciona turma nem consulta/persiste dados.
let origemModalCodigoTurma = null;

function abrirModalCodigoTurma(codigo, nomeTurma = '', origem = document.activeElement) {
    if (!currentUser || currentUserRole !== 'professor') return;
    const valor = String(codigo ?? '');
    if (!valor.trim()) return;
    const modal = document.getElementById('modalCodigoTurma');
    if (!modal) return;
    document.getElementById('modalCodigoTurmaValor').textContent = valor;
    const nome = document.getElementById('modalCodigoTurmaNome');
    nome.textContent = String(nomeTurma ?? '');
    nome.hidden = !nome.textContent;
    if (!modal.open) {
        origemModalCodigoTurma = origem;
        modal.showModal();
    }
    document.body.classList.add('codigo-turma-modal-aberto');
    document.getElementById('fecharModalCodigoTurma').focus();
}

function fecharModalCodigoTurma() {
    const modal = document.getElementById('modalCodigoTurma');
    if (modal?.open) modal.close();
}

function tratarCliqueCodigoTurma(event) {
    const botao = event.target.closest('.codigo-turma-botao');
    if (!botao || !currentUser || currentUserRole !== 'professor') return;
    // Cabeçalho/perfil leem o contexto atual no clique; cards usam seu próprio objeto.
    const turma = botao.dataset.codigoTurma === 'card'
        ? turmasDisponiveis.find(item => String(item.id) === botao.dataset.turmaId)
        : currentTurma;
    if (!turma) return;
    abrirModalCodigoTurma(turma.codigo, turma.nome, botao);
}

// Registrados uma vez, fora da abertura e das renderizações.
document.addEventListener('click', tratarCliqueCodigoTurma);
document.getElementById('fecharModalCodigoTurma')?.addEventListener('click', fecharModalCodigoTurma);
document.getElementById('modalCodigoTurma')?.addEventListener('click', event => {
    if (event.target !== event.currentTarget) return;
    const caixa = event.currentTarget.getBoundingClientRect();
    if (event.clientX < caixa.left || event.clientX > caixa.right ||
        event.clientY < caixa.top || event.clientY > caixa.bottom) fecharModalCodigoTurma();
});
document.getElementById('modalCodigoTurma')?.addEventListener('close', event => {
    if (event.currentTarget.open) return;
    document.body.classList.remove('codigo-turma-modal-aberto');
    document.getElementById('modalCodigoTurmaValor').textContent = '';
    document.getElementById('modalCodigoTurmaNome').textContent = '';
    if (origemModalCodigoTurma?.isConnected) origemModalCodigoTurma.focus();
    origemModalCodigoTurma = null;
});


// ============================================================
// LIMPAR FORMULÁRIO DE TURMA
// ============================================================

function limparFormularioCriarTurma() {

    const campos = [

        'novaTurmaNome',

        'novaTurmaDescricao'

    ];

    campos.forEach(
        id => {

            const input =
                document.getElementById(
                    id
                );

            if (input) {

                input.value =
                    '';

            }

        }
    );

    const aviso =
        document.getElementById(
            'criarTurmaMensagem'
        );

    if (aviso) {

        aviso.textContent =
            '';

        aviso.style.display =
            'none';

    }

    const btn =
        document.getElementById(
            'btnSalvarNovaTurma'
        );

    if (btn) {

        btn.disabled =
            false;

        btn.innerHTML =
            '<i class="fas fa-plus"></i> Criar turma';

    }

    const professoresContainer =
        document.getElementById(
            'turmaProfessoresCheckboxes'
        );

    if (professoresContainer) {

        professoresContainer.innerHTML = `
            <div class="checkbox-loading">
                <i class="fas fa-spinner fa-spin"></i>
                Carregando professores...
            </div>
        `;

    }

}


// ============================================================
// ABRIR CRIAR TURMA
// ============================================================

let criandoTurma = false;

async function abrirCriarTurmaModal() {

    if (criandoTurma) return;

    if (!currentUser) {

        alert(
            '⚠️ Faça login primeiro.'
        );

        return;

    }

    if (
        currentUserRole !==
        'professor'
    ) {

        alert(
            '⚠️ Somente professores podem criar turmas.'
        );

        return;

    }

    limparFormularioCriarTurma();

    if (criarTurmaModal) {

        criarTurmaModal.style.display =
            'block';

    }

    await carregarProfessoresParaTurma();

    requestAnimationFrame(
        () => {

            document
                .getElementById(
                    'novaTurmaNome'
                )
                ?.focus();

        }
    );

}


document.addEventListener(
    'click',
    event => {

        if (
            event.target.closest(
                '#btnAbrirCriarTurma'
            ) ||
            event.target.closest(
                '#btnCriarTurmaPagina'
            )
        ) {

            abrirCriarTurmaModal();

        }

    }
);

document
    .querySelector(
        '.close-criar-turma'
    )
    ?.addEventListener(
        'click',
        () => {

            if (criarTurmaModal) {

                criarTurmaModal.style.display =
                    'none';

            }

        }
    );


// ============================================================
// CRIAR TURMA
// ============================================================

document.getElementById('btnSalvarNovaTurma')?.addEventListener('click', async () => {
    if (criandoTurma) return;
    if (!currentUser || currentUserRole !== 'professor') {
        alert('⚠️ Somente professores podem criar turmas.');
        return;
    }
    const nome = document.getElementById('novaTurmaNome')?.value.trim() || '';
    if (!nome) {
        alert('⚠️ Informe o nome da turma.');
        return;
    }
    const descricao = document.getElementById('novaTurmaDescricao')?.value.trim() || '';
    const professores = Array.from(document.querySelectorAll(
        '#turmaProfessoresCheckboxes .turma-professor-check:checked'
    )).map(checkbox => ({
        uid: checkbox.dataset.uid || '',
        nome: checkbox.dataset.nome || checkbox.value || 'Professor',
        email: checkbox.dataset.email || ''
    }));
    const professorPrincipal = { uid: currentUser.uid, nome: obterNomeUsuario(), email: currentUser.email };
    const btn = document.getElementById('btnSalvarNovaTurma');
    criandoTurma = true;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Criando...';
    try {
        const resultado = await criarTurma({ nome, descricao, professores, professorPrincipal });
        if (!resultado.success) throw new Error(resultado.error);
        if (currentUser?.uid !== professorPrincipal.uid) return;
        const acesso = await acessarTurmaDoProfessor(resultado.turma.id);
        if (!acesso.success) throw new Error('Turma criada, mas ' + acesso.error);
        if (currentUser?.uid !== professorPrincipal.uid) return;
        definirTurmaAtual(acesso.turma);
        limparFormularioCriarTurma();
        if (criarTurmaModal) criarTurmaModal.style.display = 'none';
        alert('✅ Turma criada com sucesso!');
        await renderTurmasPagina();
        atualizarTurmaInterface();
    } catch (error) {
        console.error('Erro criando turma:', error);
        alert('❌ Erro ao criar turma:\n' + error.message);
    } finally {
        criandoTurma = false;
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Criar turma';
    }
});


// ============================================================
// PROFESSOR PODE APAGAR TURMA
// Criador OU professor vinculado
// ============================================================

function professorPodeApagarTurma(
    turma
) {

    if (
        currentUserRole !==
            'professor' ||
        !currentUser?.uid ||
        !turma
    ) {

        return false;

    }

    const uid =
        String(
            currentUser.uid
        );

    if (
        String(
            turma.criadoPorUid ||
            ''
        ) === uid
    ) {

        return true;

    }

    return obterProfessoresTurma(
        turma
    )
        .some(
            professor =>
                typeof professor !==
                    'string' &&
                String(
                    professor?.uid ||
                    ''
                ) === uid
        );

}


// ============================================================
// ABA TURMAS
// ============================================================

function garantirAbaTurmasProfessor() {

    if (
        currentUserRole !==
        'professor'
    ) {

        return null;

    }

    const nav =
        document.querySelector(
            '.sidebar-menu'
        );

    const tabs =
        document.querySelector(
            '.tabs-container'
        );

    if (
        !nav ||
        !tabs
    ) {

        return null;

    }

    let button =
        nav.querySelector(
            '.sidebar-item[data-tab="turmas"]'
        );

    if (!button) {

        button =
            document.createElement(
                'button'
            );

        button.type =
            'button';

        button.id =
            'sidebarTurmasBtn';

        button.className =
            'sidebar-item';

        button.dataset.tab =
            'turmas';

        button.innerHTML = `
            <i class="fas fa-users"></i>
            <span>Turmas</span>
        `;

        const referencia =
            nav.querySelector(
                '.sidebar-item[data-tab="historico"]'
            );

        if (referencia) {

            referencia.insertAdjacentElement(
                'afterend',
                button
            );

        } else {

            nav.appendChild(
                button
            );

        }

        button.addEventListener(
            'click',
            () => {

                window.showTab(
                    'turmas'
                );

            }
        );

    }

    let section =
        document.getElementById(
            'tabTurmas'
        );

    if (!section) {

        section =
            document.createElement(
                'section'
            );

        section.id =
            'tabTurmas';

        section.className =
            'tab-content';

        section.innerHTML = `

            <div class="turmas-page">

                <div class="turmas-page-header">

                    <div>

                        <span class="turmas-page-label">
                            GERENCIAMENTO
                        </span>

                        <h2>
                            Turmas
                        </h2>

                        <p>
                            Filtre uma turma vinculada ao seu perfil,
                            entre com o código ou crie uma nova turma.
                        </p>

                    </div>

                    <button
                        type="button"
                        id="btnCriarTurmaPagina"
                        class="btn-primary btn-turma-criar-pagina">

                        <i class="fas fa-plus"></i>

                        Criar nova turma

                    </button>

                </div>

                <div class="turmas-page-filter">

                    <i class="fas fa-search"></i>

                    <input
                        type="search"
                        id="filtroTurmasPagina"
                        placeholder="Pesquisar turma ou código...">

                </div>

                <div
                    id="turmasPaginaLista"
                    class="turmas-page-list">
                </div>

            </div>

        `;

        tabs.appendChild(
            section
        );


    }

    const filtroTurmas =
        document.getElementById(
            'filtroTurmasPagina'
        );

    if (
        filtroTurmas &&
        filtroTurmas.dataset.listenerFiltro !==
            'true'
    ) {

        filtroTurmas.dataset.listenerFiltro =
            'true';

        filtroTurmas.addEventListener(
            'input',
            () => {

                renderTurmasPagina();

            }
        );

    }

    return section;

}


// ============================================================
// RENDERIZAR TURMAS DO PROFESSOR
// ============================================================

async function renderTurmasPagina() {

    if (
        currentUserRole !==
        'professor'
    ) {

        return;

    }

    garantirAbaTurmasProfessor();

    const container =
        document.getElementById(
            'turmasPaginaLista'
        );

    if (!container) {

        return;

    }

    container.innerHTML = `

        <div class="loading">

            <i class="fas fa-spinner fa-spin"></i>

            Carregando turmas...

        </div>

    `;

    try {

        await carregarTurmasDisponiveis();

        const filtro =
            document.getElementById(
                'filtroTurmasPagina'
            )?.value ||
            '';

        const lista =
            filtrarTurmas(
                turmasDisponiveis,
                filtro
            );

        if (!lista.length) {

            container.innerHTML = `

                <div class="turmas-empty">

                    <div class="turmas-empty-icon">

                        <i class="fas fa-users-slash"></i>

                    </div>

                    <strong>
                        Nenhuma turma encontrada
                    </strong>

                    <span>
                        Você pode criar uma nova turma
                        ou ajustar o filtro.
                    </span>

                </div>

            `;

            return;

        }

        container.innerHTML =
            lista
                .map(
                    turma => {

                        const ativa =
                            String(
                                currentTurma?.id
                            ) ===
                            String(
                                turma.id
                            );

                        const professores =
                            obterProfessoresTurma(
                                turma
                            );

                        return `

                            <div
                                class="
                                    turma-page-item
                                    ${ativa ? 'active' : ''}
                                ">

                                <div class="turma-page-main">

                                    <div class="turma-page-icon">

                                        <i class="fas fa-users"></i>

                                    </div>

                                    <div class="turma-page-info">

                                        <strong>
                                            ${escapeHtml(
                                                turma.nome ||
                                                'Turma sem nome'
                                            )}
                                        </strong>

                                        <span>
                                            ${
                                                professores.length
                                                    ? `${professores.length} professor(es) vinculado(s)`
                                                    : 'Nenhum professor vinculado'
                                            }
                                        </span>

                                        <small>
                                            ${escapeHtml(
                                                turma.descricao ||
                                                'Sem descrição'
                                            )}
                                        </small>

                                        ${String(turma.codigo ?? '') ? `
                                            <button type="button" class="codigo-turma-botao"
                                                data-codigo-turma="card" data-turma-id="${escapeHtml(turma.id)}"
                                                aria-haspopup="dialog" aria-controls="modalCodigoTurma">
                                                Código: ${escapeHtml(String(turma.codigo))}
                                            </button>
                                        ` : ''}

                                    </div>

                                </div>

                                <div class="turma-page-actions">

                                    ${
                                        ativa
                                            ? `

                                                <span class="turma-current-badge">

                                                    <i class="fas fa-check"></i>

                                                    Turma atual

                                                </span>

                                              `
                                            : ''
                                    }

                                    <button
                                        type="button"
                                        class="btn-edit turma-entrar-page"
                                        data-id="${escapeHtml(
                                            turma.id
                                        )}">

                                        <i class="fas fa-right-to-bracket"></i>

                                        Entrar

                                    </button>

                                    ${
                                        professorPodeApagarTurma(
                                            turma
                                        )
                                            ? `

                                                <button
                                                    type="button"
                                                    class="btn-danger turma-remover-page"
                                                    data-id="${escapeHtml(
                                                        turma.id
                                                    )}"
                                                    data-nome="${escapeHtml(
                                                        turma.nome ||
                                                        'Turma'
                                                    )}">

                                                    <i class="fas fa-trash"></i>

                                                    Apagar turma

                                                </button>

                                              `
                                            : ''
                                    }

                                </div>

                            </div>

                        `;

                    }
                )
                .join('');

        container
            .querySelectorAll(
                '.turma-entrar-page'
            )
            .forEach(
                btn => {

                    btn.addEventListener(
                        'click',
                        () => {

                            const turma =
                                turmasDisponiveis.find(
                                    item =>
                                        String(
                                            item.id
                                        ) ===
                                        String(
                                            btn.dataset.id
                                        )
                                );

                            if (!turma) {

                                return;

                            }

                            abrirTurmaDoProfessor(turma.id);

                        }
                    );

                }
            );

        container
            .querySelectorAll(
                '.turma-remover-page'
            )
            .forEach(
                btn => {

                    btn.addEventListener(
                        'click',
                        async event => {

                            event.preventDefault();
                            event.stopPropagation();

                            const turmaId =
                                btn.dataset.id;

                            const nome =
                                btn.dataset.nome ||
                                'Turma';

                            const turma =
                                turmasDisponiveis.find(
                                    item =>
                                        String(
                                            item.id
                                        ) ===
                                        String(
                                            turmaId
                                        )
                                );

                            if (
                                !turma ||
                                !professorPodeApagarTurma(
                                    turma
                                )
                            ) {

                                alert(
                                    '❌ Você não tem permissão para apagar esta turma.'
                                );

                                return;

                            }

                            const confirmou =
                                confirm(
                                    `⚠️ Deseja realmente apagar a turma "${nome}"?\n\n` +
                                    'Os dados exclusivos dessa turma serão removidos.'
                                );

                            if (!confirmou) {

                                return;

                            }

                            try {

                                btn.disabled =
                                    true;

                                btn.innerHTML =
                                    '<i class="fas fa-spinner fa-spin"></i> Apagando...';

                                const resultado =
                                    await removerTurma(
                                        turmaId,
                                        currentUser.uid
                                    );

                                if (
                                    !resultado?.success
                                ) {

                                    alert(
                                        '❌ ' +
                                        (
                                            resultado?.error ||
                                            'Não foi possível apagar a turma.'
                                        )
                                    );

                                    return;

                                }

                                if (
                                    String(
                                        obterTurmaAtualId() ||
                                        ''
                                    ) ===
                                    String(
                                        turmaId
                                    )
                                ) {

                                    definirTurmaAtual(
                                        null
                                    );

                                    atualizarTurmaInterface();

                                }

                                alert(
                                    `✅ A turma "${nome}" foi apagada com sucesso.`
                                );

                                await renderTurmasPagina();

                            } catch (error) {

                                console.error(
                                    '❌ Erro ao apagar turma:',
                                    error
                                );

                                alert(
                                    '❌ Erro ao apagar turma:\n' +
                                    error.message
                                );

                            } finally {

                                btn.disabled =
                                    false;

                                btn.innerHTML =
                                    '<i class="fas fa-trash"></i> Apagar turma';

                            }

                        }
                    );

                }
            );

    } catch (error) {

        console.error(
            'Erro ao renderizar turmas:',
            error
        );

        container.innerHTML = `

            <div class="turmas-empty">

                <div class="turmas-empty-icon">

                    <i class="fas fa-circle-exclamation"></i>

                </div>

                <strong>
                    Erro ao carregar turmas
                </strong>

                <span>

                    ${escapeHtml(
                        error.message ||
                        'Tente novamente.'
                    )}

                </span>

            </div>

        `;

    }

}


// ============================================================
// LOGIN PROFESSOR
// ============================================================

loginProfBtn
    ?.addEventListener(
        'click',
        async () => {

            const email =
                document
                    .getElementById(
                        'loginProfEmail'
                    )
                    ?.value
                    .trim();

            const senha =
                document
                    .getElementById(
                        'loginProfPassword'
                    )
                    ?.value
                    .trim();

            if (
                !email ||
                !senha
            ) {

                alert(
                    '⚠️ Preencha email e senha!'
                );

                return;

            }

            try {

                loginIniciadoManualmente =
                    true;

                loginProfBtn.disabled =
                    true;

                loginProfBtn.innerHTML =
                    '<i class="fas fa-spinner fa-spin"></i> Entrando...';

                const result =
                    await loginProfessor(
                        email,
                        senha
                    );

                if (!result?.success) {

                    loginIniciadoManualmente =
                        false;

                    alert(
                        '❌ ' +
                        (
                            result?.error ||
                            'Email ou senha incorretos.'
                        )
                    );

                } else {

                    // O Firebase já autenticou o usuário.
                    // Agora preparamos a interface imediatamente,
                    // sem depender de recarregar a página.
                    loginIniciadoManualmente =
                        true;

                    await prepararPosLogin(
                        result.user,
                        result.role
                    );

                }

            } catch (error) {

                loginIniciadoManualmente =
                    false;

                console.error(
                    'Erro login professor:',
                    error
                );

                alert(
                    '❌ Erro ao entrar:\n' +
                    error.message
                );

            } finally {

                loginProfBtn.disabled =
                    false;

                loginProfBtn.innerHTML =
                    '<i class="fas fa-right-to-bracket"></i> Entrar';

            }

        }
    );


// ============================================================
// LOGIN ALUNO
// ============================================================

loginAlunoBtn
    ?.addEventListener(
        'click',
        async () => {

            const email =
                document
                    .getElementById(
                        'loginAlunoEmail'
                    )
                    ?.value
                    .trim();

            const senha =
                document
                    .getElementById(
                        'loginAlunoPassword'
                    )
                    ?.value
                    .trim();

            if (
                !email ||
                !senha
            ) {

                alert(
                    '⚠️ Preencha email e senha!'
                );

                return;

            }

            try {

                loginIniciadoManualmente =
                    true;

                loginAlunoBtn.disabled =
                    true;

                loginAlunoBtn.innerHTML =
                    '<i class="fas fa-spinner fa-spin"></i> Entrando...';

                const result =
                    await loginAluno(
                        email,
                        senha
                    );

                if (!result?.success) {

                    loginIniciadoManualmente =
                        false;

                    alert(
                        '❌ ' +
                        (
                            result?.error ||
                            'Email ou senha incorretos.'
                        )
                    );

                } else {

                    // O Firebase já autenticou o usuário.
                    // Agora preparamos a interface imediatamente,
                    // sem depender de recarregar a página.
                    loginIniciadoManualmente =
                        true;

                    await prepararPosLogin(
                        result.user,
                        result.role
                    );

                }

            } catch (error) {

                loginIniciadoManualmente =
                    false;

                console.error(
                    'Erro login aluno:',
                    error
                );

                alert(
                    '❌ Erro ao entrar:\n' +
                    error.message
                );

            } finally {

                loginAlunoBtn.disabled =
                    false;

                loginAlunoBtn.innerHTML =
                    '<i class="fas fa-right-to-bracket"></i> Entrar';

            }

        }
    );


// ============================================================
// PREPARAR APÓS LOGIN
// ============================================================

async function prepararPosLogin(
    user,
    role
) {

    if (!user) {

        return;

    }

    const roleFinal =
        role ||
        userExtraInfo?.role ||
        null;

    if (!roleFinal) {

        console.warn(
            '⚠️ Não foi possível determinar o perfil do usuário ainda.'
        );

        return;

    }

    const identificadorSessao =
        `${user.uid}:${roleFinal}`;

    if (
        ultimaSessaoPreparada ===
        identificadorSessao &&
        currentUser?.uid ===
        user.uid &&
        currentUserRole ===
        roleFinal
    ) {

        return;

    }

    currentUser =
        user;

    currentUserRole =
        roleFinal;

    if (roleFinal === 'professor') {
        definirTurmaAtual(null);
        Object.assign(userExtraInfo, { turmaAtualId: null, turmaAtualNome: '', turmaAtualCodigo: '' });
        for (const id of ['tabDashboard', 'tabMateriais', 'tabMoinho', 'tabHistorico', 'tabPerfil']) {
            document.getElementById(id)?.replaceChildren();
        }
        atualizarTurmaInterface();
    }

    try {

        setDashboardData(
            user,
            roleFinal,
            isUsingLocalData
        );

        setMateriaisData(
            user,
            roleFinal,
            isUsingLocalData
        );

        setMoinhoData(
            user,
            roleFinal,
            isUsingLocalData
        );

        setHistoricoData(
            user,
            roleFinal,
            isUsingLocalData
        );

        setMeuPerfilData(
            user,
            roleFinal,
            isUsingLocalData
        );

        if (
            roleFinal ===
            'professor'
        ) {

            setProfessorData(
                user,
                isUsingLocalData
            );

        } else if (
            roleFinal ===
            'aluno'
        ) {

            setAlunoData(
                user,
                isUsingLocalData
            );

        }

        atualizarUsuarioInterface(
            user,
            roleFinal
        );

        showConnectionStatus();

        ultimaSessaoPreparada =
            identificadorSessao;

        if (roleFinal === 'professor') {
            garantirAbaTurmasProfessor();
            mostrarApp();
            const gate = document.getElementById('turmaGate');
            if (gate) gate.style.display = 'none';
            await garantirEstoqueGlobal();
            atualizarTurmaInterface();
            await renderDashboard();
            await renderMateriais();
            await renderMoinho();
            await renderHistorico();
            window.showTab('dashboard', true);
            atualizarVisibilidadeTurmas();
            return;
        }

        if (
            roleFinal ===
            'aluno'
        ) {

            await prepararTurmaDoAluno(user);

            return;

        }

        console.warn(
            '⚠️ Perfil desconhecido:',
            roleFinal
        );

    } catch (error) {

        console.error(
            'Erro preparando pós-login:',
            error
        );

        ultimaSessaoPreparada =
            null;

        /*
         * IMPORTANTE:
         *
         * Não fazemos logout em caso de erro
         * de renderização.
         *
         * O Firebase continua autenticado.
         */

        console.error(
            '⚠️ A sessão do Firebase foi mantida.'
        );

    }

}


// ============================================================
// VISIBILIDADE DA ABA TURMAS
// ============================================================

function atualizarVisibilidadeTurmas() {

    const btn =
        document.querySelector(
            '.sidebar-item[data-tab="turmas"]'
        );

    if (!btn) {

        return;

    }

    btn.style.display =
        currentUserRole ===
        'professor'
            ? 'flex'
            : 'none';

}


// ============================================================
// INTERFACE DO USUÁRIO
// ============================================================

function atualizarUsuarioInterface(
    user,
    role
) {

    const nome =
        userExtraInfo?.nome ||
        user?.email?.split('@')[0] ||
        'Usuário';

    const cargo =
        role ===
        'professor'
            ? 'Professor'
            : 'Aluno';

    const headerUserName =
        document.getElementById(
            'headerUserName'
        );

    const headerUserRole =
        document.getElementById(
            'headerUserRole'
        );

    if (
        headerUserName
    ) {

        headerUserName.textContent =
            nome;

    }

    if (
        headerUserRole
    ) {

        headerUserRole.textContent =
            cargo;

    }

    if (
        sidebarUserName
    ) {

        sidebarUserName.textContent =
            nome;

    }

    if (
        sidebarUserRole
    ) {

        sidebarUserRole.textContent =
            cargo;

    }

}


// ============================================================
// LOGOUT
// ============================================================

logoutBtn
    ?.addEventListener(
        'click',
        async () => {

            try {

                const result =
                    await logoutUser();

                if (
                    result?.success ===
                    false
                ) {

                    alert(
                        '❌ Não foi possível sair:\n' +
                        result.error
                    );

                    return;

                }

                currentUser =
                    null;

                currentUserRole =
                    null;

                currentTurma =
                    null;

                turmaSelecionada =
                    null;

                turmasDisponiveis =
                    [];

                ultimaSessaoPreparada =
                    null;

                loginIniciadoManualmente =
                    false;

                localStorage.removeItem(
                    'turmaAtual'
                );

                localStorage.removeItem(
                    'turmaAtualId'
                );

                localStorage.removeItem(
                    'turmaAtualNome'
                );

                localStorage.removeItem(
                    'turmaAtualCodigo'
                );

                window.senaiTurmaAtualId =
                    null;

                mostrarSomenteLogin();

            } catch (error) {

                console.error(
                    'Erro ao sair:',
                    error
                );

            }

        }
    );


// ============================================================
// NAVEGAÇÃO
// ============================================================

window.showTab =
    function (
        tabName,
        aberturaValidada = false
    ) {

        if (processandoEntradaProfessor && !aberturaValidada) return;

        if (
            tabName ===
            'turmas' &&
            currentUserRole !==
            'professor'
        ) {

            return;

        }

        if (
            tabName ===
            'turmas'
        ) {

            garantirAbaTurmasProfessor();

        }

        document
            .querySelectorAll(
                '.sidebar-item'
            )
            .forEach(
                item => {

                    item.classList.toggle(
                        'active',
                        item.dataset.tab ===
                        tabName
                    );

                }
            );

        if (
            window.innerWidth <=
            900
        ) {

            closeSidebar();

        }

        document
            .querySelectorAll(
                '.tab-content'
            )
            .forEach(
                tab => {

                    tab.classList.remove(
                        'active'
                    );

                }
            );

        const id =
            'tab' +
            tabName
                .charAt(0)
                .toUpperCase() +
            tabName.slice(1);

        const target =
            document.getElementById(
                id
            );

        if (!target) {

            console.warn(
                `A aba ${id} não existe no HTML.`
            );

            return;

        }

        target.classList.add(
            'active'
        );

        const title =
            document.querySelector(
                '.page-title h1'
            );

        const subtitle =
            document.querySelector(
                '.page-title p'
            );

        const nomes = {

            dashboard:
                'Dashboard',

            materiais:
                'Materiais',

            moinho:
                'Moinho',

            historico:
                'Histórico',

            turmas:
                'Turmas',

            perfil:
                'Meu Perfil',

            configuracoes:
                'Configurações'

        };

        const subtitulos = {

            dashboard:
                'Visão geral do gerenciamento de plástico',

            materiais:
                'Gerenciamento de materiais',

            moinho:
                'Controle do moinho',

            historico:
                'Histórico de acessos',

            turmas:
                'Selecione e gerencie as turmas vinculadas',

            perfil:
                'Informações da sua conta e seus últimos acessos',

            configuracoes:
                'Configurações da aparência e da sua conta'

        };

        if (title) {

            title.textContent =
                nomes[tabName] ||
                'Dashboard';

        }

        if (subtitle) {

            subtitle.textContent =
                subtitulos[tabName] ||
                'Gerenciamento de plástico';

        }

        if (
            tabName ===
            'turmas'
        ) {

            renderTurmasPagina();

        }

        if (
            tabName ===
            'perfil' &&
            currentUser
        ) {

            try {

                setMeuPerfilData(
                    currentUser,
                    currentUserRole,
                    isUsingLocalData
                );

                renderMeuPerfil();

            } catch (error) {

                console.error(
                    'Erro ao renderizar perfil:',
                    error
                );

            }

        }

    };


// ============================================================
// SIDEBAR MOBILE
// ============================================================

function openSidebar() {

    if (!sidebar) {

        return;

    }

    sidebar.classList.add(
        'open'
    );

    sidebarOverlay?.classList.add(
        'active'
    );

    document.body.classList.add(
        'sidebar-open'
    );

    mobileMenuBtn?.setAttribute(
        'aria-expanded',
        'true'
    );

}

function closeSidebar() {

    if (sidebar) {

        sidebar.classList.remove(
            'open'
        );

    }

    sidebarOverlay?.classList.remove(
        'active'
    );

    document.body.classList.remove(
        'sidebar-open'
    );

    mobileMenuBtn?.setAttribute(
        'aria-expanded',
        'false'
    );

}

function toggleSidebarMenu() {

    if (
        sidebar?.classList.contains(
            'open'
        )
    ) {

        closeSidebar();

    } else {

        openSidebar();

    }

}

window.toggleSidebar =
    toggleSidebarMenu;

window.openSidebar =
    openSidebar;

window.closeSidebar =
    closeSidebar;

mobileMenuBtn
    ?.addEventListener(
        'click',
        event => {

            event.preventDefault();
            event.stopPropagation();

            toggleSidebarMenu();

        }
    );

sidebarOverlay
    ?.addEventListener(
        'click',
        closeSidebar
    );

document.addEventListener(
    'keydown',
    event => {

        if (
            event.key ===
            'Escape'
        ) {

            closeSidebar();

        }

    }
);


// ============================================================
// VOLTAR DA SELEÇÃO
// ============================================================

async function voltarDaSelecaoTurma(
    event
) {

    if (event) {

        event.preventDefault();
        event.stopPropagation();

    }

    console.log(
        '↩️ Botão Voltar pressionado.'
    );

    if (!currentUser) {

        mostrarSomenteLogin();

        return;

    }

    if (
        currentUserRole ===
        'professor'
    ) {

        console.log(
            '↩️ Professor voltando para Turmas.'
        );

        const gate =
            document.getElementById(
                'turmaGate'
            );

        if (gate) {

            gate.style.display =
                'none';

        }

        turmaSelecionada =
            null;

        garantirAbaTurmasProfessor();

        atualizarVisibilidadeTurmas();

        mostrarApp();

        window.showTab(
            'turmas'
        );

        await renderTurmasPagina();

        return;

    }

    if (
        currentUserRole ===
        'aluno'
    ) {

        console.log(
            '↩️ Aluno voltando para o login.'
        );

        try {

            const result =
                await logoutUser();

            if (
                result?.success ===
                false
            ) {

                alert(
                    '❌ Não foi possível voltar para o login:\n' +
                    result.error
                );

                return;

            }

        } catch (error) {

            console.error(
                'Erro ao voltar para o login:',
                error
            );

        }

        currentUser =
            null;

        currentUserRole =
            null;

        currentTurma =
            null;

        turmaSelecionada =
            null;

        turmasDisponiveis =
            [];

        ultimaSessaoPreparada =
            null;

        loginIniciadoManualmente =
            false;

        localStorage.removeItem(
            'turmaAtual'
        );

        localStorage.removeItem(
            'turmaAtualId'
        );

        localStorage.removeItem(
            'turmaAtualNome'
        );

        localStorage.removeItem(
            'turmaAtualCodigo'
        );

        window.senaiTurmaAtualId =
            null;

        mostrarSomenteLogin();

        return;

    }

    mostrarSomenteLogin();

}


// ============================================================
// BOTÕES DE VOLTAR
// ============================================================

document.addEventListener(
    'click',
    event => {

        const btn =
            event.target.closest(
                '#btnVoltarLoginTurma'
            );

        if (!btn) {

            return;

        }

        voltarDaSelecaoTurma(
            event
        );

    }
);


// ============================================================
// TEMA
// ============================================================

window.toggleTheme =
    function () {

        document.body.classList.add(
            'dark-mode'
        );

        localStorage.setItem(
            'tema',
            'escuro'
        );

    };

document.body.classList.add(
    'dark-mode'
);

localStorage.setItem(
    'tema',
    'escuro'
);


// ============================================================
// MODAIS
// ============================================================

function fecharTodosModais() {
    fecharModalCodigoTurma();

    [

        editModal,

        removeModal,

        cadastrarProfModal,

        cadastrarAlunoModal,

        esqueciSenhaModal,

        gerenciarAlunosModal,

        gerenciarProfessoresModal,

        criarTurmaModal

    ]
        .forEach(
            modal => {

                if (modal) {

                    modal.style.display =
                        'none';

                }

            }
        );

}


// ============================================================
// FECHAR MODAIS PELOS BOTÕES
// ============================================================

document
    .querySelectorAll(
        `
        .close-modal,
        .close-remove-modal,
        .close-gerenciar-alunos,
        .close-gerenciar-profs
        `
    )
    .forEach(
        btn => {

            btn.addEventListener(
                'click',
                fecharTodosModais
            );

        }
    );


// ============================================================
// CANCELAR MODAL EDITAR
// ============================================================

document
    .getElementById(
        'cancelModalBtn'
    )
    ?.addEventListener(
        'click',
        () => {

            if (editModal) {

                editModal.style.display =
                    'none';

            }

        }
    );


// ============================================================
// CANCELAR MODAL REMOVER
// ============================================================

document
    .getElementById(
        'cancelRemoveModal'
    )
    ?.addEventListener(
        'click',
        () => {

            if (removeModal) {

                removeModal.style.display =
                    'none';

            }

        }
    );


// ============================================================
// FECHAR AO CLICAR FORA
// ============================================================

window.addEventListener(
    'click',
    event => {

        [

            editModal,

            removeModal,

            cadastrarProfModal,

            cadastrarAlunoModal,

            esqueciSenhaModal,

            gerenciarAlunosModal,

            gerenciarProfessoresModal,

            criarTurmaModal

        ]
            .forEach(
                modal => {

                    if (
                        modal &&
                        event.target ===
                        modal
                    ) {

                        modal.style.display =
                            'none';

                    }

                }
            );

    }
);


// ============================================================
// EXCLUIR CONTA
// ============================================================

document.addEventListener(
    'click',
    async event => {

        const btn =
            event.target.closest(
                '#btnExcluirMinhaConta'
            );

        if (!btn) {

            return;

        }

        if (!currentUser) {

            alert(
                '⚠️ Nenhum usuário conectado.'
            );

            return;

        }

        const confirmou =
            confirm(
                '⚠️ Tem certeza que deseja excluir sua conta?\n\n' +
                'Essa ação removerá seus dados do sistema e não poderá ser desfeita.'
            );

        if (!confirmou) {

            return;

        }

        try {

            btn.disabled =
                true;

            btn.innerHTML =
                '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

            const result =
                await excluirMinhaConta();

            if (!result?.success) {

                alert(
                    '❌ Não foi possível excluir sua conta:\n\n' +
                    (
                        result?.error ||
                        'Erro desconhecido.'
                    )
                );

                return;

            }

            alert(
                '✅ Sua conta foi excluída com sucesso.'
            );

            currentUser =
                null;

            currentUserRole =
                null;

            currentTurma =
                null;

            turmaSelecionada =
                null;

            turmasDisponiveis =
                [];

            ultimaSessaoPreparada =
                null;

            loginIniciadoManualmente =
                false;

            mostrarSomenteLogin();

        } catch (error) {

            console.error(
                'Erro excluindo conta:',
                error
            );

            alert(
                '❌ Erro ao excluir conta:\n\n' +
                error.message
            );

        } finally {

            btn.disabled =
                false;

            btn.innerHTML =
                '<i class="fas fa-trash"></i> Excluir minha conta';

        }

    }
);


// ============================================================
// OBSERVAR AUTENTICAÇÃO
// ============================================================

onAuthStateChange(
    async state => {

        console.log(
            'Estado de autenticação:',
            state
        );

        if (processandoEstadoAuth) {

            return;

        }

        processandoEstadoAuth =
            true;

        try {

            // ====================================================
            // USUÁRIO LOGADO
            // ====================================================

            if (
                state?.isLoggedIn &&
                state.user
            ) {

                currentUser =
                    state.user;

                // --------------------------------------------
                // Atualizar dados extras
                // --------------------------------------------

                if (
                    state.extraInfo
                ) {

                    userExtraInfo.nome =
                        state.extraInfo.nome || '';

                    userExtraInfo.turno =
                        state.extraInfo.turno || '';

                    userExtraInfo.professoresVinculados =
                        state.extraInfo.professoresVinculados || [];

                    userExtraInfo.historicoLogins =
                        state.extraInfo.historicoLogins || [];

                    userExtraInfo.dataHoraLogin =
                        state.extraInfo.dataHoraLogin || null;

                    userExtraInfo.turmasVinculadas =
                        state.extraInfo.turmasVinculadas || {};

                    userExtraInfo.turmaAtualId =
                        state.extraInfo.turmaAtualId || null;

                    userExtraInfo.turmaAtualNome =
                        state.extraInfo.turmaAtualNome || '';

                    userExtraInfo.turmaAtualCodigo =
                        state.extraInfo.turmaAtualCodigo || '';

                    userExtraInfo.role =
                        state.extraInfo.role ||
                        userExtraInfo.role ||
                        '';

                }

                // --------------------------------------------
                // Descobrir o perfil
                // --------------------------------------------

                currentUserRole =
                    state.role ||
                    state.extraInfo?.role ||
                    userExtraInfo?.role ||
                    currentUserRole ||
                    null;

                // --------------------------------------------
                // Se o Firebase ainda não entregou o role,
                // NÃO faz logout.
                // --------------------------------------------

                if (!currentUserRole) {

                    console.warn(
                        '⚠️ Usuário autenticado, aguardando perfil...'
                    );

                    authEstadoInicializado =
                        true;

                    return;

                }

                // --------------------------------------------
                // Restaurar turma salva localmente
                // --------------------------------------------

                // Professor volta para Minhas Turmas; cache não autoriza acesso.
                await prepararPosLogin(
                    state.user,
                    currentUserRole
                );

                authEstadoInicializado =
                    true;

                return;

            }

            // ====================================================
            // USUÁRIO REALMENTE DESLOGADO
            // ====================================================

            console.log(
                '🔴 Firebase informou que o usuário está deslogado.'
            );

            currentUser =
                null;

            currentUserRole =
                null;

            currentTurma =
                null;

            turmaSelecionada =
                null;

            turmasDisponiveis =
                [];

            ultimaSessaoPreparada =
                null;

            loginIniciadoManualmente =
                false;

            localStorage.removeItem(
                'turmaAtual'
            );

            localStorage.removeItem(
                'turmaAtualId'
            );

            localStorage.removeItem(
                'turmaAtualNome'
            );

            localStorage.removeItem(
                'turmaAtualCodigo'
            );

            window.senaiTurmaAtualId =
                null;

            mostrarSomenteLogin();

            authEstadoInicializado =
                true;

        } catch (error) {

            /*
             * IMPORTANTE:
             *
             * Um erro interno de carregamento
             * NÃO significa que o usuário saiu.
             */

            console.error(
                '❌ Erro processando estado de autenticação:',
                error
            );

            console.warn(
                '⚠️ Sessão não será encerrada automaticamente.'
            );

        } finally {

            processandoEstadoAuth =
                false;

        }

    }
);


// ============================================================
// RESPONSIVIDADE
// ============================================================

window.addEventListener(
    'resize',
    () => {

        if (
            window.innerWidth >
            900
        ) {

            closeSidebar();

        }

    }
);


// ============================================================
// INÍCIO
// ============================================================

console.log(
    '🚀 SENAI Plásticos iniciado!'
);
