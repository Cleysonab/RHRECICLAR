import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
// --- MUDANÇA AQUI: Usando Realtime Database ao invés de Firestore ---
import { 
  getDatabase, ref, set, push, remove, onValue 
} from 'firebase/database';
import { 
  Users, UserPlus, Briefcase, HeartPulse, Trash2, Edit, AlertCircle,
  CheckCircle2, XCircle, Search, LayoutDashboard, LogOut, MapPin, 
  ChevronRight, ChevronLeft, Menu, X, Download, Eye, Filter,
  User, Calendar, Plus, Check, Sparkles, XSquare
} from 'lucide-react';

// --- FIREBASE INITIALIZATION (CHAVES OFICIAIS + REALTIME DATABASE) ---
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCxbmThe7v1myHsFuT2jS0G6LX73W2XRFw',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'rh-reciclar.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://rh-reciclar-default-rtdb.firebaseio.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'rh-reciclar',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'rh-reciclar.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '191494601923',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:191494601923:web:4a027208c4e95dc27b7676'
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app); // Usando Realtime Database

// --- BRANDING OFICIAL INSTITUTO RECICLAR ---
const LOGO_URL = "/imagem_2026-10-27_083221970.png";

export default function SistemaRH() {
  // --- STATES ---
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard'); 
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // UI States
  const [toasts, setToasts] = useState([]);
  const [deleteConfirmation, setDeleteConfirmation] = useState(null);
  const [viewProfile, setViewProfile] = useState(null); 

  // Vacation Modal inside Profile
  const [showAddFerias, setShowAddFerias] = useState(false);
  const [novaFerias, setNovaFerias] = useState({
    inicio: '',
    diasGozo: '30',
    diasVenda: '0',
    observacao: 'Férias Regulares'
  });
  
  // Form State - 4 TABS (Pessoais, Contato, Contrato, Médico)
  const [formTab, setFormTab] = useState('pessoais'); 
  const tabsOrder = ['pessoais', 'contato', 'contrato', 'medico'];

  const initialFormState = {
    id: '',
    nome: '', cpf: '', rg: '', cnh: '', pis: '', ctps: '', dataNascimento: '', genero: '', estadoCivil: '', escolaridade: '', dependentes: '0',
    email: '', celular: '', cep: '', rua: '', bairro: '', cidade: '', estado: '',
    cargo: '', departamento: '', matricula: '', dataAdmissao: '', dataDemissao: '', 
    salario: '', tipoContrato: 'CLT', status: 'Ativo',
    banco: '', agencia: '', conta: '', tipoConta: 'Corrente',
    tipoSanguineo: '', alergias: '', medicamentos: '', contatoEmergencia: '', parentescoEmergencia: '',
    historicoFerias: []
  };
  
  const [formData, setFormData] = useState(initialFormState);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(Boolean(user));
      setAuthReady(true);
      if (user) setCurrentView('dashboard');
    });
    return unsubscribe;
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);
    const form = new FormData(e.currentTarget);
    const email = String(form.get('email') || '').trim();
    const password = String(form.get('password') || '');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setCurrentView('dashboard');
      showToast('Acesso autorizado.', 'success');
    } catch (error) {
      console.error('Falha no login:', error);
      const messages = {
        'auth/invalid-credential': 'E-mail ou senha incorretos.',
        'auth/user-not-found': 'Usuário não encontrado. Cadastre-o no Firebase Authentication.',
        'auth/wrong-password': 'E-mail ou senha incorretos.',
        'auth/invalid-email': 'Informe um e-mail válido.',
        'auth/too-many-requests': 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
        'auth/network-request-failed': 'Falha de conexão. Verifique sua internet.'
      };
      setLoginError(messages[error.code] || 'Não foi possível entrar. Confira o usuário e a configuração do Firebase.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setCurrentView('login');
      setIsMobileMenuOpen(false);
      setEmployees([]);
    } catch (error) {
      console.error('Erro ao sair:', error);
      showToast('Não foi possível encerrar a sessão.', 'error');
    }
  };

  // --- DATA FETCHING (REALTIME DATABASE) ---
  useEffect(() => {
    if (!isLoggedIn) return;

    setLoading(true);
    const dbRef = ref(db, 'colaboradores');

    const unsubscribe = onValue(dbRef, 
      (snapshot) => {
        const empData = [];
        snapshot.forEach((childSnapshot) => {
          empData.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });
        // Ordena por data de admissão mais recente
        empData.sort((a, b) => new Date(b.dataAdmissao) - new Date(a.dataAdmissao));
        setEmployees(empData);
        setLoading(false);
      },
      (error) => {
        console.error("Error:", error);
        showToast("Erro ao carregar dados do Realtime Database.", "error");
        setLoading(false);
      }
    );
    
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [isLoggedIn]);

  // --- CALCULADORA DE FÉRIAS CLT ---
  const calcularFerias = (dataAdmissaoStr) => {
    if (!dataAdmissaoStr) return null;
    const admissao = new Date(dataAdmissaoStr + 'T00:00:00');
    const hoje = new Date();
    
    if (isNaN(admissao.getTime())) return null;

    let anosTrabalhados = hoje.getFullYear() - admissao.getFullYear();
    const m = hoje.getMonth() - admissao.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < admissao.getDate())) {
      anosTrabalhados--;
    }
    if (anosTrabalhados < 0) anosTrabalhados = 0;

    const inicioAquisitivo = new Date(admissao);
    inicioAquisitivo.setFullYear(admissao.getFullYear() + anosTrabalhados);

    const fimAquisitivo = new Date(inicioAquisitivo);
    fimAquisitivo.setFullYear(inicioAquisitivo.getFullYear() + 1);
    fimAquisitivo.setDate(fimAquisitivo.getDate() - 1);

    const limiteConcessivo = new Date(fimAquisitivo);
    limiteConcessivo.setFullYear(limiteConcessivo.getFullYear() + 1);

    let statusFerias = "Em Período Aquisitivo";
    let badgeColor = "bg-[#00009C]/10 text-[#00009C] border-[#00009C]/20";

    if (hoje > fimAquisitivo) {
      if (hoje <= limiteConcessivo) {
        statusFerias = "Direito Adquirido (A Vencer)";
        badgeColor = "bg-[#00FF62]/10 text-emerald-800 border-[#00FF62]/40";
      } else {
        statusFerias = "Férias Vencidas (Atenção!)";
        badgeColor = "bg-[#F20DE7]/10 text-[#F20DE7] border-[#F20DE7]/20";
      }
    }

    return {
      periodoAquisitivo: `${inicioAquisitivo.toLocaleDateString('pt-BR')} à ${fimAquisitivo.toLocaleDateString('pt-BR')}`,
      limiteConcessivo: limiteConcessivo.toLocaleDateString('pt-BR'),
      diasDireitoTotal: 30,
      statusFerias,
      badgeColor
    };
  };

  // --- HANDLERS ---
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  // VIACEP API INTEGRATION
  const handleCepChange = async (e) => {
    let value = e.target.value.replace(/\D/g, ''); 
    if (value.length > 8) value = value.slice(0, 8);

    let maskedValue = value;
    if (value.length > 5) {
      maskedValue = `${value.slice(0, 5)}-${value.slice(5)}`;
    }

    setFormData(prev => ({ ...prev, cep: maskedValue }));

    if (value.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${value}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            rua: data.logradouro || prev.rua,
            bairro: data.bairro || prev.bairro,
            cidade: data.localidade || prev.cidade,
            estado: data.uf || prev.estado
          }));
          showToast("Endereço preenchido automaticamente!", "success");
        } else {
          showToast("CEP não encontrado.", "error");
        }
      } catch (error) {
        showToast("Erro ao buscar o CEP.", "error");
      }
    }
  };

  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const navigateTo = (view) => {
    if (view === 'form' && currentView !== 'form') {
      setFormData(initialFormState);
      setFormTab('pessoais');
    }
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  const handleEdit = (employee) => {
    setFormData({ ...initialFormState, ...employee, historicoFerias: employee.historicoFerias || [] });
    setFormTab('pessoais');
    setCurrentView('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) return;

    // Validação Manual Inteligente: Impede o salvamento silencioso e avisa o usuário.
    if (!formData.nome || !formData.cpf || !formData.cargo || !formData.dataAdmissao) {
      showToast("Preencha Nome, CPF, Cargo e Data de Admissão antes de salvar.", "error");
      
      if (!formData.nome || !formData.cpf) {
        setFormTab('pessoais');
      } else if (!formData.cargo || !formData.dataAdmissao) {
        setFormTab('contrato');
      }
      return;
    }

    try {
      let finalData = { ...formData };
      if (finalData.dataDemissao && new Date(finalData.dataDemissao) <= new Date()) {
        finalData.status = 'Desligado';
      }

      if (finalData.id) {
        // Atualiza registro existente no Realtime DB
        const empRef = ref(db, `colaboradores/${finalData.id}`);
        delete finalData.id;
        await set(empRef, finalData);
        showToast("Ficha atualizada com sucesso!");
      } else {
        // Adiciona novo registro no Realtime DB
        const listRef = ref(db, 'colaboradores');
        const newEmpRef = push(listRef);
        delete finalData.id;
        await set(newEmpRef, finalData);
        showToast("Colaborador registrado. A transformação não pode parar!");
      }
      
      setCurrentView('list');
    } catch (error) {
      console.error("Erro ao salvar:", error);
      showToast(`Erro de conexão com o banco de dados.`, "error");
    }
  };

  const executeDelete = async () => {
    if (!isLoggedIn || !deleteConfirmation) return;
    try {
      // Deleta registro no Realtime DB
      const empRef = ref(db, `colaboradores/${deleteConfirmation}`);
      await remove(empRef);
      showToast("Registro expurgado permanentemente.", "success");
    } catch (error) {
      showToast("Erro ao excluir registro.", "error");
    } finally {
      setDeleteConfirmation(null);
    }
  };

  // --- ADICIONAR / REMOVER FÉRIAS FRACIONADAS NA FICHA ---
  const handleAddFeriasItem = async () => {
    if (!viewProfile || !isLoggedIn) return;
    if (!novaFerias.inicio) {
      showToast("Informe a data de início das férias.", "error");
      return;
    }

    const novoItem = {
      id: Date.now().toString(),
      inicio: novaFerias.inicio,
      diasGozo: parseInt(novaFerias.diasGozo, 10) || 0,
      diasVenda: parseInt(novaFerias.diasVenda, 10) || 0,
      observacao: novaFerias.observacao || 'Férias'
    };

    const atualizadoHistorico = [...(viewProfile.historicoFerias || []), novoItem];
    const updatedEmp = { ...viewProfile, historicoFerias: atualizadoHistorico };

    try {
      // Salva array atualizado no Realtime DB
      const empRef = ref(db, `colaboradores/${viewProfile.id}`);
      const toSave = { ...updatedEmp };
      delete toSave.id;
      await set(empRef, toSave);
      
      setViewProfile(updatedEmp);
      setNovaFerias({ inicio: '', diasGozo: '30', diasVenda: '0', observacao: 'Férias Regulares' });
      setShowAddFerias(false);
      showToast("Período de férias registrado com sucesso!");
    } catch (err) {
      showToast("Erro ao registrar férias.", "error");
    }
  };

  const handleRemoveFeriasItem = async (feriasId) => {
    if (!viewProfile || !isLoggedIn) return;
    const atualizadoHistorico = (viewProfile.historicoFerias || []).filter(f => f.id !== feriasId);
    const updatedEmp = { ...viewProfile, historicoFerias: atualizadoHistorico };

    try {
      // Salva array atualizado no Realtime DB
      const empRef = ref(db, `colaboradores/${viewProfile.id}`);
      const toSave = { ...updatedEmp };
      delete toSave.id;
      await set(empRef, toSave);
      
      setViewProfile(updatedEmp);
      showToast("Registro de férias removido.");
    } catch (err) {
      showToast("Erro ao remover período.", "error");
    }
  };

  const exportToCSV = () => {
    if (employees.length === 0) {
      showToast("Não há dados para exportar.", "error");
      return;
    }
    const headers = ["Nome", "CPF", "Cargo", "Departamento", "Status", "Admissao", "Salario"];
    const rows = employees.map(e => [
      `"${e.nome || ''}"`,
      `"${e.cpf || ''}"`,
      `"${e.cargo || ''}"`,
      `"${e.departamento || ''}"`,
      `"${e.status || ''}"`,
      `"${e.dataAdmissao || ''}"`,
      `"${e.salario || ''}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "diretorio_funcionarios.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Diretório exportado para CSV com sucesso!");
  };

  const exportProfileToTXT = (emp) => {
    const feriasInfo = calcularFerias(emp.dataAdmissao);
    const historico = emp.historicoFerias || [];
    const totalGozo = historico.reduce((acc, curr) => acc + (parseInt(curr.diasGozo, 10) || 0), 0);
    const totalVenda = historico.reduce((acc, curr) => acc + (parseInt(curr.diasVenda, 10) || 0), 0);

    const content = `FICHA DO COLABORADOR - ${emp.nome}
=========================================
INSTITUTO RECICLAR - SISTEMA DE RH
=========================================

DADOS PESSOAIS E DOCUMENTOS
-----------------------------------------
Nome: ${emp.nome || 'N/A'}
CPF: ${emp.cpf || 'N/A'}
RG: ${emp.rg || 'N/A'}
CNH: ${emp.cnh || 'N/A'}
PIS/PASEP: ${emp.pis || 'N/A'}
CTPS: ${emp.ctps || 'N/A'}
Nascimento: ${emp.dataNascimento ? new Date(emp.dataNascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}
Gênero: ${emp.genero || 'N/A'}
Estado Civil: ${emp.estadoCivil || 'N/A'}
Escolaridade: ${emp.escolaridade || 'N/A'}
Dependentes: ${emp.dependentes || '0'}

CONTATO E ENDEREÇO
-----------------------------------------
Email Pessoal: ${emp.email || 'N/A'}
Celular/Whats: ${emp.celular || 'N/A'}
Endereço: ${emp.rua || 'N/A'}, ${emp.bairro || 'N/A'}, ${emp.cidade || 'N/A'} - ${emp.estado || 'N/A'}
CEP: ${emp.cep || 'N/A'}

CONTRATO E FINANCEIRO
-----------------------------------------
Cargo: ${emp.cargo || 'N/A'}
Departamento: ${emp.departamento || 'N/A'}
Status: ${emp.status || 'Ativo'}
Matrícula: ${emp.matricula || 'N/A'}
Data Admissão: ${emp.dataAdmissao ? new Date(emp.dataAdmissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}
Data Demissão: ${emp.dataDemissao ? new Date(emp.dataDemissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A'}
Tipo Contrato: ${emp.tipoContrato || 'N/A'}
Salário: R$ ${emp.salario || 'N/A'}
Banco: ${emp.banco || 'N/A'}
Agência: ${emp.agencia || 'N/A'}
Conta: ${emp.conta || 'N/A'} (${emp.tipoConta || 'N/A'})

CONTROLE DE FÉRIAS (CLT & FRACIONAMENTO)
-----------------------------------------
Período Aquisitivo: ${feriasInfo ? feriasInfo.periodoAquisitivo : 'N/A'}
Limite Concessivo: ${feriasInfo ? feriasInfo.limiteConcessivo : 'N/A'}
Situação: ${feriasInfo ? feriasInfo.statusFerias : 'N/A'}
Total de Dias Gozados: ${totalGozo} dias
Total de Dias Vendidos (Abono): ${totalVenda} dias
Saldo Restante: ${30 - (totalGozo + totalVenda)} dias

REGISTROS DE GOZO:
${historico.length === 0 ? 'Nenhum período cadastrado.' : historico.map(h => `- Início: ${h.inicio} | Gozo: ${h.diasGozo}d | Venda: ${h.diasVenda}d | Obs: ${h.observacao}`).join('\n')}

SAÚDE E EMERGÊNCIA
-----------------------------------------
Tipo Sanguíneo: ${emp.tipoSanguineo || 'Desconhecido'}
Alergias: ${emp.alergias || 'Nenhuma informada'}
Condições Médicas/Medicamentos: ${emp.medicamentos || 'Nenhum'}
Contato de Emergência: ${emp.contatoEmergencia || 'N/A'} (${emp.parentescoEmergencia || 'N/A'})
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `ficha_${emp.nome.replace(/\s+/g, '_')}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Ficha exportada com sucesso.");
  };

  // --- CALCULATIONS & FILTERS ---
  const getDisplayStatus = (emp) => {
    if (emp.status === 'Desligado') return 'Desligado';
    if (emp.status === 'Férias') return 'Férias';
    
    // Verificação Automática: Checa se a data de HOJE está dentro de algum período de férias
    if (emp.historicoFerias && Array.isArray(emp.historicoFerias)) {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      const emGozo = emp.historicoFerias.some(h => {
        if (!h.inicio || !h.diasGozo) return false;
        const inicio = new Date(h.inicio + 'T00:00:00');
        const fim = new Date(inicio);
        fim.setDate(fim.getDate() + parseInt(h.diasGozo, 10) - 1);
        return hoje >= inicio && hoje <= fim;
      });
      
      if (emGozo) return 'Férias';
    }
    
    return emp.status || 'Ativo';
  };

  const departments = [...new Set(employees.map(e => e.departamento).filter(Boolean))];

  const filteredEmployees = employees.filter(emp => {
    const matchSearch = (emp.nome || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                        (emp.cpf || '').includes(searchTerm);
    const matchDept = filterDept ? emp.departamento === filterDept : true;
    const currentStatus = getDisplayStatus(emp);
    const matchStatus = filterStatus ? currentStatus === filterStatus : true;
    return matchSearch && matchDept && matchStatus;
  });

  const totalCount = employees.length;
  const activeCount = employees.filter(e => getDisplayStatus(e) === 'Ativo').length;
  const onVacationCount = employees.filter(e => getDisplayStatus(e) === 'Férias').length;
  const terminatedCount = employees.filter(e => getDisplayStatus(e) === 'Desligado').length;

  const getStatusColor = (status) => {
    switch(status) {
      case 'Ativo': return 'bg-[#00FF62]/10 text-emerald-800 border-[#00FF62]/40';
      case 'Férias': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Afastado': return 'bg-[#00009C]/10 text-[#00009C] border-[#00009C]/40';
      case 'Desligado': return 'bg-[#F20DE7]/10 text-[#F20DE7] border-[#F20DE7]/20';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  // --- VIEWS ---

  if (!authReady) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600">Verificando sessão segura...</div>;
  }

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden font-sans">
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');
          body { font-family: 'Open Sans', sans-serif; }
        `}</style>
        
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col relative z-10 border border-slate-200">
          <div className="h-2 w-full bg-gradient-to-r from-[#00009C] via-[#00FF62] to-[#F20DE7]"></div>
          
          <div className="bg-white p-8 pb-4 text-center">
            <img src={LOGO_URL} alt="Instituto Reciclar" className="h-14 mx-auto object-contain" />
            <h1 className="text-xl font-bold text-[#00009C] mt-6 tracking-tight">Sistema de RH Reciclar</h1>
            <p className="text-slate-500 mt-1 text-sm font-medium">Impulsionar novas realidades. Hoje e sempre.</p>
          </div>
          <form onSubmit={handleLogin} className="p-8 pt-4 space-y-5">
            <div>
              <label className="block text-sm font-bold text-[#00009C] mb-1.5">E-mail Corporativo</label>
              <input 
                type="email" name="email" autoComplete="username" required placeholder="admin@reciclar.org.br"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none transition-all bg-slate-50 text-slate-800 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-[#00009C] mb-1.5">Senha</label>
              <input 
                type="password" name="password" autoComplete="current-password" required placeholder="Digite sua senha"
                className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none transition-all bg-slate-50 text-slate-800 font-medium"
              />
            </div>
            {loginError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">{loginError}</p>}
            <button type="submit" disabled={loginLoading} className="w-full bg-[#00009C] text-white font-bold py-3.5 px-4 rounded-xl hover:opacity-90 disabled:opacity-60 focus:ring-4 focus:ring-[#00009C]/30 transition-all shadow-md flex justify-center items-center gap-2 mt-2">
              {loginLoading ? 'Entrando...' : 'Faz Acontecer'} <ChevronRight className="w-5 h-5" />
            </button>
            <p className="text-center text-xs text-slate-400 font-medium pt-2">Acesso restrito a usuários autorizados.</p>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-800">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600;700;800&display=swap');
        body { font-family: 'Open Sans', sans-serif; }
      `}</style>
      
      {/* TOAST NOTIFICATIONS */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(toast => (
          <div key={toast.id} className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg text-sm font-bold text-white animate-in slide-in-from-right-8 fade-in ${toast.type === 'error' ? 'bg-[#F20DE7]' : 'bg-[#00009C]'}`}>
            {toast.type === 'error' ? <XCircle className="w-5 h-5" /> : <Sparkles className="w-5 h-5 text-[#00FF62]" />}
            {toast.message}
          </div>
        ))}
      </div>

      {/* SIDEBAR (Desktop) */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white text-slate-600 transition-transform duration-300 ease-in-out border-r border-slate-200
        md:relative md:translate-x-0 flex flex-col shadow-sm
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-1.5 w-full bg-gradient-to-r from-[#00009C] via-[#00FF62] to-[#F20DE7]"></div>
        
        <div className="h-16 flex items-center px-4 border-b border-slate-100">
          <div className="w-full flex justify-center md:justify-start">
            <img src={LOGO_URL} alt="Instituto Reciclar" className="h-8 object-contain" />
          </div>
          <button className="ml-auto md:hidden text-slate-400 hover:text-[#00009C]" onClick={() => setIsMobileMenuOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="px-4 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Painel Principal</p>
          <nav className="space-y-1.5">
            <button onClick={() => navigateTo('dashboard')} className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all ${currentView === 'dashboard' ? 'bg-[#00009C]/5 text-[#00009C] font-bold border-r-4 border-[#00009C]' : 'hover:bg-slate-50 hover:text-[#00009C] font-semibold'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3" /> Dashboard
            </button>
            <button onClick={() => navigateTo('list')} className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all ${currentView === 'list' ? 'bg-[#00009C]/5 text-[#00009C] font-bold border-r-4 border-[#00009C]' : 'hover:bg-slate-50 hover:text-[#00009C] font-semibold'}`}>
              <Users className="w-5 h-5 mr-3" /> Diretório
            </button>
          </nav>
        </div>

        <div className="px-4 py-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">Colaboradores</p>
          <nav className="space-y-1.5">
            <button onClick={() => navigateTo('form')} className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all ${currentView === 'form' ? 'bg-[#00009C]/5 text-[#00009C] font-bold border-r-4 border-[#00009C]' : 'hover:bg-slate-50 hover:text-[#00009C] font-semibold'}`}>
              <UserPlus className="w-5 h-5 mr-3" /> Nova Ficha
            </button>
          </nav>
        </div>

        <div className="mt-auto p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center px-2 py-2 mb-3">
            <div className="w-9 h-9 rounded-full bg-[#00009C]/10 border border-[#00009C]/20 flex items-center justify-center mr-3 font-bold text-[#00009C] text-sm">
              RH
            </div>
            <div className="text-sm overflow-hidden">
              <p className="font-bold text-[#00009C] truncate">Equipe RH</p>
              <p className="text-slate-500 text-xs truncate">Administrador</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 hover:text-[#00009C] rounded-lg transition-colors border border-slate-200 bg-white shadow-sm">
            <LogOut className="w-4 h-4 mr-2" /> Sair
          </button>
        </div>
      </aside>

      {/* OVERLAY MOBILE */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden bg-slate-50">
        
        {/* MOBILE HEADER */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between shrink-0 shadow-sm relative">
          <div className="absolute top-0 left-0 h-1.5 w-full bg-gradient-to-r from-[#00009C] via-[#00FF62] to-[#F20DE7]"></div>
          <div className="flex items-center mt-1">
            <img src={LOGO_URL} alt="Instituto Reciclar" className="h-6 object-contain" />
          </div>
          <button onClick={() => setIsMobileMenuOpen(true)} className="text-slate-600 p-2 bg-slate-100 rounded-lg mt-1 hover:text-[#00009C]">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8 scroll-smooth">
          
          {/* FICHA DO COLABORADOR MODAL */}
          {viewProfile && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 md:p-8 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-auto animate-in zoom-in-95 overflow-hidden flex flex-col max-h-full border border-slate-200">
                
                {/* Modal Header */}
                <div className="bg-white px-6 py-4 flex items-center justify-between shrink-0 relative overflow-hidden border-b border-slate-200">
                  <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#00009C] via-[#00FF62] to-[#F20DE7]"></div>
                  
                  <div className="flex items-center gap-4 z-10 mt-1">
                    <div className="w-12 h-12 rounded-full bg-[#00009C]/10 flex items-center justify-center text-xl font-bold text-[#00009C] border border-[#00009C]/20">
                      {viewProfile.nome ? viewProfile.nome.charAt(0) : '?'}
                    </div>
                    <div>
                      <h3 className="text-xl font-extrabold text-[#00009C] leading-tight">{viewProfile.nome}</h3>
                      <p className="text-slate-500 text-sm font-bold">{viewProfile.cargo} • {viewProfile.departamento}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 z-10 mt-1">
                    <button onClick={() => exportProfileToTXT(viewProfile)} className="flex items-center gap-2 text-white bg-[#00009C] hover:opacity-90 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm">
                      <Download className="w-4 h-4" /> Exportar TXT
                    </button>
                    <button onClick={() => setViewProfile(null)} className="text-slate-400 hover:text-[#F20DE7] p-2 rounded-lg hover:bg-slate-100 transition-colors">
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Card: Pessoal & Docs */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                      <h4 className="flex items-center gap-2 font-bold text-[#00009C] mb-4 border-b border-slate-100 pb-3">
                        <User className="w-4 h-4" /> Dados Pessoais
                      </h4>
                      <div className="space-y-3 text-sm">
                        <p><span className="text-slate-500 font-semibold w-28 inline-block">CPF:</span> <span className="font-bold text-slate-700">{viewProfile.cpf || '-'}</span></p>
                        <p><span className="text-slate-500 font-semibold w-28 inline-block">RG:</span> <span className="font-bold text-slate-700">{viewProfile.rg || '-'}</span></p>
                        <p><span className="text-slate-500 font-semibold w-28 inline-block">PIS:</span> <span className="font-bold text-slate-700">{viewProfile.pis || '-'}</span></p>
                        <p><span className="text-slate-500 font-semibold w-28 inline-block">CTPS:</span> <span className="font-bold text-slate-700">{viewProfile.ctps || '-'}</span></p>
                        <div className="pt-3 border-t border-slate-100 mt-2">
                          <p><span className="text-slate-500 font-semibold w-28 inline-block">Nascimento:</span> <span className="font-bold text-slate-700">{viewProfile.dataNascimento ? new Date(viewProfile.dataNascimento).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}</span></p>
                          <p><span className="text-slate-500 font-semibold w-28 inline-block">Gênero:</span> <span className="font-bold text-slate-700">{viewProfile.genero || '-'}</span></p>
                          <p><span className="text-slate-500 font-semibold w-28 inline-block">Estado Civil:</span> <span className="font-bold text-slate-700">{viewProfile.estadoCivil || '-'}</span></p>
                          <p><span className="text-slate-500 font-semibold w-28 inline-block">Escolaridade:</span> <span className="font-bold text-slate-700">{viewProfile.escolaridade || '-'}</span></p>
                          <p className="mt-1"><span className="text-slate-500 font-semibold w-28 inline-block">Dependentes:</span> <span className="font-bold text-[#00009C] bg-[#00009C]/10 px-2.5 py-0.5 rounded-full text-xs">{viewProfile.dependentes || '0'}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Card: Contato */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                      <h4 className="flex items-center gap-2 font-bold text-[#00009C] mb-4 border-b border-slate-100 pb-3">
                        <MapPin className="w-4 h-4" /> Contato e Endereço
                      </h4>
                      <div className="space-y-3 text-sm">
                        <p><span className="text-slate-500 font-semibold block mb-0.5">Email Pessoal:</span> <span className="font-bold text-slate-700">{viewProfile.email || '-'}</span></p>
                        <p><span className="text-slate-500 font-semibold block mb-0.5">Celular:</span> <span className="font-bold text-slate-700">{viewProfile.celular || '-'}</span></p>
                        <div className="pt-3 border-t border-slate-100 mt-2">
                          <p><span className="text-slate-500 font-semibold block mb-0.5">Endereço:</span> <span className="font-bold text-slate-700">{viewProfile.rua || '-'}</span></p>
                          <p className="mt-2"><span className="text-slate-500 font-semibold block mb-0.5">Localidade:</span> <span className="font-bold text-slate-700">{viewProfile.bairro || '-'}, {viewProfile.cidade || '-'} - {viewProfile.estado}</span></p>
                          <p className="mt-2"><span className="text-slate-500 font-semibold block mb-0.5">CEP:</span> <span className="font-bold text-slate-700">{viewProfile.cep || '-'}</span></p>
                        </div>
                      </div>
                    </div>

                    {/* Card: Contrato e Financeiro */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm lg:col-span-1">
                      <h4 className="flex items-center gap-2 font-bold text-[#00009C] mb-4 border-b border-slate-100 pb-3">
                        <Briefcase className="w-4 h-4" /> Contrato & Banco
                      </h4>
                      <div className="space-y-3 text-sm">
                        <p><span className="text-slate-500 font-semibold w-24 inline-block">Status:</span> 
                          <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${getStatusColor(getDisplayStatus(viewProfile))} ml-1`}>{getDisplayStatus(viewProfile)}</span>
                        </p>
                        <p><span className="text-slate-500 font-semibold w-24 inline-block">Matrícula:</span> <span className="font-bold text-slate-700">{viewProfile.matricula || '-'}</span></p>
                        <p><span className="text-slate-500 font-semibold w-24 inline-block">Admissão:</span> <span className="font-bold text-slate-700">{viewProfile.dataAdmissao ? new Date(viewProfile.dataAdmissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}</span></p>
                        <p><span className="text-slate-500 font-semibold w-24 inline-block">Contrato:</span> <span className="font-bold text-slate-700">{viewProfile.tipoContrato || '-'}</span></p>
                        <p><span className="text-slate-500 font-semibold w-24 inline-block">Salário:</span> <span className="font-bold text-[#00009C]">R$ {viewProfile.salario || '-'}</span></p>
                        <div className="pt-3 border-t border-slate-100 mt-2">
                          <p><span className="text-slate-500 font-semibold block mb-1">Instituição Bancária:</span> <span className="font-bold text-slate-700">{viewProfile.banco || '-'}</span></p>
                          <p className="mt-1.5"><span className="text-slate-500 font-semibold w-16 inline-block">Agência:</span> <span className="font-bold text-slate-700">{viewProfile.agencia || '-'}</span></p>
                          <p><span className="text-slate-500 font-semibold w-16 inline-block">Conta:</span> <span className="font-bold text-slate-700">{viewProfile.conta || '-'} <span className="text-slate-400 font-normal">({viewProfile.tipoConta || '-'})</span></span></p>
                        </div>
                      </div>
                    </div>

                    {/* Card: Cálculo e Gestão de Férias CLT (Fracionamento & Abono) */}
                    <div className="bg-white rounded-xl p-5 border-l-4 border-l-[#00009C] border-y border-r border-slate-200 shadow-sm lg:col-span-3 relative overflow-hidden">
                      
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4 relative z-10">
                        <div>
                          <h4 className="flex items-center gap-2 font-bold text-[#00009C] text-base">
                            <Calendar className="w-5 h-5" /> Gestão de Férias e Fracionamentos
                          </h4>
                          <p className="text-xs text-slate-500 font-bold mt-1">Nossa história é feita de todas as outras. Planeje as pausas aqui.</p>
                        </div>
                        <button 
                          onClick={() => setShowAddFerias(!showAddFerias)}
                          className="px-4 py-2 bg-[#00009C] hover:opacity-90 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 self-start md:self-auto shadow-sm"
                        >
                          <Plus className="w-4 h-4" /> {showAddFerias ? 'Cancelar Lançamento' : 'Lançar Período'}
                        </button>
                      </div>

                      {/* Formulário rápido para adicionar férias */}
                      {showAddFerias && (
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 mb-5 space-y-4 animate-in fade-in relative z-10">
                          <p className="text-xs font-bold text-[#00009C] uppercase tracking-widest">Novo Lançamento de Gozo</p>
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                            <div>
                              <label className="block text-xs font-bold text-[#00009C] mb-1.5">Início das Férias</label>
                              <input 
                                type="date" value={novaFerias.inicio} 
                                onChange={(e) => setNovaFerias({...novaFerias, inicio: e.target.value})}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-[#00009C] outline-none" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#00009C] mb-1.5">Dias de Gozo</label>
                              <input 
                                type="number" min="1" max="30" value={novaFerias.diasGozo} 
                                onChange={(e) => setNovaFerias({...novaFerias, diasGozo: e.target.value})}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-[#00009C] outline-none" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#00009C] mb-1.5">Dias Vendidos (Abono)</label>
                              <input 
                                type="number" min="0" max="10" value={novaFerias.diasVenda} 
                                onChange={(e) => setNovaFerias({...novaFerias, diasVenda: e.target.value})}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-[#00009C] outline-none" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-[#00009C] mb-1.5">Observação</label>
                              <input 
                                type="text" value={novaFerias.observacao} placeholder="Ex: 1º Período"
                                onChange={(e) => setNovaFerias({...novaFerias, observacao: e.target.value})}
                                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white font-bold focus:ring-2 focus:ring-[#00009C] outline-none" 
                              />
                            </div>
                          </div>
                          <div className="flex justify-end pt-2">
                            <button 
                              onClick={handleAddFeriasItem}
                              className="px-5 py-2.5 bg-[#00FF62] text-[#00009C] rounded-lg text-sm font-extrabold transition-all flex items-center gap-2 shadow-sm hover:brightness-95"
                            >
                              <Check className="w-4 h-4" /> Confirmar Lançamento
                            </button>
                          </div>
                        </div>
                      )}

                      {(() => {
                        const ferias = calcularFerias(viewProfile.dataAdmissao);
                        const historico = viewProfile.historicoFerias || [];
                        const totalGozo = historico.reduce((acc, curr) => acc + (parseInt(curr.diasGozo, 10) || 0), 0);
                        const totalVenda = historico.reduce((acc, curr) => acc + (parseInt(curr.diasVenda, 10) || 0), 0);
                        const saldoRestante = 30 - (totalGozo + totalVenda);

                        if (!ferias) return <p className="text-slate-500 text-sm font-bold relative z-10">Data de admissão não informada para cálculo automático.</p>;
                        
                        return (
                          <div className="space-y-5 relative z-10">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-1">PERÍODO AQUISITIVO</span>
                                <span className="font-bold text-slate-800 text-sm">{ferias.periodoAquisitivo}</span>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-1">LIMITE CONCESSIVO</span>
                                <span className="font-bold text-slate-800 text-sm">{ferias.limiteConcessivo}</span>
                              </div>
                              <div className="bg-[#00FF62]/10 p-4 rounded-xl border border-[#00FF62]/30">
                                <span className="text-emerald-800 block text-[10px] font-bold uppercase tracking-wider mb-1">SALDO REMANESCENTE</span>
                                <span className={`font-extrabold text-lg ${saldoRestante < 0 ? 'text-[#F20DE7]' : 'text-[#00009C]'}`}>
                                  {saldoRestante} <span className="text-sm font-bold">dias</span>
                                </span>
                              </div>
                              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center">
                                <span className="text-slate-400 block text-[10px] font-bold uppercase tracking-wider mb-1">SITUAÇÃO ATUAL</span>
                                <span className={`px-2.5 py-1.5 rounded text-xs font-bold border text-center ${ferias.badgeColor}`}>
                                  {ferias.statusFerias}
                                </span>
                              </div>
                            </div>

                            {/* Tabela de Lançamentos de Gozo/Fracionamento */}
                            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 text-xs font-bold text-[#00009C] uppercase tracking-widest">
                                Histórico de Gozos e Abonos
                              </div>
                              {historico.length === 0 ? (
                                <div className="p-6 text-center text-slate-400 text-sm font-bold">
                                  Nenhum período lançado. A transformação é contínua, planeje as pausas no botão acima.
                                </div>
                              ) : (
                                <div className="divide-y divide-slate-100">
                                  {historico.map((h) => (
                                    <div key={h.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between text-sm hover:bg-slate-50 transition-colors gap-3">
                                      <div className="flex flex-wrap items-center gap-3">
                                        <div className="font-bold text-slate-800 min-w-[120px]">
                                          Início: {new Date(h.inicio + 'T00:00:00').toLocaleDateString('pt-BR')}
                                        </div>
                                        <div className="text-[#00009C] bg-[#00009C]/10 px-2.5 py-1 rounded text-xs font-bold border border-[#00009C]/20">
                                          Gozo: {h.diasGozo} dias
                                        </div>
                                        {parseInt(h.diasVenda, 10) > 0 && (
                                          <div className="text-[#F20DE7] bg-[#F20DE7]/10 px-2.5 py-1 rounded text-xs font-bold border border-[#F20DE7]/20">
                                            Abono: {h.diasVenda} dias
                                          </div>
                                        )}
                                        <div className="text-slate-500 text-xs font-semibold ml-2 italic">
                                          "{h.observacao}"
                                        </div>
                                      </div>
                                      <button 
                                        onClick={() => handleRemoveFeriasItem(h.id)}
                                        className="text-slate-400 hover:text-[#F20DE7] p-2 rounded-lg hover:bg-[#F20DE7]/10 transition-colors self-end sm:self-auto"
                                        title="Remover período"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Card: Saúde */}
                    <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm lg:col-span-3">
                      <h4 className="flex items-center gap-2 font-bold text-[#F20DE7] mb-4 border-b border-slate-100 pb-3">
                        <HeartPulse className="w-4 h-4" /> Saúde e Emergência
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div>
                           <p><span className="text-slate-500 font-semibold w-28 inline-block mb-1.5">Tipo Sanguíneo:</span> <span className="font-extrabold text-[#F20DE7] text-base bg-[#F20DE7]/10 px-3 py-1 rounded-lg border border-[#F20DE7]/20">{viewProfile.tipoSanguineo || '-'}</span></p>
                        </div>
                        <div>
                           <p><span className="text-slate-500 font-semibold block mb-1">Alergias:</span> <span className="font-bold text-slate-700">{viewProfile.alergias || 'Nenhuma informada'}</span></p>
                           <p className="mt-3"><span className="text-slate-500 font-semibold block mb-1">Condições/Meds:</span> <span className="font-bold text-slate-700">{viewProfile.medicamentos || 'Nenhum'}</span></p>
                        </div>
                        <div className="border-l border-slate-100 pl-6">
                          <p className="text-slate-500 font-semibold mb-1">Contato de Emergência:</p>
                          <p className="font-bold text-[#00009C] text-base">{viewProfile.contatoEmergencia || '-'}</p>
                          <p className="text-slate-400 font-bold text-xs uppercase tracking-wider mt-1">{viewProfile.parentescoEmergencia || '-'}</p>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          )}

          {/* DELETE MODAL */}
          {deleteConfirmation && (
            <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 border border-slate-200">
                <div className="w-16 h-16 bg-[#F20DE7]/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                  <AlertCircle className="w-8 h-8 text-[#F20DE7]" />
                </div>
                <h3 className="text-2xl font-extrabold text-[#00009C] text-center mb-3">Remover Ficha?</h3>
                <p className="text-slate-500 text-center mb-8 font-bold">
                  Esta ação é irreversível e excluirá o histórico do sistema.
                </p>
                <div className="flex justify-center gap-3">
                  <button onClick={() => setDeleteConfirmation(null)} className="px-6 py-3 font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
                    Cancelar
                  </button>
                  <button onClick={executeDelete} className="px-6 py-3 font-bold text-white bg-[#F20DE7] rounded-xl hover:opacity-90 transition-colors shadow-sm">
                    Confirmar Exclusão
                  </button>
                </div>
              </div>
            </div>
          )}

          {loading ? (
             <div className="flex items-center justify-center h-full">
               <div className="flex flex-col items-center gap-4">
                 <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-[#00009C]"></div>
                 <p className="text-[#00009C] font-bold tracking-widest uppercase text-xs">Sincronizando dados...</p>
               </div>
             </div>
          ) : (
            <>
              {/* --- DASHBOARD VIEW --- */}
              {currentView === 'dashboard' && (
                <div className="space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
                  <div>
                    <h2 className="text-3xl font-extrabold text-[#00009C] tracking-tight">Sistema de RH Reciclar</h2>
                    <p className="text-slate-500 mt-1.5 font-bold">A transformação não pode parar. Acompanhe nossos talentos.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                    {/* Card 1 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-[#00009C]/30 transition-colors">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform"><Users className="w-20 h-20" /></div>
                      <p className="text-xs font-bold text-[#00009C] uppercase tracking-widest mb-2">Total de Talentos</p>
                      <p className="text-4xl font-extrabold text-[#00009C]">{totalCount}</p>
                    </div>
                    
                    {/* Card 2 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-[#00FF62]/50 transition-colors">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-[#00FF62]"><CheckCircle2 className="w-20 h-20" /></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Ativos no Instituto</p>
                      <p className="text-4xl font-extrabold text-slate-800">{activeCount}</p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-amber-300 transition-colors">
                      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform text-amber-500"><Calendar className="w-20 h-20" /></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Em Férias</p>
                      <p className="text-4xl font-extrabold text-slate-800">{onVacationCount}</p>
                    </div>

                    {/* Card 4 */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 relative overflow-hidden group hover:border-slate-300 transition-colors">
                      <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-110 transition-transform"><XSquare className="w-20 h-20" /></div>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Desligados</p>
                      <p className="text-4xl font-extrabold text-slate-800">{terminatedCount}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* --- LIST VIEW --- */}
              {currentView === 'list' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-500 h-[calc(100vh-8rem)] max-w-7xl mx-auto">
                  
                  {/* ToolBar */}
                  <div className="p-6 border-b border-slate-200 bg-white space-y-5">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-extrabold text-[#00009C] tracking-tight">Diretório de Colaboradores</h2>
                        <p className="text-sm text-slate-500 font-bold mt-1">Nossa história é feita de todas as outras. Encontre nossos talentos.</p>
                      </div>
                      <button onClick={exportToCSV} className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-[#00009C]/5 text-[#00009C] text-sm font-bold rounded-xl hover:bg-[#00009C]/10 transition-colors">
                        <Download className="w-4 h-4" /> Exportar CSV
                      </button>
                    </div>
                    
                    {/* Filters Row */}
                    <div className="flex flex-col md:flex-row gap-4 pt-1">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input type="text" placeholder="Buscar por nome ou CPF..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-700" />
                      </div>
                      
                      <div className="flex gap-4 flex-1 md:flex-none">
                        <div className="relative flex-1 md:w-56">
                          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00009C]" />
                          <select value={filterDept} onChange={(e) => setFilterDept(e.target.value)} className="w-full pl-11 pr-8 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-[#00009C] appearance-none text-sm">
                            <option value="">Todos os Departamentos</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="relative flex-1 md:w-48">
                          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#00009C]" />
                          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full pl-11 pr-8 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-[#00009C] appearance-none text-sm">
                            <option value="">Todos Status</option>
                            <option value="Ativo">Ativo</option>
                            <option value="Férias">Férias</option>
                            <option value="Afastado">Afastado</option>
                            <option value="Desligado">Desligado</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto flex-1 h-full">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 text-left text-[10px] font-extrabold text-[#00009C] uppercase tracking-widest">Colaborador</th>
                          <th className="px-6 py-4 text-left text-[10px] font-extrabold text-[#00009C] uppercase tracking-widest">Cargo / Depto</th>
                          <th className="px-6 py-4 text-left text-[10px] font-extrabold text-[#00009C] uppercase tracking-widest">Status</th>
                          <th className="px-6 py-4 text-left text-[10px] font-extrabold text-[#00009C] uppercase tracking-widest">Admissão</th>
                          <th className="px-6 py-4 text-right text-[10px] font-extrabold text-[#00009C] uppercase tracking-widest">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-slate-100">
                        {filteredEmployees.length === 0 ? (
                          <tr><td colSpan="5" className="px-6 py-16 text-center text-slate-500 font-bold">Nenhum registro corresponde aos filtros atuais.</td></tr>
                        ) : (
                          filteredEmployees.map((emp) => (
                            <tr key={emp.id} className="hover:bg-slate-50/50 transition-colors group">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-full bg-[#00009C]/10 text-[#00009C] flex items-center justify-center font-extrabold text-sm border border-[#00009C]/20">
                                    {emp.nome ? emp.nome.charAt(0).toUpperCase() : '?'}
                                  </div>
                                  <div>
                                    <div className="text-sm font-extrabold text-[#00009C]">{emp.nome}</div>
                                    <div className="text-xs text-slate-500 font-semibold mt-0.5">{emp.cpf}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-slate-700 font-bold">{emp.cargo || '-'}</div>
                                <div className="text-xs text-slate-500 bg-slate-100 inline-block px-2.5 py-0.5 rounded-md mt-1.5 font-bold">{emp.departamento || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 inline-flex text-[11px] font-bold rounded-full border tracking-wide ${getStatusColor(getDisplayStatus(emp))}`}>
                                  {getDisplayStatus(emp)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-bold">
                                {emp.dataAdmissao ? new Date(emp.dataAdmissao).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                                <div className="flex justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setViewProfile(emp)} className="p-2 text-[#00009C] hover:bg-[#00009C]/10 rounded-lg transition-colors" title="Ficha do Colaborador">
                                    <Eye className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => handleEdit(emp)} className="p-2 text-slate-500 hover:bg-slate-200 rounded-lg transition-colors" title="Editar Dados">
                                    <Edit className="w-5 h-5" />
                                  </button>
                                  <button onClick={() => setDeleteConfirmation(emp.id)} className="p-2 text-[#F20DE7] hover:bg-[#F20DE7]/10 rounded-lg transition-colors" title="Excluir">
                                    <Trash2 className="w-5 h-5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* --- FORM VIEW (4 ABAS) --- */}
              {currentView === 'form' && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 max-w-5xl mx-auto animate-in fade-in duration-500 overflow-hidden">
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#00009C] via-[#00FF62] to-[#F20DE7]"></div>
                  
                  <div className="p-6 md:p-8 border-b border-slate-100">
                    <h2 className="text-2xl font-extrabold text-[#00009C] tracking-tight">
                      {formData.id ? 'Atualização de Ficha' : 'Ficha do Colaborador'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1.5 font-bold">Impulsionar novas realidades. Preencha os dados do talento.</p>
                  </div>
                  
                  {/* TABS HEADER - 4 ABAS */}
                  <div className="flex overflow-x-auto border-b border-slate-200 bg-slate-50/50 hide-scrollbar px-4 pt-2">
                    {[
                      { id: 'pessoais', icon: User, label: 'Pessoais & Docs' },
                      { id: 'contato', icon: MapPin, label: 'Contato & Endereço' },
                      { id: 'contrato', icon: Briefcase, label: 'Contrato & Banco' },
                      { id: 'medico', icon: HeartPulse, label: 'Saúde & Emergência' }
                    ].map(tab => (
                      <button 
                        key={tab.id} type="button" onClick={() => setFormTab(tab.id)}
                        className={`px-5 py-4 text-sm font-bold whitespace-nowrap border-b-2 flex items-center gap-2.5 transition-colors ${formTab === tab.id ? 'border-[#00009C] text-[#00009C] bg-white rounded-t-xl' : 'border-transparent text-slate-400 hover:text-[#00009C] hover:bg-[#00009C]/5 rounded-t-xl'}`}
                      >
                        <tab.icon className="w-4 h-4" /> {tab.label}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSubmit}>
                    <div className="p-6 md:p-8 min-h-[400px]">
                      
                      {/* ABA 1. PESSOAIS & DOCUMENTOS */}
                      <div className={formTab === 'pessoais' ? 'block animate-in fade-in' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          <div className="lg:col-span-2">
                            <label className="block text-[11px] font-bold text-[#00009C] uppercase tracking-widest mb-2">Nome Completo *</label>
                            <input type="text" name="nome" value={formData.nome} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#00009C] uppercase tracking-widest mb-2">CPF *</label>
                            <input type="text" name="cpf" value={formData.cpf} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          
                          <div className="lg:col-span-3 pt-3"><h3 className="font-extrabold text-[#00009C] border-b border-slate-100 pb-3">Documentação</h3></div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">RG</label>
                            <input type="text" name="rg" value={formData.rg} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">CNH</label>
                            <input type="text" name="cnh" value={formData.cnh} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">PIS / PASEP</label>
                            <input type="text" name="pis" value={formData.pis} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">CTPS</label>
                            <input type="text" name="ctps" value={formData.ctps} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>

                          <div className="lg:col-span-3 pt-3"><h3 className="font-extrabold text-[#00009C] border-b border-slate-100 pb-3">Detalhes Pessoais</h3></div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nascimento</label>
                            <input type="date" name="dataNascimento" value={formData.dataNascimento} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Gênero</label>
                            <select name="genero" value={formData.genero} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800 appearance-none">
                              <option value="">Selecione</option><option value="Masculino">Masculino</option><option value="Feminino">Feminino</option><option value="Outro">Outro</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Estado Civil</label>
                            <select name="estadoCivil" value={formData.estadoCivil} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800 appearance-none">
                              <option value="">Selecione</option><option value="Solteiro(a)">Solteiro(a)</option><option value="Casado(a)">Casado(a)</option><option value="Divorciado(a)">Divorciado(a)</option><option value="Viúvo(a)">Viúvo(a)</option><option value="União Estável">União Estável</option>
                            </select>
                          </div>
                          <div className="lg:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Escolaridade</label>
                            <select name="escolaridade" value={formData.escolaridade} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800 appearance-none">
                              <option value="">Selecione</option>
                              <option value="Ensino Fundamental Incompleto">Ens. Fundamental Incompleto</option>
                              <option value="Ensino Fundamental Completo">Ens. Fundamental Completo</option>
                              <option value="Ensino Médio Incompleto">Ens. Médio Incompleto</option>
                              <option value="Ensino Médio Completo">Ens. Médio Completo</option>
                              <option value="Ensino Superior Incompleto">Ens. Superior Incompleto</option>
                              <option value="Ensino Superior Completo">Ens. Superior Completo</option>
                              <option value="Pós-graduação">Pós-graduação</option>
                              <option value="Mestrado">Mestrado</option>
                              <option value="Doutorado">Doutorado</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nº Dependentes</label>
                            <input type="number" min="0" name="dependentes" value={formData.dependentes} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                        </div>
                      </div>

                      {/* ABA 2. CONTATO/ENDEREÇO */}
                      <div className={formTab === 'contato' ? 'block animate-in fade-in' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[11px] font-bold text-[#00009C] uppercase tracking-widest mb-2">Email Pessoal</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#00009C] uppercase tracking-widest mb-2">Celular / Whats</label>
                            <input type="text" name="celular" value={formData.celular} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div className="md:col-span-2 pt-3"><h3 className="font-extrabold text-[#00009C] border-b border-slate-100 pb-3">Endereço</h3></div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">CEP (Preenchimento Automático)</label>
                            <input type="text" name="cep" value={formData.cep} onChange={handleCepChange} maxLength={9} placeholder="00000-000" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Logradouro, Número, Complemento</label>
                            <input type="text" name="rua" value={formData.rua} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Bairro</label>
                            <input type="text" name="bairro" value={formData.bairro} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Cidade</label>
                              <input type="text" name="cidade" value={formData.cidade} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                            </div>
                            <div className="w-24">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">UF</label>
                              <input type="text" name="estado" value={formData.estado} onChange={handleInputChange} maxLength={2} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-extrabold uppercase text-slate-800" />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ABA 3. CONTRATO & FINANCEIRO */}
                      <div className={formTab === 'contrato' ? 'block animate-in fade-in' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-[#00009C] uppercase tracking-widest mb-2">Cargo *</label>
                            <input type="text" name="cargo" value={formData.cargo} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Departamento</label>
                            <input type="text" name="departamento" value={formData.departamento} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          
                          <div>
                            <label className="block text-[11px] font-bold text-[#00009C] uppercase tracking-widest mb-2">Status RH</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-[#00009C]/5 font-extrabold text-[#00009C] appearance-none">
                              <option value="Ativo">Ativo</option>
                              <option value="Férias">Férias</option>
                              <option value="Afastado">Afastado (INSS)</option>
                              <option value="Desligado">Desligado</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo Contrato</label>
                            <select name="tipoContrato" value={formData.tipoContrato} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800 appearance-none">
                              <option value="CLT">CLT</option><option value="PJ">PJ</option><option value="Estágio">Estágio</option><option value="Terceirizado">Terceirizado</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Salário (R$)</label>
                            <input type="number" step="0.01" name="salario" value={formData.salario} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Matrícula / Folha</label>
                            <input type="text" name="matricula" value={formData.matricula} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#00009C] uppercase tracking-widest mb-2">Data Admissão *</label>
                            <input type="date" name="dataAdmissao" value={formData.dataAdmissao} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-[#F20DE7] uppercase tracking-widest mb-2">Data Demissão</label>
                            <input type="date" name="dataDemissao" value={formData.dataDemissao} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-[#F20DE7]/30 focus:ring-2 focus:ring-[#F20DE7] focus:border-[#F20DE7] outline-none bg-[#F20DE7]/5 font-extrabold text-[#F20DE7]" title="Preencher apenas se desligado" />
                          </div>

                          <div className="md:col-span-3 pt-3"><h3 className="font-extrabold text-[#00009C] border-b border-slate-100 pb-3">Dados Bancários</h3></div>
                          <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="md:col-span-2">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Banco / Instituição</label>
                              <input type="text" name="banco" value={formData.banco} onChange={handleInputChange} placeholder="Ex: 341 - Itaú Unibanco" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Agência</label>
                              <input type="text" name="agencia" value={formData.agencia} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Conta & Tipo</label>
                              <div className="flex gap-2">
                                <input type="text" name="conta" value={formData.conta} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                                <select name="tipoConta" value={formData.tipoConta} onChange={handleInputChange} className="w-24 px-2 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800 appearance-none">
                                  <option value="CC">CC</option><option value="CP">CP</option><option value="Pix">Pix</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* ABA 4. MÉDICO */}
                      <div className={formTab === 'medico' ? 'block animate-in fade-in' : 'hidden'}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Tipo Sanguíneo</label>
                            <select name="tipoSanguineo" value={formData.tipoSanguineo} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-extrabold text-[#F20DE7] appearance-none">
                              <option value="">Desconhecido</option><option value="A+">A+</option><option value="A-">A-</option><option value="B+">B+</option><option value="B-">B-</option><option value="AB+">AB+</option><option value="AB-">AB-</option><option value="O+">O+</option><option value="O-">O-</option>
                            </select>
                          </div>
                          <div></div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Alergias</label>
                            <input type="text" name="alergias" value={formData.alergias} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Condições Médicas / Medicamentos</label>
                            <input type="text" name="medicamentos" value={formData.medicamentos} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          
                          <div className="md:col-span-2 pt-3"><h3 className="font-extrabold text-[#00009C] border-b border-slate-100 pb-3">Contato em Caso de Emergência</h3></div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Nome e Telefone</label>
                            <input type="text" name="contatoEmergencia" value={formData.contatoEmergencia} onChange={handleInputChange} placeholder="Ex: Maria (11) 99999-9999" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-2">Grau de Parentesco</label>
                            <input type="text" name="parentescoEmergencia" value={formData.parentescoEmergencia} onChange={handleInputChange} placeholder="Ex: Mãe, Cônjuge" className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:ring-2 focus:ring-[#00009C] focus:border-[#00009C] outline-none bg-slate-50 font-bold text-slate-800" />
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* FORM FOOTER ACTION BUTTONS */}
                    <div className="p-6 md:px-8 md:py-6 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4 rounded-b-2xl">
                      <div className="flex gap-2 w-full sm:w-auto">
                        {formTab !== 'pessoais' && (
                          <button type="button" onClick={() => setFormTab(tabsOrder[tabsOrder.indexOf(formTab) - 1])} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-3 text-sm font-bold text-[#00009C] bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-sm">
                            <ChevronLeft className="w-4 h-4" /> Anterior
                          </button>
                        )}
                        {formTab !== 'medico' && (
                          <button type="button" onClick={() => setFormTab(tabsOrder[tabsOrder.indexOf(formTab) + 1])} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-6 py-3 text-sm font-bold text-[#00009C] bg-white border border-slate-300 rounded-xl hover:bg-slate-100 transition-colors shadow-sm">
                            Avançar <ChevronRight className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      <div className="flex gap-3 w-full sm:w-auto mt-2 sm:mt-0">
                        <button type="button" onClick={() => navigateTo('list')} className="flex-1 sm:flex-none px-6 py-3 text-sm font-bold text-slate-500 bg-transparent hover:text-slate-800 rounded-xl transition-colors">
                          Cancelar
                        </button>
                        <button type="submit" className="flex-1 sm:flex-none px-8 py-3 text-sm font-bold text-white bg-[#00009C] border border-transparent rounded-xl hover:opacity-90 shadow-md flex items-center justify-center gap-2 transition-all">
                          <CheckCircle2 className="w-5 h-5" />
                          {formData.id ? 'Salvar Ficha' : 'Fazer Acontecer'}
                        </button>
                      </div>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}