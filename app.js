
window.addEventListener('DOMContentLoaded', () => {
    if(document.getElementById('admin-lesson-assignment-quill')) {
        window.quillEditor = new Quill('#admin-lesson-assignment-quill', {
            theme: 'snow',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'script': 'sub'}, { 'script': 'super' }],
                    [{ 'indent': '-1'}, { 'indent': '+1' }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    [{ 'color': [] }, { 'background': [] }],
                    ['link', 'video'],
                    ['clean']
                ]
            }
        });
        
        window.quillEditor.on('text-change', () => {
            document.getElementById('admin-lesson-assignment').value = window.quillEditor.root.innerHTML;
        });
    }
});


// Registrar PWA Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('SW registrado: ', reg.scope);
    }).catch(err => {
      console.log('SW fallo: ', err);
    });
  });
}
/**
 * SIN LÍMITES ACADEMY - Core Engine
 * Professional LMS Architecture with Firebase Integration
 */

// 1. CONFIGURACIÓN DE FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDZR5Tau7vWakxY1wyODfTQFk0AdkulWAc",
    authDomain: "sin-limites-academy.firebaseapp.com",
    projectId: "sin-limites-academy",
    storageBucket: "sin-limites-academy.firebasestorage.app",
    messagingSenderId: "398283134264",
    appId: "1:398283134264:web:2f30aa7af1f84ad405ddcd",
    measurementId: "G-N6QFRPW279"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// App secundaria para registro en Admin (para no cerrar la sesión principal)
const secondaryApp = firebase.initializeApp(firebaseConfig, "Secondary");
const secondaryAuth = secondaryApp.auth();

// 2. DATA DE CURSOS (INICIAL/MIGRACIÓN)
const INITIAL_COURSES = [
    {
        id: "lic_perspectiva_hebrea",
        title: "Licenciatura: Perspectiva Hebraica en las Escrituras",
        imageGrad: "from-amber-600 to-secondary",
        rating: "5.0",
        progress: "0%",
        modules: [
            {
                title: "Módulo 1: Introducción a las Raíces",
                lessons: Array.from({ length: 19 }, (_, i) => ({
                    id: `lesson_${i+1}`,
                    title: i === 0 ? "Lección 1: Introducción" : `Lección ${i + 1}`,
                    duration: "15:00",
                    video: i === 0 ? "https://youtu.be/V_U0UgIM4F4" : null,
                    resources: []
                }))
            }
        ]
    },
    {
        id: "fundamentos_crecimiento",
        title: "Diplomado: Fundamentos para el Crecimiento Espiritual",
        imageGrad: "from-blue-600 to-primary",
        rating: "4.9",
        progress: "0%",
        modules: []
    }
];

// 3. ESTADO GLOBAL DE LA APP
const State = {
    user: null,
    enrolledCourses: [],
    progress: {}, // { courseId: { lessonId: { completed: bool, approved: bool } } }
    notes: {}, // { "courseId_lessonId": "text" }
    isAdmin: false,
    allCourses: [],
    notifications: [],
    isInitializing: true,
    darkMode: localStorage.getItem('theme') === 'dark',
    currentCourse: null,
    currentLessonId: null,
    cinemaMode: false
};

// 4. UI MANAGER - Control visual centralizado
const UI = {
    loader: document.getElementById('global-loader'),
    views: {
        dashboard: document.getElementById('view-dashboard'),
        login: document.getElementById('view-login'),
        player: document.getElementById('view-player'),
        progress: document.getElementById('view-progress'),
        account: document.getElementById('view-account'),
        admin: document.getElementById('view-admin')
    },
    
    showView(viewName) {
        Object.keys(this.views).forEach(v => {
            if (this.views[v]) {
                this.views[v].classList.replace('view-active', 'view-hidden');
            }
        });
        if (this.views[viewName]) {
            this.views[viewName].classList.replace('view-hidden', 'view-active');
        }
        window.scrollTo(0, 0);

        // Update Sidebar Navigation States
        const navDashboard = document.getElementById('nav-dashboard');
        const navProgress = document.getElementById('nav-progress');
        const navAccount = document.getElementById('nav-account');
        const navAdmin = document.getElementById('nav-admin');
        
        if (navDashboard && navAccount && navProgress) {
            // Limpiar estilos activos
            navDashboard.className = "flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:bg-surface-dim hover:text-text-main transition-all hover:translate-x-1";
            navProgress.className = "flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:bg-surface-dim hover:text-text-main transition-all hover:translate-x-1";
            navAccount.className = "flex items-center gap-3 px-4 py-3 rounded-xl text-text-muted hover:bg-surface-dim hover:text-text-main transition-all hover:translate-x-1";
            if (navAdmin) navAdmin.classList.remove('bg-amber-50', 'dark:bg-amber-900/20', 'border-amber-200');
            
            const iconDash = navDashboard.querySelector('.material-symbols-outlined');
            if (iconDash) iconDash.classList.remove('icon-filled');
            const iconProg = navProgress.querySelector('.material-symbols-outlined');
            if (iconProg) iconProg.classList.remove('icon-filled');
            const iconAcc = navAccount.querySelector('.material-symbols-outlined');
            if (iconAcc) iconAcc.classList.remove('icon-filled');
            
            // Aplicar estilo activo según vista
            if (viewName === 'dashboard') {
                navDashboard.className = "flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-light text-primary font-semibold transition-all hover:translate-x-1";
                if (iconDash) iconDash.classList.add('icon-filled');
            } else if (viewName === 'progress') {
                navProgress.className = "flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-light text-primary font-semibold transition-all hover:translate-x-1";
                if (iconProg) iconProg.classList.add('icon-filled');
            } else if (viewName === 'account') {
                navAccount.className = "flex items-center gap-3 px-4 py-3 rounded-xl bg-primary-light text-primary font-semibold transition-all hover:translate-x-1";
                if (iconAcc) iconAcc.classList.add('icon-filled');
            } else if (viewName === 'admin' && navAdmin) {
                navAdmin.classList.add('bg-amber-50', 'dark:bg-amber-900/20', 'border-amber-200');
            }
        }
        
        // Cerrar sidebar en móvil automáticamente si está abierto
        if (window.innerWidth < 768) {
            const sidebar = document.getElementById('sidebar');
            if (sidebar && !sidebar.classList.contains('-translate-x-full')) {
                window.toggleSidebar();
            }
        }
    },

    setBtnLoading(btnId, isLoading) {
        const btn = document.getElementById(btnId);
        if (!btn) return;
        const spinner = btn.querySelector('.animate-spin');
        const text = btn.querySelector('span');
        btn.disabled = isLoading;
        if (isLoading) {
            spinner?.classList.remove('hidden');
            btn.classList.add('opacity-80', 'cursor-not-allowed');
        } else {
            spinner?.classList.add('hidden');
            btn.classList.remove('opacity-80', 'cursor-not-allowed');
        }
    },

    toast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            info: 'bg-primary'
        };
        const icons = {
            success: 'check_circle',
            error: 'error',
            info: 'info'
        };
        
        toast.className = `flex items-center gap-3 px-6 py-4 rounded-2xl text-white shadow-floating transform translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto min-w-[300px] ${colors[type]}`;
        toast.innerHTML = `
            <span class="material-symbols-outlined">${icons[type]}</span>
            <p class="text-sm font-bold">${message}</p>
        `;
        
        container.appendChild(toast);
        setTimeout(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        }, 100);
        
        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    },

    showSuccessModal(title, message, btnText = "Aceptar", callback = null) {
        const modal = document.getElementById('login-modal');
        const modalIcon = document.getElementById('modal-icon');
        const modalTitle = document.getElementById('modal-title');
        const modalDesc = document.getElementById('modal-desc');
        const modalActions = document.getElementById('modal-actions');

        // Configurar para Éxito
        modalIcon.textContent = "check_circle";
        modalIcon.className = "material-symbols-outlined text-5xl text-green-500 mb-4 icon-filled drop-shadow-md";
        modalTitle.textContent = title;
        modalDesc.textContent = message;
        
        // Configurar botones
        modalActions.innerHTML = `
            <button id="modal-success-btn" class="w-full py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all">
                ${btnText}
            </button>
        `;

        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);

        document.getElementById('modal-success-btn').onclick = () => {
            window.closeModal();
            if (callback) callback();
        };
    }
};

// 5. CORE FUNCTIONS - Lógica de negocio
const App = {
    async init() {
        // Cargar Tema
        if (State.darkMode) document.documentElement.classList.add('dark');
        this.bindEvents();
        
        // Listener de Autenticación
        auth.onAuthStateChanged(async (firebaseUser) => {
            State.isInitializing = true;
            if (firebaseUser) {
                await this.syncUserData(firebaseUser);
            } else {
                this.handleLoggedOut();
            }
            this.finalizeInit();
        });
    },

    async fetchCourses() {
        try {
            const snapshot = await db.collection("courses").get();
            if (snapshot.empty) {
                // Migración inicial
                console.log("Migrando cursos iniciales a Firestore...");
                const batch = db.batch();
                INITIAL_COURSES.forEach(course => {
                    const ref = db.collection("courses").doc(course.id);
                    batch.set(ref, course);
                });
                await batch.commit();
                State.allCourses = [...INITIAL_COURSES];
            } else {
                State.allCourses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
        } catch (error) {
            console.error("Error fetching courses:", error);
            State.allCourses = [...INITIAL_COURSES]; // Fallback
        }
    },

    async syncUserData(firebaseUser) {
        try {
            await this.fetchCourses();
            
            const userDoc = await db.collection("users").doc(firebaseUser.uid).get();
            if (userDoc.exists) {
                const data = userDoc.data();
                State.user = { uid: firebaseUser.uid, email: firebaseUser.email, ...data };
                State.enrolledCourses = data.enrolled_courses || [];
                State.notes = data.notes || {};
                
                State.isAdmin = data.isAdmin === true || firebaseUser.email.toLowerCase() === 'josuerlinbritopvas@gmail.com';
                
                // Forzar nombre de administrador si es el usuario principal
                if (State.isAdmin && (data.fullName === "Estudiante" || !data.fullName)) {
                    await db.collection("users").doc(firebaseUser.uid).update({ fullName: "Josuerlin Admin" });
                    State.user.fullName = "Josuerlin Admin";
                }
                
                const photoURL = data.photoURL || firebaseUser.photoURL;
                this.updateUserUI(State.user.fullName || data.fullName, firebaseUser.email, photoURL);
                
                // Escuchar cambios en tiempo real para progreso y notificaciones
                if (this.unsubscribeUser) this.unsubscribeUser();
                this.unsubscribeUser = db.collection("users").doc(firebaseUser.uid).onSnapshot(snapshot => {
                    const latestData = snapshot.data();
                    if (latestData) {
                        State.progress = latestData.progress || {};
                        State.notifications = latestData.notifications || [];
                        State.assignments = latestData.assignments || {};
                        
                        window.renderNotifications();
                        this.renderDashboardStats();
                        this.renderCoursesGrid(); // Actualiza barras en los cards
                        
                        // Si el jugador está abierto, refrescar syllabus para reflejar aprobaciones
                        if (State.currentCourse && UI.views.player.classList.contains('view-active')) {
                            // Solo refrescar si el porcentaje cambió o si hay nuevas aprobaciones
                            const oldP = document.getElementById('syllabus-progress')?.textContent;
                            const newP = `${this.calculateCourseProgress(State.currentCourse.id)}%`;
                            if (oldP !== newP) {
                                this.openPlayer(State.currentCourse);
                            }
                        }
                    }
                });

                const navAdmin = document.getElementById('nav-admin');
                if (navAdmin) {
                    navAdmin.classList.toggle('hidden', !State.isAdmin);
                    navAdmin.classList.toggle('flex', State.isAdmin);
                }
            } else {
                // Caso raro: Auth existe pero no el perfil
                State.user = { uid: firebaseUser.uid, email: firebaseUser.email, ...firebaseUser };
                State.isAdmin = firebaseUser.email.toLowerCase() === 'josuerlinbritopvas@gmail.com';
                const defaultName = State.isAdmin ? "Josuerlin Admin" : "Estudiante";
                
                // Crear perfil automáticamente
                await db.collection("users").doc(firebaseUser.uid).set({
                    fullName: defaultName,
                    email: firebaseUser.email,
                    enrolled_courses: [],
                    progress: {},
                    notes: {},
                    assignments: {},
                    isAdmin: State.isAdmin
                });
                
                this.updateUserUI(defaultName, firebaseUser.email, firebaseUser.photoURL);
                
                const navAdmin = document.getElementById('nav-admin');
                if (navAdmin && State.isAdmin) {
                    navAdmin.classList.replace('hidden', 'flex');
                }
            }
        } catch (error) {
            console.error("Sync Error:", error);
            UI.toast("Error al sincronizar datos", "error");
        }
        this.renderCoursesGrid();
    },

    handleLoggedOut() {
        State.user = null;
        State.enrolledCourses = [];
        this.updateLoggedOutUI();
        this.renderCoursesGrid();
    },

    finalizeInit() {
        State.isInitializing = false;
        UI.loader.classList.add('opacity-0');
        setTimeout(() => UI.loader.classList.add('hidden'), 300);
    },

    updateUserUI(fullName, email, photoURL = null) {
        // Header
        document.getElementById('nav-login-btn').classList.add('hidden');
        const navUserBtn = document.getElementById('nav-user-btn');
        const nameParts = fullName.trim().split(' ');
        const initials = nameParts[0].charAt(0).toUpperCase() + (nameParts.length > 1 ? nameParts[nameParts.length - 1].charAt(0).toUpperCase() : '');
        
        if (photoURL) {
            navUserBtn.innerHTML = `<img src="${photoURL}" class="w-full h-full object-cover">`;
        } else {
            navUserBtn.textContent = initials;
        }
        navUserBtn.classList.replace('hidden', 'flex');

        // Dropdown
        document.getElementById('dropdown-user-name').textContent = fullName;
        document.getElementById('dropdown-user-email').textContent = email;

        // Dashboard greeting
        document.getElementById('dash-user-name').textContent = nameParts[0];

        // Sidebar info
        const bottomInfo = document.getElementById('bottom-user-info');
        bottomInfo.classList.replace('hidden', 'flex');
        document.getElementById('user-name-display').textContent = fullName;
        
        // Etiqueta de rango
        const userTag = bottomInfo.querySelector('p.text-xs');
        if (userTag) {
            userTag.textContent = State.isAdmin ? 'Admin' : 'Estudiante VIP';
            userTag.className = `text-xs font-bold truncate ${State.isAdmin ? 'text-amber-500' : 'text-text-muted'}`;
        }
        
        const sidebarAvatar = document.getElementById('user-initials');
        if (sidebarAvatar) {
            if (photoURL) {
                sidebarAvatar.innerHTML = `<img src="${photoURL}" class="w-full h-full object-cover rounded-full">`;
                sidebarAvatar.classList.remove('bg-gradient-to-tr', 'from-primary', 'to-blue-300', 'text-white', 'font-bold');
            } else {
                sidebarAvatar.textContent = initials;
                if (State.isAdmin) {
                    sidebarAvatar.style.backgroundColor = 'rgb(245 158 11)';
                    sidebarAvatar.classList.remove('bg-gradient-to-tr', 'from-primary', 'to-blue-300');
                    sidebarAvatar.classList.add('text-white', 'font-bold');
                } else {
                    sidebarAvatar.style.backgroundColor = '';
                    sidebarAvatar.classList.add('bg-gradient-to-tr', 'from-primary', 'to-blue-300', 'text-white', 'font-bold');
                }
            }
        }

        // Account View
        const accountName = document.getElementById('account-name');
        if (accountName) accountName.textContent = fullName;
        
        const accountEmail = document.getElementById('account-email');
        if (accountEmail) accountEmail.textContent = email;
        
        const accountImg = document.getElementById('account-avatar-img');
        const accountText = document.getElementById('account-avatar-text');
        if (accountImg && accountText) {
            if (photoURL) {
                accountImg.src = photoURL;
                accountImg.classList.remove('hidden');
                accountText.classList.add('hidden');
            } else {
                accountImg.classList.add('hidden');
                accountText.classList.remove('hidden');
                accountText.textContent = initials;
            }
        }
        
        const accountCoursesCount = document.getElementById('account-courses-count');
        if (accountCoursesCount) accountCoursesCount.textContent = State.enrolledCourses.length;
    },

    updateLoggedOutUI() {
        document.getElementById('nav-login-btn').classList.remove('hidden');
        document.getElementById('nav-user-btn').classList.replace('flex', 'hidden');
        document.getElementById('bottom-user-info').classList.replace('flex', 'hidden');
        document.getElementById('dash-user-name').textContent = "Invitado";
        document.getElementById('user-dropdown').classList.add('hidden');

        // Account View reset
        const accountName = document.getElementById('account-name');
        if (accountName) accountName.textContent = 'Inicia Sesión';
        
        const accountEmail = document.getElementById('account-email');
        if (accountEmail) accountEmail.textContent = 'No autenticado';
        
        const accountImg = document.getElementById('account-avatar-img');
        const accountText = document.getElementById('account-avatar-text');
        if (accountImg && accountText) {
            accountImg.classList.add('hidden');
            accountText.classList.remove('hidden');
            accountText.textContent = '?';
        }
        
        const accountCoursesCount = document.getElementById('account-courses-count');
        if (accountCoursesCount) accountCoursesCount.textContent = '0';
    },

    renderCoursesGrid() {
        const grid = document.getElementById('course-grid');
        grid.innerHTML = '';
        
        State.allCourses.forEach(course => {
            // Admin tiene acceso total, alumnos solo si están enrolados
            const hasAccess = State.isAdmin || State.enrolledCourses.includes(course.id);
            const card = document.createElement('div');
            card.className = `bg-surface-base rounded-xl shadow-soft hover:shadow-floating transition-all duration-300 border border-surface-border overflow-hidden group cursor-pointer ${hasAccess ? '' : 'course-locked'}`;
            
            const coverHtml = course.imageUrl
                ? `<img src="${course.imageUrl}" alt="${course.title}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">`
                : `<div class="w-full h-full bg-gradient-to-tr ${course.imageGrad || 'from-gray-400 to-gray-600'} group-hover:scale-105 transition-transform duration-500"></div>`;

            card.innerHTML = `
                <div class="w-full aspect-[16/9] relative bg-surface-border overflow-hidden">
                    ${coverHtml}
                    <div class="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 course-overlay"></div>
                    <div class="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        ${hasAccess ? 
                            `<div class="w-14 h-14 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-white text-3xl icon-filled">play_arrow</span></div>` :
                            `<div class="w-14 h-14 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-white text-3xl">lock</span></div>`
                        }
                    </div>
                </div>
                <div class="p-6">
                    <h4 class="font-bold text-text-main mb-6 line-clamp-2">${course.title}</h4>
                    <div class="mt-auto pt-4 border-t border-surface-border/50">
                        ${hasAccess ? 
                            `<button class="w-full py-2.5 bg-primary/10 text-primary font-bold rounded-lg hover:bg-primary hover:text-white transition-all text-sm">Entrar a Clase</button>` :
                            `<button class="w-full py-2.5 bg-surface-dim text-text-muted font-bold rounded-lg border border-surface-border text-sm flex justify-center items-center gap-2 hover:bg-surface-border transition-colors"><span class="material-symbols-outlined text-sm">lock</span> Adquirir Acceso</button>`
                        }
                    </div>
                </div>
            `;
            
            card.onclick = () => this.handleCourseClick(course, hasAccess);
            grid.appendChild(card);
            
            // Inyectar porcentaje real en el card
            if (hasAccess) {
                const p = this.calculateCourseProgress(course.id);
                const progressCont = card.querySelector('div.p-6');
                const pBar = document.createElement('div');
                pBar.className = "mt-4 space-y-2";
                pBar.innerHTML = `
                    <div class="flex justify-between text-[10px] font-bold text-text-muted uppercase">
                        <span>Progreso Real</span>
                        <span>${p}%</span>
                    </div>
                    <div class="w-full h-1.5 bg-surface-dim rounded-full overflow-hidden border border-surface-border/50">
                        <div class="h-full bg-primary transition-all duration-1000" style="width: ${p}%"></div>
                    </div>
                `;
                progressCont.insertBefore(pBar, progressCont.querySelector('.mt-auto'));
            }
        });
    },

    handleCourseClick(course, hasAccess) {
        if (!State.user) {
            window.showModal();
            return;
        }
        if (!hasAccess) {
            UI.toast("Este curso está bloqueado", "info");
            return;
        }
        this.openPlayer(course);
    },

    calculateCourseProgress(courseId) {
        const course = State.allCourses.find(c => c.id === courseId);
        if (!course || !course.modules) return 0;
        
        const userProgress = State.progress[courseId] || {};
        let totalPoints = 0;
        let earnedPoints = 0;

        course.modules.forEach(m => {
            m.lessons.forEach(l => {
                const hasAssignment = l.assignment && l.assignment.trim() !== '';
                const p = userProgress[l.id] || { completed: false, approved: false };
                
                if (hasAssignment) {
                    totalPoints += 1.0;
                    if (p.completed) earnedPoints += 0.5;
                    if (p.approved) earnedPoints += 0.5;
                } else {
                    totalPoints += 1.0;
                    if (p.completed) earnedPoints += 1.0;
                }
            });
        });

        return totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    },

    renderDashboardStats() {
        if (!State.user) return;
        
        let approvedCount = 0;
        let totalProgressSum = 0;
        const enrolledCount = State.enrolledCourses.length;
        let firstUncompletedCourse = null;
        let firstUncompletedLesson = null;
        let firstUncompletedModuleTitle = "";

        State.enrolledCourses.forEach(cId => {
            const course = State.allCourses.find(c => c.id === cId);
            if (course) {
                const p = this.calculateCourseProgress(cId);
                totalProgressSum += p;

                const up = State.progress[cId] || {};
                let foundUncompletedInCourse = false;
                course.modules.forEach(m => {
                    m.lessons.forEach(l => {
                        const hasAssignment = l.assignment && l.assignment.trim() !== '';
                        const state = up[l.id] || {};
                        const isFullyComplete = hasAssignment ? (state.completed && state.approved) : state.completed;
                        
                        if (isFullyComplete) {
                            approvedCount++;
                        } else if (!foundUncompletedInCourse && !firstUncompletedLesson) {
                            firstUncompletedCourse = course;
                            firstUncompletedLesson = l;
                            firstUncompletedModuleTitle = m.title;
                            foundUncompletedInCourse = true;
                        }
                    });
                });
            }
        });

        const avg = enrolledCount > 0 ? Math.round(totalProgressSum / enrolledCount) : 0;

        // General Stats Update (Progress View)
        const statCourses = document.getElementById('stat-active-courses');
        const statLessons = document.getElementById('stat-lessons-approved');
        const statAvg = document.getElementById('stat-general-progress');

        if (statCourses) statCourses.textContent = enrolledCount;
        if (statLessons) statLessons.textContent = approvedCount;
        if (statAvg) statAvg.textContent = `${avg}%`;
        
        // Continue Watching UI (Dashboard View)
        const continueContainer = document.getElementById('continue-watching-container');
        const continueTitle = document.getElementById('continue-watching-title');
        if (firstUncompletedCourse && firstUncompletedLesson && continueContainer && continueTitle) {
            continueTitle.textContent = `${firstUncompletedCourse.title} - ${firstUncompletedLesson.title}`;
            continueContainer.classList.remove('hidden');
            window.continueWatching = () => {
                UI.showView('player');
                this.openPlayer(firstUncompletedCourse);
                // Delay play slightly to ensure UI is ready
                setTimeout(() => this.playVideo(firstUncompletedLesson, firstUncompletedModuleTitle), 100);
            };
        } else if (continueContainer) {
            continueContainer.classList.add('hidden');
        }

        // Trigger Advanced Progress Render
        if (typeof this.renderAdvancedProgress === 'function') {
            this.renderAdvancedProgress();
        }
    },

    renderAdvancedProgress() {
        if (!State.user) return;
        
        const modContainer = document.getElementById('module-progress-container');
        const activityContainer = document.getElementById('recent-activity-container');
        const badgesContainer = document.getElementById('badges-container');
        const streakElement = document.getElementById('stat-streak-days');
        const levelElement = document.getElementById('stat-current-level');
        const estimatedElement = document.getElementById('stat-estimated-completion');
        
        if (!modContainer) return;
        
        modContainer.innerHTML = '';
        activityContainer.innerHTML = '';
        badgesContainer.innerHTML = '';
        
        let allCompletedLessons = [];
        let totalInvestedSeconds = 0;
        let totalApprovedTasks = 0;
        let globalPercentage = 0;
        let totalCoursesProgress = 0;

        State.enrolledCourses.forEach(cId => {
            const course = State.allCourses.find(c => c.id === cId);
            if (!course) return;
            
            const up = State.progress[cId] || {};
            let coursePercentage = this.calculateCourseProgress(cId);
            totalCoursesProgress += coursePercentage;
            
            const courseTitleHTML = `<h4 class="font-bold text-text-main mt-4 mb-2 flex items-center gap-2"><span class="material-symbols-outlined text-primary text-sm">menu_book</span> ${course.title}</h4>`;
            modContainer.insertAdjacentHTML('beforeend', courseTitleHTML);
            
            course.modules.forEach((m, mIdx) => {
                let mTotalLessons = m.lessons.length;
                let mCompletedLessons = 0;
                let mApprovedTasks = 0;
                let mTotalTasks = 0;
                let mInvestedSeconds = 0;
                
                m.lessons.forEach(l => {
                    const hasAssignment = l.assignment && l.assignment.trim() !== '';
                    if (hasAssignment) mTotalTasks++;
                    
                    const state = up[l.id] || {};
                    if (state.completed) {
                        mCompletedLessons++;
                        
                        // Parse duration for invested time (mm:ss)
                        const durationParts = (l.duration || "0:00").split(':');
                        const mins = parseInt(durationParts[0]) || 0;
                        const secs = durationParts.length > 1 ? parseInt(durationParts[1]) || 0 : 0;
                        mInvestedSeconds += (mins * 60) + secs;
                        totalInvestedSeconds += (mins * 60) + secs;
                        
                        if (state.completedAt) {
                            allCompletedLessons.push({
                                lesson: l,
                                moduleTitle: m.title,
                                courseTitle: course.title,
                                completedAt: new Date(state.completedAt),
                                course: course
                            });
                        }
                    }
                    if (hasAssignment && state.approved) {
                        mApprovedTasks++;
                        totalApprovedTasks++;
                    }
                });
                
                let modPercentage = mTotalLessons > 0 ? Math.round((mCompletedLessons / mTotalLessons) * 100) : 0;
                
                // Convert seconds to human readable
                const mHours = Math.floor(mInvestedSeconds / 3600);
                const mMins = Math.floor((mInvestedSeconds % 3600) / 60);
                const mTimeStr = mHours > 0 ? `${mHours}h ${mMins}m` : `${mMins}m`;
                
                const modHtml = `
                    <div class="bg-surface-base border border-surface-border rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex items-center gap-6">
                        <!-- SVG Circular Progress -->
                        <div class="relative w-16 h-16 shrink-0">
                            <svg class="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                                <path class="text-surface-border" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3.8"/>
                                <path class="${modPercentage === 100 ? 'text-green-500' : 'text-primary'} transition-all duration-1000" stroke-dasharray="${modPercentage}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" stroke-width="3.8"/>
                            </svg>
                            <div class="absolute inset-0 flex flex-col items-center justify-center">
                                <span class="text-[10px] font-bold text-text-main">${modPercentage}%</span>
                            </div>
                        </div>
                        <div class="flex-1 min-w-0">
                            <h5 class="font-bold text-text-main text-sm truncate mb-2">${m.title}</h5>
                            <div class="flex flex-wrap gap-4">
                                <div class="flex items-center gap-1.5 text-xs text-text-muted">
                                    <span class="material-symbols-outlined text-[14px]">play_circle</span>
                                    <span>${mCompletedLessons}/${mTotalLessons} Lecc.</span>
                                </div>
                                ${mTotalTasks > 0 ? `
                                <div class="flex items-center gap-1.5 text-xs text-text-muted">
                                    <span class="material-symbols-outlined text-[14px] ${mApprovedTasks === mTotalTasks ? 'text-green-500' : ''}">assignment_turned_in</span>
                                    <span>${mApprovedTasks}/${mTotalTasks} Tareas</span>
                                </div>
                                ` : ''}
                                <div class="flex items-center gap-1.5 text-xs text-text-muted">
                                    <span class="material-symbols-outlined text-[14px]">schedule</span>
                                    <span>${mTimeStr} invertidos</span>
                                </div>
                            </div>
                        </div>
                        ${modPercentage === 100 ? `<div class="shrink-0 w-8 h-8 rounded-full bg-green-500/10 text-green-500 flex items-center justify-center"><span class="material-symbols-outlined text-[18px]">workspace_premium</span></div>` : ''}
                    </div>
                `;
                modContainer.insertAdjacentHTML('beforeend', modHtml);
            });
        });
        
        if (State.enrolledCourses.length === 0) {
            modContainer.innerHTML = '<p class="text-sm text-text-muted p-4 bg-surface-base border border-surface-border rounded-xl">Inscríbete en un curso para ver tu progreso aquí.</p>';
        }

        // Render Recent Activity
        allCompletedLessons.sort((a, b) => b.completedAt - a.completedAt);
        const recentLessons = allCompletedLessons.slice(0, 5);
        
        if (recentLessons.length > 0) {
            recentLessons.forEach((act, idx) => {
                const now = new Date();
                const diffTime = Math.abs(now - act.completedAt);
                const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
                const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
                
                let timeStr = "";
                if (diffDays > 0) timeStr = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
                else if (diffHours > 0) timeStr = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
                else timeStr = "Hace un momento";
                
                const actHtml = `
                    <div class="flex gap-4 group">
                        <div class="relative shrink-0 mt-1">
                            <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center relative z-10 group-hover:bg-primary group-hover:text-white transition-colors">
                                <span class="material-symbols-outlined text-[14px]">check</span>
                            </div>
                        </div>
                        <div>
                            <p class="text-xs font-bold text-primary mb-1">${timeStr}</p>
                            <p class="text-sm font-bold text-text-main leading-tight">${act.lesson.title}</p>
                            <p class="text-[10px] text-text-muted truncate max-w-[200px] mt-1">${act.courseTitle}</p>
                        </div>
                    </div>
                `;
                activityContainer.insertAdjacentHTML('beforeend', actHtml);
            });
        } else {
            activityContainer.innerHTML = '<p class="text-sm text-text-muted">Aún no hay actividad reciente.</p>';
        }

        // Study Streak Logic
        let currentStreak = 0;
        let lastDate = null;
        // Agrupar completadas por día
        const daysCompleted = new Set();
        allCompletedLessons.forEach(act => {
            daysCompleted.add(act.completedAt.toISOString().split('T')[0]);
        });
        const sortedDays = Array.from(daysCompleted).sort((a, b) => new Date(b) - new Date(a));
        
        const today = new Date().toISOString().split('T')[0];
        const yesterdayDate = new Date();
        yesterdayDate.setDate(yesterdayDate.getDate() - 1);
        const yesterday = yesterdayDate.toISOString().split('T')[0];
        
        if (sortedDays.includes(today) || sortedDays.includes(yesterday)) {
            let checkDate = new Date(sortedDays[0]); // Start with most recent
            for (let i = 0; i < sortedDays.length; i++) {
                const dayStr = sortedDays[i];
                if (i === 0) {
                    currentStreak++;
                } else {
                    const prevDate = new Date(sortedDays[i-1]);
                    const currDate = new Date(dayStr);
                    const diff = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));
                    if (diff === 1) {
                        currentStreak++;
                    } else {
                        break;
                    }
                }
            }
        }
        
        streakElement.textContent = `${currentStreak} Días`;
        
        // Render Badges
        const badges = [];
        if (State.enrolledCourses.length > 0) badges.push({ icon: 'school', title: 'Estudiante', color: 'text-blue-500 bg-blue-50' });
        if (currentStreak >= 3) badges.push({ icon: 'local_fire_department', title: 'Racha x3', color: 'text-orange-500 bg-orange-50' });
        if (currentStreak >= 7) badges.push({ icon: 'local_fire_department', title: 'Racha x7', color: 'text-red-500 bg-red-50' });
        if (totalApprovedTasks > 0) badges.push({ icon: 'assignment_turned_in', title: 'Primera Tarea', color: 'text-emerald-500 bg-emerald-50' });
        
        if (badges.length > 0) {
            badges.forEach(b => {
                badgesContainer.insertAdjacentHTML('beforeend', `<div title="${b.title}" class="w-10 h-10 rounded-full flex items-center justify-center shadow-sm cursor-pointer hover:scale-110 transition-transform ${b.color}"><span class="material-symbols-outlined text-[18px]">${b.icon}</span></div>`);
            });
        } else {
            badgesContainer.innerHTML = '<span class="text-xs text-text-muted">Desbloquea medallas al estudiar</span>';
        }
        
        // Level & Estimated Completion
        let level = "Principiante";
        globalPercentage = State.enrolledCourses.length > 0 ? Math.round(totalCoursesProgress / State.enrolledCourses.length) : 0;
        
        if (globalPercentage >= 25) level = "Intermedio";
        if (globalPercentage >= 50) level = "Avanzado";
        if (globalPercentage >= 75) level = "Experto";
        if (globalPercentage === 100) level = "Graduado";
        
        levelElement.textContent = level;
        
        if (globalPercentage > 0 && globalPercentage < 100 && allCompletedLessons.length > 0) {
            const firstLessonDate = allCompletedLessons[allCompletedLessons.length - 1].completedAt;
            const now = new Date();
            const daysInvested = Math.max(1, Math.floor((now - firstLessonDate) / (1000 * 60 * 60 * 24)));
            
            // Si en `daysInvested` días logró `globalPercentage`, le faltan `(100 - globalPercentage)`
            const estRemainingDays = Math.round((daysInvested / globalPercentage) * (100 - globalPercentage));
            
            const estDate = new Date();
            estDate.setDate(estDate.getDate() + estRemainingDays);
            
            estimatedElement.textContent = `Terminarás aprox: ${estDate.toLocaleDateString()}`;
        } else if (globalPercentage === 100) {
            estimatedElement.textContent = "¡Felicidades, has completado tus programas!";
        } else {
            estimatedElement.textContent = "Sigue estudiando para estimar fecha.";
        }
    },

    openPlayer(course) {
        State.currentCourse = course;
        const syllabusContainer = document.getElementById('syllabus-container');
        syllabusContainer.innerHTML = '';
        
        const courseProgress = State.progress[course.id] || {};
        let lastLessonComplete = true; // Para el bloqueo secuencial
        let lessonIndexGlobal = 0;
        
        course.modules.forEach(module => {
            // Header del módulo
            const mHeader = document.createElement('div');
            mHeader.className = "px-6 py-3 bg-surface-dim/50 border-y border-surface-border text-[10px] font-bold text-text-muted uppercase tracking-widest";
            mHeader.textContent = module.title;
            syllabusContainer.appendChild(mHeader);

            module.lessons.forEach((lesson) => {
                lessonIndexGlobal++;
                const p = courseProgress[lesson.id] || { completed: false, approved: false };
                const hasAssignment = lesson.assignment && lesson.assignment.trim() !== '';
                
                // Determinar si está 100% completa
                const isFullyComplete = hasAssignment ? (p.completed && p.approved) : p.completed;
                
                // Determinar si está bloqueada
                const isLocked = course.linearProgress && !lastLessonComplete;

                const item = document.createElement('div');
                item.className = `p-4 border-b border-surface-border/50 transition-all flex items-center gap-3 ${isFullyComplete ? 'bg-green-50/30 dark:bg-green-900/10' : ''} ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:bg-surface-dim cursor-pointer'}`;
                
                let iconHtml = "";
                if (isLocked) {
                    iconHtml = '<span class="material-symbols-outlined text-[16px]">lock</span>';
                } else if (isFullyComplete) {
                    iconHtml = '<span class="material-symbols-outlined text-[16px]">check</span>';
                } else if (p.completed) {
                    iconHtml = '<span class="material-symbols-outlined text-[16px] text-amber-500">pending</span>';
                } else {
                    iconHtml = lessonIndexGlobal;
                }

                item.innerHTML = `
                    <span class="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${isFullyComplete ? 'bg-green-500 text-white' : (p.completed ? 'bg-amber-500/10 text-amber-500' : 'bg-surface-border text-text-muted')}">
                        ${iconHtml}
                    </span>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-bold ${isFullyComplete ? 'text-green-700 dark:text-green-400' : 'text-text-main'} leading-tight truncate">${lesson.title}</p>
                        <div class="flex items-center gap-2 mt-0.5">
                            <p class="text-[10px] text-text-muted uppercase">${lesson.duration}</p>
                            ${hasAssignment ? `<span class="text-[9px] font-bold text-primary bg-primary/10 px-1.5 rounded">Tarea</span>` : ''}
                        </div>
                    </div>
                `;

                if (!isLocked) {
                    item.onclick = () => this.playVideo(lesson, module.title);
                }
                syllabusContainer.appendChild(item);
                
                // Actualizar estado para la siguiente lección
                lastLessonComplete = isFullyComplete;
            });
        });

        // Actualizar porcentaje real
        const percentage = this.calculateCourseProgress(course.id);
        document.getElementById('syllabus-progress').textContent = `${percentage}%`;

        // Auto-play primera lección no completada o la primera
        let firstPlayable = null;
        for (const mod of course.modules) {
            for (const les of mod.lessons) {
                const p = courseProgress[les.id] || {};
                const isFullyComplete = (les.assignment && les.assignment.trim() !== '') ? (p.completed && p.approved) : p.completed;
                if (!isFullyComplete) {
                    firstPlayable = les;
                    break;
                }
            }
            if (firstPlayable) break;
        }

        if (firstPlayable) {
            this.playVideo(firstPlayable, course.modules.find(m => m.lessons.includes(firstPlayable)).title);
        } else if (course.modules[0]?.lessons[0]) {
            this.playVideo(course.modules[0].lessons[0], course.modules[0].title);
        }
        
        UI.showView('player');
    },

    playVideo(lesson, moduleTitle) {
        State.currentLessonId = lesson.id;
        const src = lesson.video;
        const videoLocal = document.getElementById('course-video');
        const videoIframe = document.getElementById('course-iframe');
        
        document.getElementById('player-lesson-title').textContent = lesson.title;
        document.getElementById('player-module-title').textContent = moduleTitle;
        
        // Actualizar botón de completado
        const p = (State.progress[State.currentCourse.id] || {})[lesson.id] || {};
        const isCompleted = p.completed === true;
        const btnCompleted = document.getElementById('btn-mark-completed');
        const textCompleted = document.getElementById('text-mark-completed');
        if (isCompleted) {
            btnCompleted.className = "shrink-0 px-5 py-2.5 rounded-xl border border-green-500 bg-green-50 text-green-600 font-bold flex items-center gap-2 transition-all cursor-default";
            textCompleted.textContent = "Completada";
        } else {
            btnCompleted.className = "shrink-0 px-5 py-2.5 rounded-xl border border-surface-border bg-surface-dim text-text-muted font-bold flex items-center gap-2 hover:bg-green-50 hover:text-green-600 hover:border-green-200 transition-all";
            textCompleted.textContent = "Marcar Completada";
        }

        // Cargar Notas
        const noteKey = `${State.currentCourse.id}_${lesson.id}`;
        document.getElementById('lesson-notes').value = State.notes[noteKey] || '';
        document.getElementById('notes-save-status').classList.add('hidden');

        // Cargar Recursos
        const resourcesContainer = document.getElementById('resources-container');
        if (lesson.resources && lesson.resources.length > 0) {
            resourcesContainer.innerHTML = lesson.resources.map(res => `
                <a href="${res.url}" target="_blank" class="flex items-center justify-between p-4 bg-surface-dim border border-surface-border rounded-xl hover:border-primary transition-all group">
                    <div class="flex items-center gap-3">
                        <span class="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">description</span>
                        <span class="text-sm font-bold text-text-main">${res.title}</span>
                    </div>
                    <span class="material-symbols-outlined text-text-muted text-sm">download</span>
                </a>
            `).join('');
        } else {
            resourcesContainer.innerHTML = `<div class="text-center text-text-muted text-sm py-4">No hay recursos descargables para esta lección.</div>`;
        }

        // Cargar Asignación
        const assignContainer = document.getElementById('assignment-instructions-container');
        const assignText = document.getElementById('assignment-instructions');
        
        assignContainer.classList.remove('hidden'); // Siempre visible
        
        if (lesson.assignment && lesson.assignment.trim() !== '') {
            assignContainer.classList.remove('bg-surface-dim', 'border-surface-border', 'opacity-60');
            assignContainer.classList.add('bg-primary-light/10', 'border-primary/20');
            assignText.textContent = lesson.assignment;
        } else {
            assignContainer.classList.remove('bg-primary-light/10', 'border-primary/20');
            assignContainer.classList.add('bg-surface-dim', 'border-surface-border', 'opacity-60');
            assignText.textContent = "Aún no hay asignaciones para esta lección.";
        }
        
        // Cargar Entrega de Asignación del Estudiante
        const assignKey = `${State.currentCourse.id}_${lesson.id}`;
        const submittedAssign = State.assignments ? State.assignments[assignKey] : null;
        
        const linkInput = document.getElementById('assignment-link');
        const textInput = document.getElementById('assignment-text');
        const btnIcon = document.getElementById('btn-submit-assignment-icon');
        const btnText = document.getElementById('btn-submit-assignment-text');
        const saveStatus = document.getElementById('assignment-save-status');
        
        if (submittedAssign) {
            linkInput.value = submittedAssign.link || '';
            textInput.value = submittedAssign.text || '';
            btnIcon.textContent = 'update';
            btnText.textContent = 'Actualizar Asignación';
            saveStatus.classList.remove('hidden');
        } else {
            linkInput.value = '';
            textInput.value = '';
            btnIcon.textContent = 'send';
            btnText.textContent = 'Enviar Asignación';
            saveStatus.classList.add('hidden');
        }
        
        // Manejar Video
        if (videoLocal) {
            videoLocal.pause();
            videoLocal.classList.add('hidden');
        }
        if (videoIframe) {
            videoIframe.src = '';
            videoIframe.classList.add('hidden');
        }

        if (src) {
            if (src.includes('youtube.com') || src.includes('youtu.be')) {
                let embedUrl = src;
                if (src.includes('youtu.be/')) {
                    const videoId = src.split('youtu.be/')[1].split('?')[0];
                    embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
                } else if (src.includes('watch?v=')) {
                    const urlParams = new URL(src).searchParams;
                    const videoId = urlParams.get('v');
                    if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&modestbranding=1&rel=0`;
                }
                
                if (!embedUrl.includes('autoplay=')) {
                    embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1&modestbranding=1&rel=0';
                }

                videoIframe.src = embedUrl;
                videoIframe.classList.remove('hidden');
            } else {
                videoLocal.src = src;
                videoLocal.classList.remove('hidden');
                videoLocal.play().catch(e => console.log("Auto-play blocked"));
            }

            // Renderizar Feedback si existe
            const feedbackContainer = document.getElementById('assignment-feedback-container');
            if (submittedAssign && submittedAssign.evaluation) {
                const evalData = submittedAssign.evaluation;
                feedbackContainer.classList.remove('hidden');
                const card = document.getElementById('feedback-card');
                const icon = document.getElementById('feedback-status-icon');
                const title = document.getElementById('feedback-status-title');
                const badge = document.getElementById('feedback-status-badge');
                const comment = document.getElementById('feedback-comment');

                if (evalData.status === 'satisfactory') {
                    card.className = "p-6 rounded-2xl border-2 flex flex-col gap-4 border-green-500/20 bg-green-50/50 dark:bg-green-900/10";
                    icon.textContent = "check_circle";
                    icon.className = "material-symbols-outlined text-green-500";
                    badge.textContent = "Aprobada";
                    badge.className = "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-green-500 text-white";
                } else {
                    card.className = "p-6 rounded-2xl border-2 flex flex-col gap-4 border-amber-500/20 bg-amber-50/50 dark:bg-amber-900/10";
                    icon.textContent = "warning";
                    icon.className = "material-symbols-outlined text-amber-500";
                    badge.textContent = "Incompleta";
                    badge.className = "text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded bg-amber-500 text-white";
                }
                comment.textContent = evalData.comment || 'Sin comentarios adicionales.';
            } else {
                if (feedbackContainer) feedbackContainer.classList.add('hidden');
            }
        } else {
            UI.toast("Video no disponible para esta lección", "info");
        }
    },

    bindEvents() {
        // Toggle Dropdowns
        document.getElementById('settings-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('settings-dropdown').classList.toggle('hidden');
            document.getElementById('user-dropdown').classList.add('hidden');
        });

        document.getElementById('nav-user-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('user-dropdown').classList.toggle('hidden');
            document.getElementById('settings-dropdown').classList.add('hidden');
            document.getElementById('notif-dropdown').classList.add('hidden');
        });

        const notifBtn = document.getElementById('notif-btn');
        if (notifBtn) {
            notifBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                document.getElementById('notif-dropdown').classList.toggle('hidden');
                document.getElementById('user-dropdown').classList.add('hidden');
                document.getElementById('settings-dropdown').classList.add('hidden');
            });
        }

        document.addEventListener('click', () => {
            document.getElementById('settings-dropdown').classList.add('hidden');
            document.getElementById('user-dropdown').classList.add('hidden');
            if (document.getElementById('notif-dropdown')) {
                document.getElementById('notif-dropdown').classList.add('hidden');
            }
        });

        // Auth Forms
        document.getElementById('login-form').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('btn-logout').addEventListener('click', () => this.handleLogout());
        
        const formUpdatePassword = document.getElementById('form-update-password');
        if (formUpdatePassword) {
            formUpdatePassword.addEventListener('submit', (e) => this.handleUpdatePassword(e));
        }

        const avatarUpload = document.getElementById('avatar-upload');
        if (avatarUpload) {
            avatarUpload.addEventListener('change', (e) => this.handleAvatarUpload(e));
        }

        // Autosave Notas Personales
        let notesTimeout;
        const notesInput = document.getElementById('lesson-notes');
        if (notesInput) {
            notesInput.addEventListener('input', (e) => {
                if (!State.currentCourse || !State.currentLessonId) return;
                
                clearTimeout(notesTimeout);
                document.getElementById('notes-save-status').classList.add('hidden');
                
                notesTimeout = setTimeout(async () => {
                    const text = e.target.value;
                    const key = `${State.currentCourse.id}_${State.currentLessonId}`;
                    State.notes[key] = text;
                    
                    if (State.user) {
                        try {
                            await db.collection("users").doc(State.user.uid).update({
                                [`notes.${key}`]: text
                            });
                            document.getElementById('notes-save-status').classList.remove('hidden');
                        } catch (err) {
                            console.error("Error guardando nota:", err);
                        }
                    }
                }, 1000);
            });
        }

        // Admin forms
        const adminForm = document.getElementById('admin-course-form');
        if (adminForm) {
            adminForm.addEventListener('submit', (e) => window.adminSaveCourse(e));
        }

        const evalForm = document.getElementById('form-eval-admin');
        if (evalForm) {
            evalForm.addEventListener('submit', (e) => window.submitEvaluation(e));
        }
    },

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;
        
        UI.setBtnLoading('login-submit-btn', true);
        try {
            await auth.signInWithEmailAndPassword(email, pass);
            
            // Mostrar modal de éxito centralizado
            UI.showSuccessModal(
                "¡Inicio de Sesión Exitoso!", 
                "Bienvenido/a de nuevo a Sin Límites Academy. Ya puedes acceder a tus contenidos.",
                "Explorar Cursos",
                () => UI.showView('dashboard')
            );
        } catch (error) {
            console.error(error);
            UI.toast(this.mapAuthError(error.code), "error");
        } finally {
            UI.setBtnLoading('login-submit-btn', false);
        }
    },



    async handleLogout() {
        await auth.signOut();
        UI.toast("Sesión cerrada");
        UI.showView('dashboard');
    },

    async handleUpdatePassword(e) {
        e.preventDefault();
        const newPassword = document.getElementById('new-password-input').value;
        if (!auth.currentUser) {
            UI.toast("Debes iniciar sesión para realizar esta acción.", "error");
            return;
        }
        
        UI.setBtnLoading('btn-update-password', true);
        try {
            await auth.currentUser.updatePassword(newPassword);
            UI.toast("Contraseña actualizada exitosamente", "success");
            document.getElementById('new-password-input').value = '';
        } catch (error) {
            console.error(error);
            if (error.code === 'auth/requires-recent-login') {
                UI.toast("Por seguridad, debes cerrar sesión y volver a entrar antes de cambiar tu contraseña.", "error");
            } else {
                UI.toast(this.mapAuthError(error.code), "error");
            }
        } finally {
            UI.setBtnLoading('btn-update-password', false);
        }
    },

    async handleAvatarUpload(e) {
        const file = e.target.files[0];
        if (!file || !State.user) return;
        
        const loader = document.getElementById('avatar-loader');
        if (loader) loader.classList.remove('hidden');
        
        try {
            const storageRef = storage.ref(`avatars/${State.user.uid}_${Date.now()}`);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();
            
            // Update auth profile
            await auth.currentUser.updateProfile({ photoURL: downloadURL });
            
            // Update firestore
            await db.collection("users").doc(State.user.uid).update({ photoURL: downloadURL });
            
            // Update UI
            State.user.photoURL = downloadURL;
            this.updateUserUI(State.user.fullName || "Estudiante", State.user.email, downloadURL);
            UI.toast("Foto de perfil actualizada con éxito", "success");
        } catch (error) {
            console.error(error);
            UI.toast("Error al subir imagen. Revisa el tamaño.", "error");
        } finally {
            if (loader) loader.classList.add('hidden');
            e.target.value = ''; // Reset input
        }
    },

    mapAuthError(code) {
        const errors = {
            'auth/email-already-in-use': 'Este correo ya está registrado.',
            'auth/invalid-email': 'El formato del correo es inválido.',
            'auth/weak-password': 'La contraseña es muy débil.',
            'auth/user-not-found': 'Usuario no encontrado.',
            'auth/wrong-password': 'Contraseña incorrecta.',
            'permission-denied': 'Error de permisos en Firestore.'
        };
        return errors[code] || 'Ocurrió un error inesperado.';
    }
};

// 6. VENTANA GLOBAL (Compatibilidad)
window.openLoginView = () => UI.showView('login');
window.goBackToDashboard = () => UI.showView('dashboard');
window.openAccountView = () => UI.showView('account');
window.openProgressView = () => {
    UI.showView('progress');
    if (App.renderAdvancedProgress) App.renderAdvancedProgress();
};
window.sendPasswordReset = async () => {
    if (!State.user || !State.user.email) {
        UI.toast('Debes iniciar sesión para restablecer la contraseña.', 'error');
        return;
    }
    UI.setBtnLoading('btn-reset-password', true);
    try {
        await auth.sendPasswordResetEmail(State.user.email);
        UI.toast('Correo enviado. Revisa tu bandeja de entrada.', 'success');
    } catch (error) {
        console.error(error);
        UI.toast(App.mapAuthError(error.code), 'error');
    } finally {
        UI.setBtnLoading('btn-reset-password', false);
    }
};
window.showModal = (title, desc) => {
    const modal = document.getElementById('login-modal');
    if (title) document.getElementById('modal-title').textContent = title;
    if (desc) document.getElementById('modal-desc').textContent = desc;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    setTimeout(() => modal.classList.replace('opacity-0', 'opacity-100'), 10);
};
window.closeModal = () => {
    const modal = document.getElementById('login-modal');
    modal.classList.replace('opacity-100', 'opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        // Restaurar estado por defecto del modal (para cuando se use por el sistema de bloqueo)
        const modalIcon = document.getElementById('modal-icon');
        const modalActions = document.getElementById('modal-actions');
        modalIcon.textContent = "error";
        modalIcon.className = "material-symbols-outlined text-5xl text-secondary mb-4 icon-filled drop-shadow-md";
        modalActions.innerHTML = `
            <button onclick="window.closeModal()" class="flex-1 py-3 text-text-muted font-bold hover:bg-surface-dim rounded-xl transition-colors border border-transparent hover:border-surface-border">Cancelar</button>
            <button onclick="window.openLoginView()" class="flex-1 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover shadow-lg shadow-primary/30 transition-all">Iniciar Sesión</button>
        `;
    }, 300);
};
window.toggleAuthForm = () => {
    document.getElementById('login-form-container').classList.toggle('hidden');
    document.getElementById('register-form-container').classList.toggle('hidden');
};
window.toggleDarkMode = () => {
    State.darkMode = !State.darkMode;
    document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', State.darkMode ? 'dark' : 'light');
    // Forzar actualización de logos si existen
    const sidebarLogo = document.getElementById('sidebar-logo');
    if (sidebarLogo) sidebarLogo.src = State.darkMode ? './logo_maestro_con_blanco.png' : './logo_maestro_con_negro.png';
};
window.toggleSidebar = () => {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    const isClosed = sidebar.classList.contains('-translate-x-full');
    
    if (isClosed) {
        // Abrir
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.replace('opacity-0', 'opacity-100'), 10);
    } else {
        // Cerrar
        sidebar.classList.add('-translate-x-full');
        overlay.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    }
};

// 7. NUEVAS FUNCIONES DE UI Y LÓGICA (Ventana Global)
window.switchPlayerTab = (tabId) => {
    ['tab-notas', 'tab-recursos', 'tab-asignaciones'].forEach(id => {
        document.getElementById(id).classList.replace('block', 'hidden');
    });
    document.getElementById(tabId).classList.replace('hidden', 'block');
    
    ['btn-tab-notas', 'btn-tab-recursos', 'btn-tab-asignaciones'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.classList.remove('text-primary', 'border-primary');
            btn.classList.add('text-text-muted', 'border-transparent');
        }
    });
    
    const activeBtn = document.getElementById(`btn-${tabId}`);
    if (activeBtn) {
        activeBtn.classList.remove('text-text-muted', 'border-transparent');
        activeBtn.classList.add('text-primary', 'border-primary');
    }
};


window.togglePiP = async () => {
    const videoLocal = document.getElementById('course-video');
    const videoIframe = document.getElementById('course-iframe');
    const container = document.getElementById('video-container');
    const pipBtn = document.getElementById('pip-btn');
    
    // For local video element
    if (videoLocal && !videoLocal.classList.contains('hidden')) {
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
                pipBtn.classList.remove('text-primary', 'border-primary');
            } else {
                await videoLocal.requestPictureInPicture();
                pipBtn.classList.add('text-primary', 'border-primary');
            }
        } catch (error) {
            console.error("PiP not supported or failed:", error);
            UI.toast("El modo Picture-in-Picture no está soportado en este navegador.", "error");
        }
    } 
    // For YouTube iframe (CSS fallback since native PiP is restricted)
    else if (videoIframe && !videoIframe.classList.contains('hidden')) {
        if (container.classList.contains('fixed')) {
            // Exit CSS PiP
            container.className = "w-full aspect-video bg-black rounded-xl overflow-hidden shadow-floating relative group border border-surface-border/20";
            pipBtn.classList.remove('text-primary', 'border-primary');
        } else {
            // Enter CSS PiP
            container.className = "fixed bottom-8 right-8 w-80 aspect-video bg-black rounded-xl overflow-hidden shadow-floating border border-surface-border z-[100] cursor-move transition-transform hover:scale-105";
            pipBtn.classList.add('text-primary', 'border-primary');
        }
    }
};


window.toggleSearchModal = () => {
    const modal = document.getElementById('search-modal');
    const input = document.getElementById('global-search-input');
    if (modal.classList.contains('hidden')) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            modal.classList.replace('opacity-0', 'opacity-100');
            input.focus();
        }, 10);
    } else {
        modal.classList.replace('opacity-100', 'opacity-0');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
};

window.performGlobalSearch = () => {
    const query = document.getElementById('global-search-input').value.toLowerCase().trim();
    const resultsContainer = document.getElementById('global-search-results');
    
    if (query.length < 2) {
        resultsContainer.innerHTML = '<div class="p-8 text-center text-text-muted text-sm">Escribe al menos 2 caracteres...</div>';
        return;
    }
    
    let results = [];
    
    State.courses.forEach(course => {
        // Buscar en título de curso
        if (course.title.toLowerCase().includes(query) || course.description.toLowerCase().includes(query)) {
            results.push({
                type: 'course',
                title: course.title,
                desc: 'Curso completo',
                icon: 'school',
                action: () => { window.toggleSearchModal(); UI.showView('dashboard'); } // Ideally navigate to course details if they existed
            });
        }
        
        // Buscar en lecciones
        course.modules.forEach(mod => {
            mod.lessons.forEach(lesson => {
                if (lesson.title.toLowerCase().includes(query) || (lesson.assignment && lesson.assignment.toLowerCase().includes(query))) {
                    results.push({
                        type: 'lesson',
                        title: lesson.title,
                        desc: `${course.title} > ${mod.title}`,
                        icon: 'play_circle',
                        action: () => {
                            window.toggleSearchModal();
                            App.openPlayer(course);
                            setTimeout(() => App.playVideo(lesson, mod.title), 500);
                        }
                    });
                }
            });
        });
    });
    
    if (results.length === 0) {
        resultsContainer.innerHTML = '<div class="p-8 text-center text-text-muted text-sm">No se encontraron resultados para "' + query + '"</div>';
        return;
    }
    
    resultsContainer.innerHTML = results.map(res => `
        <div onclick="const action = ${res.action.toString()}; action();" class="p-4 hover:bg-surface-dim transition-colors cursor-pointer border-b border-surface-border last:border-0 group flex items-center gap-4">
            <div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <span class="material-symbols-outlined">${res.icon}</span>
            </div>
            <div>
                <p class="font-bold text-text-main text-sm">${res.title}</p>
                <p class="text-[10px] text-text-muted uppercase tracking-wider">${res.desc}</p>
            </div>
        </div>
    `).join('');
};

window.toggleCinemaMode = () => {
    State.cinemaMode = !State.cinemaMode;
    const mainCol = document.getElementById('player-main-column');
    const sideCol = document.getElementById('player-sidebar-column');
    const layout = document.getElementById('player-layout-container');
    const btn = document.getElementById('cinema-btn');
    
    if (State.cinemaMode) {
        layout.classList.remove('lg:flex-row');
        layout.classList.add('flex-col');
        sideCol.classList.remove('lg:w-80');
        sideCol.classList.add('w-full');
        btn.classList.add('text-primary', 'border-primary');
        btn.querySelector('span').textContent = 'fullscreen_exit';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
        layout.classList.add('lg:flex-row');
        layout.classList.remove('flex-col');
        sideCol.classList.add('lg:w-80');
        sideCol.classList.remove('w-full');
        btn.classList.remove('text-primary', 'border-primary');
        btn.querySelector('span').textContent = 'fit_screen';
    }
};

window.filterSyllabus = () => {
    const query = document.getElementById('syllabus-search').value.toLowerCase();
    const container = document.getElementById('syllabus-container');
    if (!container) return;
    
    // Elements are mixed (headers and items)
    const elements = container.children;
    let currentHeader = null;
    let headerHasVisibleLessons = false;
    
    for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (el.classList.contains('px-6')) {
            // This is a header
            if (currentHeader && !headerHasVisibleLessons) {
                currentHeader.style.display = 'none';
            }
            currentHeader = el;
            headerHasVisibleLessons = false;
            // Initially show it, will hide later if no lessons match
            el.style.display = 'block'; 
        } else {
            // This is a lesson item
            const title = el.querySelector('p.font-bold').textContent.toLowerCase();
            if (title.includes(query)) {
                el.style.display = 'flex';
                headerHasVisibleLessons = true;
            } else {
                el.style.display = 'none';
            }
        }
    }
    
    // Check last header
    if (currentHeader && !headerHasVisibleLessons && query !== '') {
        currentHeader.style.display = 'none';
    } else if (currentHeader && query === '') {
        currentHeader.style.display = 'block';
    }
};

window.exportNotes = () => {
    if (!State.currentCourse || !State.user) {
        UI.toast("Debes estar en un curso para exportar notas", "error");
        return;
    }
    
    let notesText = `Mis Apuntes: ${State.currentCourse.title}\n`;
    notesText += `Estudiante: ${State.user.fullName || State.user.email}\n`;
    notesText += `Fecha de exportación: ${new Date().toLocaleDateString()}\n`;
    notesText += `========================================================\n\n`;
    
    let hasNotes = false;
    State.currentCourse.modules.forEach(m => {
        m.lessons.forEach(l => {
            const key = `${State.currentCourse.id}_${l.id}`;
            if (State.notes[key] && State.notes[key].trim() !== '') {
                hasNotes = true;
                notesText += `[${m.title}] ${l.title}:\n`;
                notesText += `${State.notes[key]}\n`;
                notesText += `--------------------------------------------------------\n\n`;
            }
        });
    });
    
    if (!hasNotes) {
        UI.toast("No tienes apuntes guardados en este curso.", "info");
        return;
    }
    
    const blob = new Blob([notesText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Apuntes_${State.currentCourse.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.toast("Apuntes exportados con éxito", "success");
};

window.markLessonCompleted = async () => {
    if (!State.user || !State.currentCourse || !State.currentLessonId) return;
    
    const courseId = State.currentCourse.id;
    const lessonId = State.currentLessonId;
    
    if (State.progress[courseId] && State.progress[courseId][lessonId] && State.progress[courseId][lessonId].completed) {
        return; // Ya completada
    }
    
    if (!State.progress[courseId]) State.progress[courseId] = {};
    if (!State.progress[courseId][lessonId]) State.progress[courseId][lessonId] = { completed: false, approved: false };
    
    State.progress[courseId][lessonId].completed = true;
    State.progress[courseId][lessonId].completedAt = new Date().toISOString();
    
    // UI Update local instanta
    const btnCompleted = document.getElementById('btn-mark-completed');
    btnCompleted.className = "shrink-0 px-5 py-2.5 rounded-xl border border-green-500 bg-green-50 text-green-600 font-bold flex items-center gap-2 transition-all cursor-default";
    document.getElementById('text-mark-completed').textContent = "Completada";
    
    try {
        const updatePath = `progress.${courseId}.${lessonId}.completed`;
        const timePath = `progress.${courseId}.${lessonId}.completedAt`;
        await db.collection("users").doc(State.user.uid).update({
            [updatePath]: true,
            [timePath]: State.progress[courseId][lessonId].completedAt
        });
        
        UI.toast("Lección marcada como completada", "success");
    } catch (err) {
        console.error("Error marcando completada:", err);
    }
};

window.submitAssignment = async () => {
    if (!State.user || !State.currentCourse || !State.currentLessonId) return;
    
    const linkInput = document.getElementById('assignment-link').value.trim();
    const textInput = document.getElementById('assignment-text').value.trim();
    
    if (!linkInput && !textInput) {
        UI.toast("Debes ingresar un enlace o comentario para enviar la asignación", "error");
        return;
    }
    
    const courseId = State.currentCourse.id;
    const lessonId = State.currentLessonId;
    const assignKey = `${courseId}_${lessonId}`;
    
    // Obtener los nombres actuales
    const moduleTitle = document.getElementById('player-module-title').textContent;
    const lessonTitle = document.getElementById('player-lesson-title').textContent;
    
    const assignmentData = {
        courseId,
        lessonId,
        moduleTitle,
        lessonTitle,
        link: linkInput,
        text: textInput,
        submittedAt: new Date().toISOString()
    };
    
    const btnIcon = document.getElementById('btn-submit-assignment-icon');
    const btnText = document.getElementById('btn-submit-assignment-text');
    const spinner = document.getElementById('btn-submit-assignment').querySelector('.animate-spin');
    const saveStatus = document.getElementById('assignment-save-status');
    
    // UI Loading
    btnIcon.classList.add('hidden');
    spinner.classList.remove('hidden');
    
    try {
        if (!State.assignments) State.assignments = {};
        State.assignments[assignKey] = assignmentData;
        
        await db.collection("users").doc(State.user.uid).set({
            assignments: {
                [assignKey]: assignmentData
            }
        }, { merge: true });
        
        // NOTIFICAR A ADMINS
        const adminSnapshot = await db.collection("users").where("isAdmin", "==", true).get();
        const notification = {
            id: "notif_" + Date.now(),
            type: "new_assignment",
            studentName: State.user.fullName || "Estudiante",
            studentUid: State.user.uid,
            courseTitle: State.currentCourse.title,
            lessonTitle: lessonTitle,
            submittedAt: new Date().toISOString(),
            read: false
        };

        const batch = db.batch();
        adminSnapshot.forEach(adminDoc => {
            batch.update(adminDoc.ref, {
                notifications: firebase.firestore.FieldValue.arrayUnion(notification)
            });
        });
        await batch.commit();

        UI.toast("Asignación enviada correctamente", "success");
        
        // Update UI
        btnIcon.classList.remove('hidden');
        spinner.classList.add('hidden');
        btnIcon.textContent = 'update';
        btnText.textContent = 'Actualizar Asignación';
        saveStatus.classList.remove('hidden');
        
    } catch (err) {
        console.error("Error enviando asignación:", err);
        UI.toast("Error al enviar la asignación", "error");
        btnIcon.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
};

window.openAdminView = () => {
    if (!State.isAdmin) return;
    UI.showView('admin');
    window.renderAdminCoursesList();
};

window.renderAdminCoursesList = () => {
    const list = document.getElementById('admin-courses-list');
    list.innerHTML = '';
    State.allCourses.forEach(course => {
        const card = document.createElement('div');
        card.className = "bg-surface-base border border-surface-border p-5 rounded-xl shadow-soft hover:border-primary transition-colors cursor-pointer group flex items-center gap-4";
        
        const coverHtml = course.imageUrl
            ? `<img src="${course.imageUrl}" class="w-full h-full object-cover">`
            : `<div class="w-full h-full bg-gradient-to-tr ${course.imageGrad} flex items-center justify-center text-white"><span class="material-symbols-outlined text-2xl">book</span></div>`;
            
        card.innerHTML = `
            <div class="w-16 h-16 rounded-lg shrink-0 overflow-hidden bg-surface-border">
                ${coverHtml}
            </div>
            <div class="flex-1">
                <h4 class="font-bold text-text-main line-clamp-1 group-hover:text-primary transition-colors">${course.title}</h4>
                <p class="text-xs text-text-muted mt-1">${course.modules ? course.modules.length : 0} módulos</p>
            </div>
        `;
        card.onclick = () => window.adminEditCourse(course.id);
        list.appendChild(card);
    });
};

window.setCoverType = (type) => {
    document.getElementById('admin-cover-type').value = type;
    const btnGrad = document.getElementById('btn-type-grad');
    const btnImg = document.getElementById('btn-type-img');
    const gradCont = document.getElementById('cover-grad-container');
    const imgCont = document.getElementById('cover-img-container');
    
    if (type === 'grad') {
        btnGrad.className = 'px-3 py-1 text-xs font-bold rounded-md bg-primary text-white transition-colors';
        btnImg.className = 'px-3 py-1 text-xs font-bold rounded-md text-text-muted hover:text-text-main transition-colors';
        gradCont.classList.remove('hidden');
        imgCont.classList.add('hidden');
    } else {
        btnImg.className = 'px-3 py-1 text-xs font-bold rounded-md bg-primary text-white transition-colors';
        btnGrad.className = 'px-3 py-1 text-xs font-bold rounded-md text-text-muted hover:text-text-main transition-colors';
        imgCont.classList.remove('hidden');
        gradCont.classList.add('hidden');
    }
};

window.adminAddCourse = () => {
    document.getElementById('admin-editor').classList.remove('hidden');
    document.getElementById('admin-editor-title').textContent = 'Nuevo Curso';
    document.getElementById('admin-course-form').reset();
    document.getElementById('admin-course-id').value = '';
    document.getElementById('admin-delete-course').classList.add('hidden');
    
    window.setCoverType('grad');
    document.getElementById('admin-course-grad').value = 'from-blue-600 to-primary';
    document.getElementById('admin-course-linear').checked = false;
    
    // Inicializar con un módulo vacío
    window.renderModulesBuilder([{ title: "Módulo 1", lessons: [] }]);
};

window.adminEditCourse = (courseId) => {
    const course = State.allCourses.find(c => c.id === courseId);
    if (!course) return;
    
    document.getElementById('admin-editor').classList.remove('hidden');
    document.getElementById('admin-editor-title').textContent = 'Editar Curso';
    document.getElementById('admin-course-id').value = course.id;
    document.getElementById('admin-course-title').value = course.title;
    
    if (course.imageUrl) {
        window.setCoverType('img');
        document.getElementById('admin-course-img').value = course.imageUrl;
        document.getElementById('admin-course-grad').value = course.imageGrad || 'from-blue-600 to-primary';
    } else {
        window.setCoverType('grad');
        document.getElementById('admin-course-grad').value = course.imageGrad || 'from-blue-600 to-primary';
        document.getElementById('admin-course-img').value = '';
    }
    
    document.getElementById('admin-delete-course').classList.remove('hidden');
    document.getElementById('admin-course-linear').checked = course.linearProgress === true;
    
    window.renderModulesBuilder(course.modules || []);
};

// --- VISUAL BUILDER LOGIC ---
let currentModulesState = [];

window.renderModulesBuilder = (modules) => {
    currentModulesState = JSON.parse(JSON.stringify(modules)); // Clonar estado
    const container = document.getElementById('modules-builder');
    container.innerHTML = '';
    
    currentModulesState.forEach((module, mIdx) => {
        const mDiv = document.createElement('div');
        mDiv.className = "bg-surface-dim border border-surface-border rounded-xl p-5 space-y-4";
        mDiv.innerHTML = `
            <div class="flex items-center justify-between gap-4">
                <input type="text" value="${(module.title || '').replace(/"/g, '&quot;')}" placeholder="Título del Módulo" 
                    oninput="currentModulesState[${mIdx}].title = this.value"
                    class="flex-1 bg-surface-base border border-surface-border rounded-lg px-4 py-2 font-bold text-text-main focus:border-primary text-sm">
                <button type="button" onclick="window.adminRemoveModule(${mIdx})" class="text-red-400 hover:text-red-600 transition-colors">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
            
            <div id="lessons-container-${mIdx}" class="space-y-3 pl-4 border-l-2 border-surface-border/50 ml-2">
                ${(module.lessons || []).map((lesson, lIdx) => `
                    <div class="bg-surface-base border border-surface-border rounded-lg p-4 space-y-3">
                        <div class="flex items-center justify-between gap-3">
                            <input type="text" value="${(lesson.title || '').replace(/"/g, '&quot;')}" placeholder="Título de la Lección" 
                                oninput="currentModulesState[${mIdx}].lessons[${lIdx}].title = this.value"
                                class="flex-1 bg-surface-dim border border-surface-border rounded-md px-3 py-1.5 text-xs font-bold text-text-main focus:border-primary">
                            <button type="button" onclick="window.adminRemoveLesson(${mIdx}, ${lIdx})" class="text-text-muted hover:text-red-500 transition-colors">
                                <span class="material-symbols-outlined text-sm">close</span>
                            </button>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input type="text" value="${(lesson.video || '').replace(/"/g, '&quot;')}" placeholder="URL del Video (YouTube o MP4)" 
                                oninput="currentModulesState[${mIdx}].lessons[${lIdx}].video = this.value"
                                class="bg-surface-dim border border-surface-border rounded-md px-3 py-1.5 text-[11px] text-text-muted focus:border-primary">
                            <input type="text" value="${(lesson.duration || '10:00').replace(/"/g, '&quot;')}" placeholder="Duración (Ej: 15:00)" 
                                oninput="currentModulesState[${mIdx}].lessons[${lIdx}].duration = this.value"
                                class="bg-surface-dim border border-surface-border rounded-md px-3 py-1.5 text-[11px] text-text-muted focus:border-primary">
                        </div>
                        
                        <!-- Recursos -->
                        <div class="pt-2">
                            <p class="text-[10px] font-bold text-text-muted uppercase mb-2 flex items-center gap-1">
                                <span class="material-symbols-outlined text-xs">attachment</span> Recursos Descargables
                            </p>
                            <div class="space-y-2 mb-2">
                                ${(lesson.resources || []).map((res, rIdx) => `
                                    <div class="flex items-center gap-2">
                                        <input type="text" value="${(res.title || '').replace(/"/g, '&quot;')}" placeholder="Nombre recurso" 
                                            oninput="currentModulesState[${mIdx}].lessons[${lIdx}].resources[${rIdx}].title = this.value"
                                            class="flex-1 bg-surface-dim border border-surface-border rounded px-2 py-1 text-[10px]">
                                        <input type="text" value="${(res.url || '').replace(/"/g, '&quot;')}" placeholder="URL (Drive...)" 
                                            oninput="currentModulesState[${mIdx}].lessons[${lIdx}].resources[${rIdx}].url = this.value"
                                            class="flex-1 bg-surface-dim border border-surface-border rounded px-2 py-1 text-[10px]">
                                        <button type="button" onclick="window.adminRemoveResource(${mIdx}, ${lIdx}, ${rIdx})" class="text-text-muted hover:text-red-500">
                                            <span class="material-symbols-outlined text-xs">delete</span>
                                        </button>
                                    </div>
                                `).join('')}
                            </div>
                            <button type="button" onclick="window.adminAddResource(${mIdx}, ${lIdx})" class="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                                <span class="material-symbols-outlined text-xs">add</span> Añadir Recurso
                            </button>
                        </div>

                        <!-- Asignación -->
                        <div class="pt-2 border-t border-surface-border mt-3">
                            <p class="text-[10px] font-bold text-text-muted uppercase mb-1 flex items-center gap-1">
                                <span class="material-symbols-outlined text-xs">assignment</span> Instrucciones de la Asignación
                            </p>
                            <textarea placeholder="Escribe aquí los requerimientos de la asignación..." 
                                oninput="currentModulesState[${mIdx}].lessons[${lIdx}].assignment = this.value"
                                class="w-full bg-surface-dim border border-surface-border rounded-md px-3 py-2 text-[11px] text-text-main focus:border-primary min-h-[60px] custom-scroll">${(lesson.assignment || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</textarea>
                        </div>
                    </div>
                `).join('')}
            </div>
            
            <button type="button" onclick="window.adminAddLesson(${mIdx})" class="w-full py-2 border border-dashed border-surface-border rounded-lg text-xs font-bold text-text-muted hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2">
                <span class="material-symbols-outlined text-sm">add</span> Añadir Lección
            </button>
        `;
        container.appendChild(mDiv);
    });
};

window.adminAddModule = () => {
    currentModulesState.push({ title: `Módulo ${currentModulesState.length + 1}`, lessons: [] });
    window.renderModulesBuilder(currentModulesState);
};

window.adminRemoveModule = (idx) => {
    if (confirm("¿Estás seguro de eliminar todo el módulo?")) {
        currentModulesState.splice(idx, 1);
        window.renderModulesBuilder(currentModulesState);
    }
};

window.adminAddLesson = (mIdx) => {
    const lCount = currentModulesState[mIdx].lessons.length;
    currentModulesState[mIdx].lessons.push({
        id: `lesson_${Date.now()}`,
        title: `Nueva Lección ${lCount + 1}`,
        duration: "10:00",
        video: "",
        resources: [],
        assignment: ""
    });
    window.renderModulesBuilder(currentModulesState);
};

window.adminRemoveLesson = (mIdx, lIdx) => {
    currentModulesState[mIdx].lessons.splice(lIdx, 1);
    window.renderModulesBuilder(currentModulesState);
};

window.adminAddResource = (mIdx, lIdx) => {
    if (!currentModulesState[mIdx].lessons[lIdx].resources) {
        currentModulesState[mIdx].lessons[lIdx].resources = [];
    }
    currentModulesState[mIdx].lessons[lIdx].resources.push({ title: "Nuevo Recurso", url: "" });
    window.renderModulesBuilder(currentModulesState);
};

window.adminRemoveResource = (mIdx, lIdx, rIdx) => {
    currentModulesState[mIdx].lessons[lIdx].resources.splice(rIdx, 1);
    window.renderModulesBuilder(currentModulesState);
};

window.adminSaveCourse = async (e) => {
    e.preventDefault();
    const btn = document.getElementById('admin-save-btn');
    const spinner = btn.querySelector('.animate-spin');
    spinner.classList.remove('hidden');
    
    let courseId = document.getElementById('admin-course-id').value;
    const title = document.getElementById('admin-course-title').value;
    const coverType = document.getElementById('admin-cover-type').value;
    const grad = document.getElementById('admin-course-grad').value;
    const img = document.getElementById('admin-course-img').value;
    
    if (!courseId) {
        courseId = "course_" + Date.now();
    }
    
    const courseData = {
        id: courseId,
        title: title,
        modules: currentModulesState,
        linearProgress: document.getElementById('admin-course-linear').checked,
        rating: "5.0",
        progress: "0%"
    };
    
    if (coverType === 'img' && img.trim() !== '') {
        courseData.imageUrl = img.trim();
        courseData.imageGrad = '';
    } else {
        courseData.imageGrad = grad || 'from-blue-600 to-primary';
        courseData.imageUrl = '';
    }
    
    try {
        const cleanData = JSON.parse(JSON.stringify(courseData));
        await db.collection("courses").doc(courseId).set(cleanData);
        UI.toast("Curso guardado exitosamente", "success");
        document.getElementById('admin-editor').classList.add('hidden');
        await App.fetchCourses(); 
        window.renderAdminCoursesList();
    } catch (err) {
        console.error("Save Error:", err);
        UI.toast("Error al guardar: " + (err.message || "Revisa la consola"), "error");
    } finally {
        spinner.classList.add('hidden');
    }
};

/* --- ADMIN: GESTIÓN DE ESTUDIANTES --- */

let adminAllStudents = [];

window.adminSwitchTab = (tabId) => {
    const tabs = ['cursos', 'estudiantes', 'evaluacion', 'analiticas'];
    tabs.forEach(t => {
        const btn = document.getElementById('admin-tab-' + t);
        const section = document.getElementById('admin-section-' + t);
        if(!btn || !section) return;
        
        if (t === tabId) {
            btn.classList.add('text-primary', 'border-primary');
            btn.classList.remove('text-text-muted', 'border-transparent');
            section.classList.remove('hidden');
            if (t === 'analiticas' && window.renderAdminAnalytics) window.renderAdminAnalytics();
        } else {
            btn.classList.remove('text-primary', 'border-primary');
            btn.classList.add('text-text-muted', 'border-transparent');
            section.classList.add('hidden');
        }
    });
};

window.loadAdminStudents = async () => {
    try {
        const snapshot = await db.collection("users").get();
        adminAllStudents = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
        window.renderAdminStudentsList();
    } catch (error) {
        console.error("Error cargando estudiantes:", error);
        UI.toast("Error al cargar lista de estudiantes", "error");
    }
};

window.renderAdminStudentsList = () => {
    const container = document.getElementById('admin-students-list');
    container.innerHTML = '';

    if (adminAllStudents.length === 0) {
        container.innerHTML = `
            <div class="col-span-full py-12 text-center text-text-muted">
                <span class="material-symbols-outlined text-4xl mb-2 opacity-50">group_off</span>
                <p>No hay estudiantes registrados.</p>
            </div>
        `;
        return;
    }

    adminAllStudents.forEach(student => {
        const isUserAdmin = student.isAdmin === true || student.email.toLowerCase() === 'josuerlinbritopvas@gmail.com';
        const isAdminTag = isUserAdmin ? 
            `<span class="ml-2 text-[10px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded uppercase">Admin</span>` : '';

        const card = document.createElement('div');
        card.className = "bg-surface-base border border-surface-border rounded-xl p-6 shadow-soft hover:shadow-floating transition-all";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 rounded-full bg-gradient-to-tr from-primary to-blue-300 flex items-center justify-center text-white font-bold">
                        ${student.fullName ? student.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                        <h4 class="font-bold text-text-main flex items-center">${student.fullName || 'Sin nombre'} ${isAdminTag}</h4>
                        <p class="text-xs text-text-muted">${student.email}</p>
                    </div>
                </div>
                <button onclick="window.adminEditStudent('${student.uid}')" class="text-text-muted hover:text-primary transition-colors p-2 hover:bg-surface-dim rounded-lg">
                    <span class="material-symbols-outlined">edit</span>
                </button>
            </div>
            <div class="border-t border-surface-border pt-4 mt-2">
                <p class="text-xs text-text-muted mb-2"><span class="font-bold">${(student.enrolled_courses || []).length}</span> Cursos Asignados:</p>
                <div class="flex flex-wrap gap-1">
                    ${(student.enrolled_courses || []).slice(0, 3).map(cId => {
                        const course = State.allCourses.find(c => c.id === cId);
                        return `<span class="text-[10px] bg-surface-dim border border-surface-border text-text-main px-2 py-1 rounded truncate max-w-[120px]">${course ? course.title : cId}</span>`;
                    }).join('')}
                    ${(student.enrolled_courses || []).length > 3 ? `<span class="text-[10px] bg-surface-dim text-text-muted px-2 py-1 rounded">...</span>` : ''}
                </div>
            </div>
        `;
        container.appendChild(card);
    });
};

window.renderStudentCoursesCheckboxes = (enrolled = []) => {
    const container = document.getElementById('admin-student-courses');
    container.innerHTML = '';
    
    State.allCourses.forEach(course => {
        const isChecked = enrolled.includes(course.id);
        const div = document.createElement('div');
        div.className = `flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'border-primary bg-primary-light' : 'border-surface-border bg-surface-base'}`;
        div.onclick = () => {
            const checkbox = div.querySelector('input[type="checkbox"]');
            checkbox.checked = !checkbox.checked;
            div.className = `flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${checkbox.checked ? 'border-primary bg-primary-light' : 'border-surface-border bg-surface-base'}`;
        };
        
        div.innerHTML = `
            <input type="checkbox" value="${course.id}" class="course-checkbox w-4 h-4 text-primary rounded focus:ring-primary border-surface-border" ${isChecked ? 'checked' : ''} onclick="event.stopPropagation()">
            <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-text-main truncate">${course.title}</p>
            </div>
        `;
        container.appendChild(div);
    });
};

window.adminAddStudent = () => {
    document.getElementById('admin-student-title').textContent = "Registrar Nuevo Estudiante";
    document.getElementById('admin-student-id').value = "";
    document.getElementById('admin-student-name').value = "";
    document.getElementById('admin-student-phone').value = "";
    document.getElementById('admin-student-email').value = "";
    document.getElementById('admin-student-email').readOnly = false;
    
    const passInput = document.getElementById('admin-student-password');
    passInput.required = true;
    passInput.value = "";
    document.getElementById('admin-student-password-hint').textContent = "Obligatorio para nuevos estudiantes. Mínimo 7 caracteres.";
    
    document.getElementById('role-student').checked = true;
    
    window.renderStudentCoursesCheckboxes([]);
    document.getElementById('admin-student-editor').classList.remove('hidden');
    document.getElementById('admin-student-editor').scrollIntoView({ behavior: 'smooth' });
};

window.adminEditStudent = (uid) => {
    const student = adminAllStudents.find(s => s.uid === uid);
    if (!student) return;

    document.getElementById('admin-student-title').textContent = "Editar Estudiante";
    document.getElementById('admin-student-id').value = student.uid;
    document.getElementById('admin-student-name').value = student.fullName || "";
    document.getElementById('admin-student-phone').value = student.phone || "";
    document.getElementById('admin-student-email').value = student.email || "";
    document.getElementById('admin-student-email').readOnly = true;
    
    const passInput = document.getElementById('admin-student-password');
    passInput.required = false;
    passInput.value = "";
    document.getElementById('admin-student-password-hint').textContent = "Opcional. Llena esto solo si deseas cambiarle la contraseña a este estudiante.";

    const isAdmin = student.isAdmin === true || student.email.toLowerCase() === 'josuerlinbritopvas@gmail.com';
    if (isAdmin) {
        document.getElementById('role-admin').checked = true;
    } else {
        document.getElementById('role-student').checked = true;
    }

    window.renderStudentCoursesCheckboxes(student.enrolled_courses || []);
    
    document.getElementById('admin-student-editor').classList.remove('hidden');
    document.getElementById('admin-student-editor').scrollIntoView({ behavior: 'smooth' });
};

window.renderStudentAssignments = (assignments) => {
    const container = document.getElementById('admin-student-assignments-list');
    container.innerHTML = '';
    
    const keys = Object.keys(assignments);
    if (keys.length === 0) {
        container.innerHTML = '<p class="text-sm text-text-muted italic py-4">Este estudiante aún no ha entregado ninguna asignación.</p>';
        return;
    }
    
    // Sort by submittedAt descending
    keys.sort((a, b) => {
        const dateA = new Date(assignments[a].submittedAt || 0);
        const dateB = new Date(assignments[b].submittedAt || 0);
        return dateB - dateA;
    });
    
    keys.forEach(key => {
        const assign = assignments[key];
        const dateStr = assign.submittedAt ? new Date(assign.submittedAt).toLocaleString() : 'Fecha desconocida';
        
        const div = document.createElement('div');
        div.className = 'p-4 border border-surface-border rounded-xl bg-surface-base hover:border-primary transition-colors';
        
        let linkHtml = '';
        if (assign.link) {
            linkHtml = `
                <a href="${assign.link}" target="_blank" class="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary hover:underline bg-primary-light/10 px-3 py-1.5 rounded-lg border border-primary/20">
                    <span class="material-symbols-outlined text-[16px]">link</span>
                    Abrir Enlace Adjunto
                </a>
            `;
        }
        
        let textHtml = '';
        if (assign.text) {
            textHtml = `<div class="mt-3 p-3 bg-surface-dim rounded-lg text-sm text-text-main italic border border-surface-border whitespace-pre-wrap">${assign.text}</div>`;
        }
        
        div.innerHTML = `
            <div class="flex justify-between items-start gap-4">
                <div>
                    <h5 class="font-bold text-text-main text-sm leading-tight">${assign.lessonTitle || 'Lección Desconocida'}</h5>
                    <p class="text-[10px] text-text-muted uppercase tracking-wider mt-1">${assign.moduleTitle || 'Módulo Desconocido'}</p>
                </div>
                <span class="text-[10px] bg-surface-dim text-text-muted px-2 py-1 rounded border border-surface-border whitespace-nowrap">${dateStr}</span>
            </div>
            ${linkHtml}
            ${textHtml}
        `;
        container.appendChild(div);
    });
};

// Listener para guardar estudiante
document.addEventListener('DOMContentLoaded', () => {
    const studentForm = document.getElementById('admin-student-form');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('admin-save-student-btn');
            const spinner = btn.querySelector('.animate-spin');
            spinner.classList.remove('hidden');
            btn.disabled = true;
            
            const uid = document.getElementById('admin-student-id').value;
            const name = document.getElementById('admin-student-name').value;
            const phone = document.getElementById('admin-student-phone').value;
            const email = document.getElementById('admin-student-email').value;
            const pass = document.getElementById('admin-student-password').value;
            const isAdminSelected = document.querySelector('input[name="user_role"]:checked').value === 'admin';
            
            // Recopilar cursos seleccionados
            const checkboxes = document.querySelectorAll('.course-checkbox:checked');
            const enrolled = Array.from(checkboxes).map(cb => cb.value);

            try {
                if (uid) {
                    // Editar usuario existente
                    const updateData = {
                        fullName: name,
                        phone: phone,
                        enrolled_courses: enrolled,
                        isAdmin: isAdminSelected
                    };
                    await db.collection("users").doc(uid).update(updateData);
                    
                    // Nota: Si el administrador quiere cambiar la contraseña, requeriría Admin SDK (backend).
                    // Desde el cliente auth no se puede cambiar la password de OTRO usuario directamente.
                    // Podemos indicarle que el usuario debe restablecerla por email.
                    if (pass.trim() !== '') {
                        UI.toast("Nota: Para cambiar contraseñas de alumnos, es necesario backend. El resto se guardó bien.", "info");
                    } else {
                        UI.toast("Estudiante actualizado correctamente.", "success");
                    }
                } else {
                    // Crear usuario nuevo con secondaryApp para no cerrar sesión de Admin
                    if (!pass || pass.length < 7) {
                        throw new Error("La contraseña debe tener al menos 7 caracteres.");
                    }
                    const userCredential = await secondaryAuth.createUserWithEmailAndPassword(email, pass);
                    const newUid = userCredential.user.uid;
                    
                    await db.collection("users").doc(newUid).set({
                        fullName: name,
                        phone: phone,
                        email: email,
                        enrolled_courses: enrolled,
                        progress: {},
                        notes: {},
                        assignments: {},
                        isAdmin: isAdminSelected
                    });
                    
                    // Cerrar sesión solo en la app secundaria
                    await secondaryAuth.signOut();
                    
                    UI.toast("Estudiante registrado correctamente.", "success");
                }
                
                document.getElementById('admin-student-editor').classList.add('hidden');
                await window.loadAdminStudents();
            } catch (error) {
                console.error("Error guardando estudiante:", error);
                const msg = error.code === 'auth/email-already-in-use' ? 'El correo ya está registrado.' : error.message;
                UI.toast(msg, "error");
            } finally {
                spinner.classList.add('hidden');
                btn.disabled = false;
            }
        });
    }
});

/* --- SISTEMA DE EVALUACIÓN GLOBAL --- */

window.renderAdminEvaluations = async () => {
    const list = document.getElementById('admin-evaluation-list');
    list.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-text-muted text-sm italic">Cargando asignaciones...</td></tr>';

    try {
        if (adminAllStudents.length === 0) await window.loadAdminStudents();
        
        let allAssignments = [];
        adminAllStudents.forEach(student => {
            if (student.assignments) {
                Object.keys(student.assignments).forEach(key => {
                    allAssignments.push({
                        ...student.assignments[key],
                        studentUid: student.uid,
                        studentName: student.fullName || student.email,
                        assignKey: key
                    });
                });
            }
        });

        // Sort by date desc
        allAssignments.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

        if (allAssignments.length === 0) {
            list.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-text-muted text-sm italic">No hay asignaciones enviadas aún.</td></tr>';
            return;
        }

        list.innerHTML = allAssignments.map(assign => {
            const status = assign.evaluation ? assign.evaluation.status : 'pending';
            const statusLabels = {
                pending: '<span class="px-2 py-1 bg-surface-dim border border-surface-border text-text-muted text-[10px] font-bold rounded uppercase">Pendiente</span>',
                satisfactory: '<span class="px-2 py-1 bg-green-500 text-white text-[10px] font-bold rounded uppercase">Aprobada</span>',
                incomplete: '<span class="px-2 py-1 bg-amber-500 text-white text-[10px] font-bold rounded uppercase">Incompleta</span>'
            };

            return `
                <tr class="hover:bg-surface-dim/50 transition-colors">
                    <td class="px-6 py-4">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                ${assign.studentName.charAt(0)}
                            </div>
                            <div>
                                <p class="text-sm font-bold text-text-main">${assign.studentName}</p>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-4">
                        <p class="text-sm text-text-main font-medium line-clamp-1">${assign.lessonTitle}</p>
                        <p class="text-[10px] text-text-muted uppercase">${assign.courseId.replace(/_/g, ' ')}</p>
                    </td>
                    <td class="px-6 py-4">
                        <p class="text-xs text-text-muted">${new Date(assign.submittedAt).toLocaleDateString()}</p>
                    </td>
                    <td class="px-6 py-4">
                        ${statusLabels[status]}
                    </td>
                    <td class="px-6 py-4 text-right">
                        <button onclick="window.openEvalModal('${assign.studentUid}', '${assign.assignKey}')" class="text-primary hover:underline font-bold text-xs flex items-center justify-end gap-1">
                            <span class="material-symbols-outlined text-[16px]">visibility</span> Revisar
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Error rendering evaluations:", error);
        list.innerHTML = '<tr><td colspan="5" class="px-6 py-12 text-center text-red-500 text-sm italic">Error al cargar datos.</td></tr>';
    }
};

window.openEvalModal = (uid, assignKey) => {
    const student = adminAllStudents.find(s => s.uid === uid);
    if (!student || !student.assignments[assignKey]) return;

    const assign = student.assignments[assignKey];
    document.getElementById('eval-uid').value = uid;
    document.getElementById('eval-assignkey').value = assignKey;
    document.getElementById('eval-student-name').textContent = student.fullName || student.email;
    document.getElementById('eval-lesson-title').textContent = assign.lessonTitle;
    document.getElementById('eval-link').href = assign.link || '#';
    document.getElementById('eval-comment-student').textContent = assign.text || 'Sin comentario.';
    
    // Reset form
    document.getElementById('eval-feedback').value = assign.evaluation ? assign.evaluation.comment : '';
    const statusRadio = document.querySelector(`input[name="eval_status"][value="${assign.evaluation ? assign.evaluation.status : 'satisfactory'}"]`);
    if (statusRadio) statusRadio.checked = true;

    document.getElementById('modal-eval').classList.replace('hidden', 'flex');
};

window.closeEvalModal = () => {
    document.getElementById('modal-eval').classList.replace('flex', 'hidden');
};

window.submitEvaluation = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const spinner = btn.querySelector('.animate-spin');
    
    const uid = document.getElementById('eval-uid').value;
    const assignKey = document.getElementById('eval-assignkey').value;
    const status = document.querySelector('input[name="eval_status"]:checked').value;
    const feedback = document.getElementById('eval-feedback').value;

    spinner.classList.remove('hidden');
    btn.disabled = true;

    try {
        const student = adminAllStudents.find(s => s.uid === uid);
        const assign = student ? student.assignments[assignKey] : null;
        
        if (!assign) throw new Error("Asignación no encontrada");

        const evalData = {
            status,
            comment: feedback,
            evaluatedAt: new Date().toISOString(),
            evaluatedBy: State.user.uid
        };

        const updateObj = {};
        updateObj[`assignments.${assignKey}.evaluation`] = evalData;
        updateObj[`progress.${assign.courseId}.${assign.lessonId}.approved`] = (status === 'satisfactory');

        // Update student record with dot notation for precision
        await db.collection("users").doc(uid).update(updateObj);

        // NOTIFICAR AL ESTUDIANTE
        const notification = {
            id: "notif_" + Date.now(),
            type: "evaluation",
            courseTitle: "Actualización de Tarea",
            lessonTitle: "Tu tarea ha sido evaluada",
            status: status,
            comment: feedback,
            submittedAt: new Date().toISOString(),
            read: false
        };

        await db.collection("users").doc(uid).update({
            notifications: firebase.firestore.FieldValue.arrayUnion(notification)
        });

        UI.toast("Evaluación enviada con éxito", "success");
        window.closeEvalModal();
        await window.loadAdminStudents(); // Refresh local data
        window.renderAdminEvaluations(); // Refresh list

    } catch (error) {
        console.error("Error submitting evaluation:", error);
        UI.toast("Error al enviar evaluación", "error");
    } finally {
        spinner.classList.add('hidden');
        btn.disabled = false;
    }
};

/* --- SISTEMA DE NOTIFICACIONES --- */

window.renderNotifications = () => {
    const list = document.getElementById('notif-list');
    const badge = document.getElementById('notif-badge');
    const notifications = State.notifications || [];

    const unreadCount = notifications.filter(n => !n.read).length;
    if (unreadCount > 0) {
        badge.classList.remove('hidden');
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        // Adjust badge size if it has text
        badge.className = "absolute top-1 right-1 w-4 h-4 bg-secondary text-white text-[8px] font-bold rounded-full border-2 border-surface-base flex items-center justify-center";
    } else {
        badge.classList.add('hidden');
    }

    if (notifications.length === 0) {
        list.innerHTML = '<div class="p-8 text-center text-text-muted text-xs">No tienes notificaciones nuevas.</div>';
        return;
    }

    // Sort desc
    const sorted = [...notifications].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    list.innerHTML = sorted.map(n => {
        let title = "", desc = "", icon = "", color = "";
        
        if (n.type === 'new_assignment') {
            title = "Nueva Tarea Recibida";
            desc = `<b>${n.studentName}</b> envió una tarea en <i>${n.lessonTitle}</i>`;
            icon = "assignment";
            color = "text-primary";
        } else if (n.type === 'evaluation') {
            title = n.status === 'satisfactory' ? "Tarea Aprobada" : "Revisión de Tarea";
            desc = n.comment;
            icon = n.status === 'satisfactory' ? "verified" : "warning";
            color = n.status === 'satisfactory' ? "text-green-500" : "text-amber-500";
        }

        return `
            <div class="p-4 hover:bg-surface-dim transition-colors cursor-pointer ${n.read ? 'opacity-60' : 'bg-primary-light/5'}" onclick="window.handleNotifClick('${n.id}')">
                <div class="flex gap-3">
                    <div class="w-8 h-8 rounded-full bg-surface-dim flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined text-[18px] ${color}">${icon}</span>
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-xs font-bold text-text-main">${title}</p>
                        <p class="text-[11px] text-text-muted line-clamp-2 mt-0.5">${desc}</p>
                        <p class="text-[9px] text-text-muted mt-1 uppercase">${new Date(n.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                    </div>
                    ${!n.read ? '<div class="w-2 h-2 bg-primary rounded-full self-center"></div>' : ''}
                </div>
            </div>
        `;
    }).join('');
};

window.markAllNotifsRead = async () => {
    if (!State.user || State.notifications.length === 0) return;
    
    const updated = State.notifications.map(n => ({ ...n, read: true }));
    State.notifications = updated;
    window.renderNotifications();

    try {
        await db.collection("users").doc(State.user.uid).update({
            notifications: updated
        });
    } catch (err) {
        console.error(err);
    }
};

window.handleNotifClick = async (notifId) => {
    const notif = State.notifications.find(n => n.id === notifId);
    if (!notif) return;

    // Mark as read
    notif.read = true;
    window.renderNotifications();
    await db.collection("users").doc(State.user.uid).update({
        notifications: State.notifications
    });

    // Action based on type
    if (notif.type === 'new_assignment') {
        window.openAdminView();
        window.adminSwitchTab('evaluacion');
    } else {
        // Estudiante
        UI.showView('dashboard');
    }
};

// Iniciar aplicación
App.init();

window.adminChartInstance = null;
window.renderAdminAnalytics = async () => {
    try {
        const studentsSnap = await State.db.collection('users').get();
        const students = [];
        studentsSnap.forEach(doc => students.push({ id: doc.id, ...doc.data() }));
        
        document.getElementById('analytics-total-students').innerText = students.length;
        
        let completedCourses = 0;
        let totalEnrolled = 0;
        const now = Date.now();
        const riskStudents = [];
        
        const courseProgressMap = {};
        State.courses.forEach(c => courseProgressMap[c.id] = {title: c.title, totalProgress: 0, count: 0});

        students.forEach(student => {
            // Riesgo si inactivo > 7 días o sin lastLogin
            const lastLogin = student.lastLogin || 0;
            const daysInactive = (now - lastLogin) / (1000 * 60 * 60 * 24);
            if (daysInactive > 7) {
                riskStudents.push({...student, daysInactive: Math.floor(daysInactive)});
            }
            
            // Progress
            if (student.progress) {
                Object.keys(student.progress).forEach(courseId => {
                    totalEnrolled++;
                    const cp = student.progress[courseId];
                    if (cp.completed) completedCourses++;
                    
                    if (courseProgressMap[courseId]) {
                        // Calcular porcentaje simple (solo lecciones completadas)
                        const completedLessons = Object.values(cp).filter(v => v === true).length;
                        // Estimación rápida (mejor sería calcular contra el total de lecciones del curso)
                        courseProgressMap[courseId].totalProgress += completedLessons; 
                        courseProgressMap[courseId].count++;
                    }
                });
            }
        });

        document.getElementById('analytics-completion-rate').innerText = totalEnrolled > 0 ? Math.round((completedCourses / totalEnrolled) * 100) + '%' : '0%';
        document.getElementById('analytics-risk-students').innerText = riskStudents.length;
        
        const riskHtml = riskStudents.length === 0 ? '<p class="text-sm text-text-muted text-center p-4">Todos los alumnos están activos.</p>' : riskStudents.sort((a,b) => b.daysInactive - a.daysInactive).slice(0,10).map(s => `
            <div class="p-3 border border-red-500/20 bg-red-500/5 rounded-lg flex justify-between items-center">
                <div>
                    <p class="font-bold text-sm text-text-main">${s.name || s.email}</p>
                    <p class="text-[10px] text-text-muted">${s.email}</p>
                </div>
                <span class="text-xs font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded">Inactivo ${s.daysInactive} días</span>
            </div>
        `).join('');
        document.getElementById('risk-students-list').innerHTML = riskHtml;

        // Chart.js
        const ctx = document.getElementById('chart-courses');
        if(ctx) {
            if (window.adminChartInstance) window.adminChartInstance.destroy();
            
            const labels = [];
            const data = [];
            Object.values(courseProgressMap).forEach(cm => {
                if(cm.count > 0) {
                    labels.push(cm.title.substring(0, 15) + '...');
                    data.push(Math.round((cm.totalProgress / cm.count) * 10)); // Estimación (lecciones completadas promedio)
                }
            });

            window.adminChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Interacción Promedio (Lecciones Vistas)',
                        data: data,
                        backgroundColor: '#38B6FF',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true } }
                }
            });
        }
    } catch(err) {
        console.error("Error en analiticas:", err);
    }
};

