// CarryVault - Core Application Logic
// Progressive Web App for Private Firearm Management

class CarryVaultApp {
    constructor() {
        this.db = null;
        this.currentTab = 'dashboard';
        this.data = {
            firearms: [],
            maintenance: [],
            training: [],
            permits: [],
            settings: {
                userState: '',
                notifications: {
                    permitAlerts: true,
                    maintenanceAlerts: true,
                    trainingAlerts: true
                }
            }
        };
        this.init();
    }

    async init() {
        console.log('🎯 CarryVault initializing...');
        await this.initDB();
        await this.loadData();
        this.setupEventListeners();
        this.setupPWA();
        this.checkOfflineStatus();
        this.updateDashboard();
        console.log('✅ CarryVault ready!');
    }

    async initDB() {
        // Using IndexedDB for local storage - completely private
        return new Promise((resolve) => {
            const request = indexedDB.open('CarryVaultDB', 1);
            
            request.onerror = () => {
                console.error('Database error:', request.error);
                resolve();
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('✅ Database connected');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object stores
                if (!db.objectStoreNames.contains('firearms')) {
                    db.createObjectStore('firearms', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('maintenance')) {
                    db.createObjectStore('maintenance', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('training')) {
                    db.createObjectStore('training', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('permits')) {
                    db.createObjectStore('permits', { keyPath: 'id', autoIncrement: true });
                }
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async loadData() {
        if (!this.db) return;
        
        try {
            // Load firearms
            const firearms = await this.getAll('firearms');
            this.data.firearms = firearms;
            
            // Load maintenance
            const maintenance = await this.getAll('maintenance');
            this.data.maintenance = maintenance;
            
            // Load training
            const training = await this.getAll('training');
            this.data.training = training;
            
            // Load permits
            const permits = await this.getAll('permits');
            this.data.permits = permits;
            
            // Load settings
            const settings = await this.getAll('settings');
            if (settings.length > 0) {
                this.data.settings = settings[0].value;
            }
            
            console.log('✅ Data loaded:', {
                firearms: this.data.firearms.length,
                maintenance: this.data.maintenance.length,
                training: this.data.training.length,
                permits: this.data.permits.length
            });
            
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    async getAll(storeName) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addItem(storeName, item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            const request = store.add(item);
            
            request.onsuccess = () => {
                console.log(`✅ Added to ${storeName}:`, item);
                resolve(request.result);
            };
            request.onerror = () => reject(request.error);
        });
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.querySelector('span').textContent.toLowerCase();
                this.showSection(section);
            });
        });

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(action => {
            action.addEventListener('click', (e) => {
                const title = e.currentTarget.querySelector('.quick-action-title').textContent;
                if (title.includes('Add Firearm')) this.addFirearm();
                if (title.includes('Log Maintenance')) this.addMaintenance();
                if (title.includes('Add Training')) this.addTraining();
                if (title.includes('Export Data')) this.exportData();
            });
        });

        // Header buttons
        document.querySelector('[onclick="exportData()"]').addEventListener('click', () => this.exportData());
        document.querySelector('[onclick="showSettings()"]').addEventListener('click', () => this.showSettings());

        console.log('✅ Event listeners setup complete');
    }

    setupPWA() {
        // Register service worker
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js')
                .then(registration => {
                    console.log('✅ Service Worker registered:', registration);
                })
                .catch(error => {
                    console.log('❌ Service Worker registration failed:', error);
                });
        }

        // Handle install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('installPrompt').classList.add('show');
        });

        window.installApp = () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                deferredPrompt.userChoice.then((choiceResult) => {
                    if (choiceResult.outcome === 'accepted') {
                        console.log('✅ User accepted install prompt');
                    }
                    deferredPrompt = null;
                    document.getElementById('installPrompt').classList.remove('show');
                });
            }
        };

        console.log('✅ PWA setup complete');
    }

    checkOfflineStatus() {
        const updateOnlineStatus = () => {
            const offlineIndicator = document.getElementById('offlineIndicator');
            if (!navigator.onLine) {
                offlineIndicator.classList.add('show');
                console.log('⚠️ Offline mode detected');
            } else {
                offlineIndicator.classList.remove('show');
            }
        };

        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);
        updateOnlineStatus();
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Remove active from all nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show selected section
        document.getElementById(sectionName).classList.add('active');

        // Activate corresponding nav item
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            if (item.querySelector('span').textContent.toLowerCase() === sectionName) {
                item.classList.add('active');
            }
        });

        this.currentTab = sectionName;
        this.updateSection(sectionName);
    }

    updateSection(sectionName) {
        switch(sectionName) {
            case 'dashboard':
                this.updateDashboard();
                break;
            case 'inventory':
                this.updateInventory();
                break;
            case 'maintenance':
                this.updateMaintenance();
                break;
            case 'training':
                this.updateTraining();
                break;
            case 'compliance':
                this.updateCompliance();
                break;
        }
    }

    updateDashboard() {
        document.getElementById('gunCount').textContent = this.data.firearms.length;
        document.getElementById('maintenanceCount').textContent = this.data.maintenance.length;
        document.getElementById('trainingCount').textContent = this.data.training.length;
        document.getElementById('alertCount').textContent = this.calculateAlerts();
    }

    updateInventory() {
        const list = document.getElementById('firearmList');
        if (this.data.firearms.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔫</div>
                    <div class="empty-state-title">No Firearms Added</div>
                    <div class="empty-state-text">Start building your private inventory</div>
                    <button class="btn" onclick="app.addFirearm()">Add First Firearm</button>
                </div>
            `;
            return;
        }

        list.innerHTML = this.data.firearms.map(gun => `
            <div class="firearm-card">
                <div class="firearm-header">
                    <div class="firearm-info">
                        <h3>${gun.makeModel}</h3>
                        <div class="firearm-meta">${gun.caliber} • ${gun.type}</div>
                        <div class="firearm-meta">Serial: ${gun.serial || 'N/A'}</div>
                    </div>
                    <div class="firearm-actions">
                        <button class="btn btn-secondary" onclick="app.editFirearm(${gun.id})">✏️</button>
                        <button class="btn btn-secondary" onclick="app.deleteFirearm(${gun.id})">🗑️</button>
                    </div>
                </div>
                <div style="display: flex; gap: 12px; margin-top: 12px;">
                    <button class="btn btn-secondary" onclick="app.addMaintenance(${gun.id})">🔧 Log Maintenance</button>
                    <button class="btn btn-secondary" onclick="app.addTraining(${gun.id})">🎯 Add Training</button>
                </div>
            </div>
        `).join('');
    }

    updateMaintenance() {
        const list = document.getElementById('maintenanceList');
        if (this.data.maintenance.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔧</div>
                    <div class="empty-state-title">No Maintenance Records</div>
                    <div class="empty-state-text">Track cleaning, repairs, and part replacements</div>
                    <button class="btn" onclick="app.addMaintenance()">Log First Maintenance</button>
                </div>
            `;
            return;
        }

        list.innerHTML = this.data.maintenance.map(item => `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4>${item.type}</h4>
                        <p style="color: #888; font-size: 0.9rem;">${item.date} • ${item.firearmMakeModel || 'General'}</p>
                    </div>
                    <div class="status-badge ${item.type.includes('Cleaning') ? 'status-good' : 'status-warning'}">${item.type}</div>
                </div>
                <p style="margin-top: 8px; color: #ccc;">${item.notes || 'No notes'}</p>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-secondary" onclick="app.editMaintenance(${item.id})">Edit</button>
                    <button class="btn btn-secondary" onclick="app.deleteMaintenance(${item.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    updateTraining() {
        const list = document.getElementById('trainingList');
        if (this.data.training.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🎯</div>
                    <div class="empty-state-title">No Training Records</div>
                    <div class="empty-state-text">Log courses, qualifications, and range sessions</div>
                    <button class="btn" onclick="app.addTraining()">Add First Training</button>
                </div>
            `;
            return;
        }

        list.innerHTML = this.data.training.map(item => `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4>${item.type}</h4>
                        <p style="color: #888; font-size: 0.9rem;">${item.date} • ${item.duration} hours</p>
                    </div>
                    <div class="status-badge status-good">✅ Completed</div>
                </div>
                <p style="margin-top: 8px; color: #ccc;">${item.notes || 'No notes'}</p>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-secondary" onclick="app.editTraining(${item.id})">Edit</button>
                    <button class="btn btn-secondary" onclick="app.deleteTraining(${item.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    updateCompliance() {
        this.updatePermits();
        this.updateAlerts();
        this.updateComplianceInfo();
    }

    updatePermits() {
        const list = document.getElementById('permitList');
        if (this.data.permits.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-text">No permits added</div></div>';
            return;
        }

        list.innerHTML = this.data.permits.map(permit => `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4>${permit.type} - ${permit.state}</h4>
                        <p style="color: #888; font-size: 0.9rem;">Expires: ${permit.expirationDate}</p>
                    </div>
                    <div class="status-badge ${this.isPermitExpiringSoon(permit) ? 'status-warning' : 'status-good'}">
                        ${this.isPermitExpiringSoon(permit) ? '⚠️ Expiring Soon' : '✅ Active'}
                    </div>
                </div>
                <div style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-secondary" onclick="app.editPermit(${permit.id})">Edit</button>
                    <button class="btn btn-secondary" onclick="app.deletePermit(${permit.id})">Delete</button>
                </div>
            </div>
        `).join('');
    }

    updateAlerts() {
        const list = document.getElementById('alertList');
        const alerts = this.generateAlerts();
        
        if (alerts.length === 0) {
            list.innerHTML = '<div class="empty-state"><div class="empty-state-text">No alerts configured</div></div>';
            return;
        }

        list.innerHTML = alerts.map(alert => `
            <div class="card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4>${alert.title}</h4>
                        <p style="color: #888; font-size: 0.9rem;">${alert.description}</p>
                    </div>
                    <div class="status-badge ${alert.priority === 'high' ? 'status-bad' : 'status-warning'}">
                        ${alert.priority === 'high' ? '🚨 Urgent' : '⚠️ Soon'}
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateComplianceInfo() {
        const state = this.data.settings.userState;
        const info = document.getElementById('complianceInfo');
        
        if (!state) {
            info.innerHTML = '<p style="color: #888;">Select your state to see relevant compliance information.</p>';
            return;
        }

        // Basic compliance info by state (can be expanded)
        const stateInfo = {
            'TX': { permit: 'None required', training: 'Not required', notes: 'Constitutional carry state' },
            'FL': { permit: 'Shall issue', training: 'Required', notes: 'Valid for 7 years' },
            'CA': { permit: 'May issue', training: 'Required', notes: 'Very restrictive - check local laws' },
            'PA': { permit: 'Shall issue', training: 'Not required', notes: 'Valid for 5 years' },
            'OH': { permit: 'Shall issue', training: 'Required', notes: 'Valid for 5 years' },
            'GA': { permit: 'Shall issue', training: 'Not required', notes: 'Valid for 5 years' },
            'NC': { permit: 'Shall issue', training: 'Required', notes: 'Valid for 5 years' },
            'MI': { permit: 'Shall issue', training: 'Required', notes: 'Valid for 4-5 years' },
            'IL': { permit: 'Shall issue', training: 'Required', notes: 'Valid for 5 years' },
            'VA': { permit: 'Shall issue', training: 'Required', notes: 'Valid for 5 years' }
        };

        const info = stateInfo[state] || { permit: 'Check local laws', training: 'Varies', notes: 'Research required' };
        
        info.innerHTML = `
            <div style="background: #2a2a2a; padding: 16px; border-radius: 8px; margin-top: 16px;">
                <p><strong>Permit System:</strong> ${info.permit}</p>
                <p><strong>Training Required:</strong> ${info.training}</p>
                <p><strong>Notes:</strong> ${info.notes}</p>
                <p style="color: #888; font-size: 0.8rem; margin-top: 8px;">
                    ⚠️ This is general information. Always verify current laws with official sources.
                </p>
            </div>
        `;
    }

    // CRUD Operations
    async addFirearm() {
        const modal = document.getElementById('addFirearmModal');
        modal.style.display = 'block';
        document.getElementById('modalBackdrop').style.display = 'block';
    }

    async saveFirearm() {
        const firearm = {
            id: Date.now(),
            makeModel: document.getElementById('firearmMakeModel').value,
            serial: document.getElementById('firearmSerial').value,
            caliber: document.getElementById('firearmCaliber').value,
            type: document.getElementById('firearmType').value,
            purchaseDate: document.getElementById('firearmPurchaseDate').value,
            price: document.getElementById('firearmPrice').value,
            notes: document.getElementById('firearmNotes').value,
            createdAt: new Date().toISOString()
        };

        if (!firearm.makeModel) {
            alert('Make/Model is required');
            return;
        }

        await this.addItem('firearms', firearm);
        this.data.firearms.push(firearm);
        this.updateInventory();
        this.updateDashboard();
        this.closeModal();
        
        // Clear form
        document.getElementById('firearmMakeModel').value = '';
        document.getElementById('firearmSerial').value = '';
        document.getElementById('firearmCaliber').value = '';
        document.getElementById('firearmType').value = '';
        document.getElementById('firearmPurchaseDate').value = '';
        document.getElementById('firearmPrice').value = '';
        document.getElementById('firearmNotes').value = '';
    }

    async addMaintenance() {
        const maintenance = {
            id: Date.now(),
            type: 'Cleaning', // Default - can be expanded
            date: new Date().toISOString().split('T')[0],
            firearmId: null,
            firearmMakeModel: 'General',
            notes: '',
            createdAt: new Date().toISOString()
        };

        await this.addItem('maintenance', maintenance);
        this.data.maintenance.push(maintenance);
        this.updateMaintenance();
        this.updateDashboard();
    }

    async addTraining() {
        const training = {
            id: Date.now(),
            type: 'Range Session', // Default - can be expanded
            date: new Date().toISOString().split('T')[0],
            duration: 1,
            firearmId: null,
            firearmMakeModel: 'General',
            notes: '',
            score: null,
            createdAt: new Date().toISOString()
        };

        await this.addItem('training', training);
        this.data.training.push(training);
        this.updateTraining();
        this.updateDashboard();
    }

    async addPermit() {
        const permit = {
            id: Date.now(),
            type: 'Concealed Carry',
            state: '',
            issueDate: '',
            expirationDate: '',
            permitNumber: '',
            notes: '',
            createdAt: new Date().toISOString()
        };

        await this.addItem('permits', permit);
        this.data.permits.push(permit);
        this.updateCompliance();
    }

    // Export functions
    exportData() {
        const data = {
            firearms: this.data.firearms,
            maintenance: this.data.maintenance,
            training: this.data.training,
            permits: this.data.permits,
            settings: this.data.settings,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carryvault-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportInventory() {
        const data = {
            type: 'Inventory Report',
            generated: new Date().toISOString(),
            firearms: this.data.firearms.map(gun => ({
                makeModel: gun.makeModel,
                serial: gun.serial,
                caliber: gun.caliber,
                type: gun.type,
                purchaseDate: gun.purchaseDate,
                price: gun.price
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `carryvault-inventory-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportTheftReport() {
        const data = {
            type: 'Theft Report Template',
            generated: new Date().toISOString(),
            personalInfo: {
                // User would fill this in
                name: '[YOUR NAME]',
                address: '[YOUR ADDRESS]',
                phone: '[YOUR PHONE]'
            },
            stolenItems: this.data.firearms.map(gun => ({
                makeModel: gun.makeModel,
                serial: gun.serial,
                caliber: gun.caliber,
                type: gun.type,
                purchaseDate: gun.purchaseDate,
                estimatedValue: gun.price || '[ESTIMATED VALUE]'
            }))
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `theft-report-template-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // Utility functions
    calculateAlerts() {
        let count = 0;
        
        // Check for expiring permits
        this.data.permits.forEach(permit => {
            if (this.isPermitExpiringSoon(permit)) count++;
        });
        
        return count;
    }

    isPermitExpiringSoon(permit) {
        if (!permit.expirationDate) return false;
        const expiration = new Date(permit.expirationDate);
        const now = new Date();
        const daysUntil = (expiration - now) / (1000 * 60 * 60 * 24);
        return daysUntil <= 90; // Alert 90 days before expiration
    }

    generateAlerts() {
        const alerts = [];
        const now = new Date();
        
        // Permit expiration alerts
        this.data.permits.forEach(permit => {
            if (permit.expirationDate) {
                const expiration = new Date(permit.expirationDate);
                const daysUntil = (expiration - now) / (1000 * 60 * 60 * 24);
                
                if (daysUntil <= 30) {
                    alerts.push({
                        title: `${permit.type} Expiring Soon`,
                        description: `Your ${permit.state} ${permit.type} expires in ${Math.ceil(daysUntil)} days`,
                        priority: 'high'
                    });
                } else if (daysUntil <= 90) {
                    alerts.push({
                        title: `${permit.type} Renewal Reminder`,
                        description: `Your ${permit.state} ${permit.type} expires in ${Math.ceil(daysUntil)} days`,
                        priority: 'medium'
                    });
                }
            }
        });
        
        return alerts;
    }

    showSettings() {
        this.showSection('export'); // Settings are in export section for now
    }

    closeModal() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        document.getElementById('modalBackdrop').style.display = 'none';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new CarryVaultApp();
});

// Global functions for HTML onclick handlers
window.showSection = (section) => window.app.showSection(section);
window.addFirearm = () => window.app.addFirearm();
window.saveFirearm = () => window.app.saveFirearm();
window.addMaintenance = () => window.app.addMaintenance();
window.addTraining = () => window.app.addTraining();
window.exportData = () => window.app.exportData();
window.exportInventory = () => window.app.exportInventory();
window.exportTheftReport = () => window.app.exportTheftReport();
window.showSettings = () => window.app.showSettings();
window.closeModal = () => window.app.closeModal();
window.installApp = () => window.installApp();