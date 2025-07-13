# Firebase Admin & Firestore - Configuração Funcional

## 🎯 ESTADO ATUAL DO SISTEMA DE AUTENTICAÇÃO

### ✅ **SEEKERS - 100% Firebase Auth**
- ✅ Login: Firebase Auth + custom claims
- ✅ Signup: Firebase Auth direto
- ✅ Regras Firestore: Funcionam com Firebase Auth
- ✅ Dashboard: Usa Firebase Auth UID
- ✅ Google Login: Suportado

### ✅ **COMPANIES - 100% Firebase Auth**
- ✅ Registro: Vai para `pendingCompanies` → aprovação → Firebase Auth
- ✅ Login: Firebase Auth + custom claims obrigatórios
- ✅ Regras Firestore: Funcionam com Firebase Auth
- ✅ Dashboard: Usa Firebase Auth UID
- ✅ Fluxo aprovação: Migra automaticamente para Firebase Auth

### 🔄 **ADMINS - MIGRAÇÃO PLANEADA**
- ⚠️ Login: Sistema híbrido atual (problemático)
- 🎯 **PLANO**: Username → Email Interno (`admin.username@gate33.internal`)
- 🎯 **OBJETIVO**: Firebase Auth obrigatório + interface personalizada
- 📋 **DETALHES**: Ver `MIGRACAO_ADMIN_GATEX.md`

### 🔄 **SUPPORT - MIGRAÇÃO PLANEADA**  
- ❌ Login: Sistema legacy atual (problemático)
- 🎯 **PLANO**: Mesmo sistema que admin (`support.username@gate33.internal`)
- 🎯 **OBJETIVO**: Firebase Auth obrigatório + role "support"
- 📋 **DETALHES**: Ver `MIGRACAO_ADMIN_GATEX.md`

## 🚀 PRÓXIMAS ETAPAS PARA COMPLETAR A MIGRAÇÃO

### 1. **IMPLEMENTAR SISTEMA USERNAME → EMAIL INTERNO**
```typescript
// Função de conversão
usernameToInternalEmail("raulcsdm94", "admin") 
// → "admin.raulcsdm94@gate33.internal"
```
**O que faz:**
- Resolve conflitos de email automaticamente
- Mantém interface familiar (username)
- Funciona para admin E support

### 2. **MIGRAR ADMINS/SUPPORT EXISTENTES**
```bash
# Executar script de migração
node scripts/migrate-admins-to-firebase-internal.js --verbose
```
**O que faz:**
- Cria contas Firebase Auth com emails internos
- Move documentos Firestore para usar UID do Firebase Auth
- Define custom claims automaticamente
- Preserva usernames para interface

### 3. **IMPLEMENTAR RECOVERY PERSONALIZADO**
**Interface admin para reset de passwords:**
- [ ] Buscar admin por username (não email)
- [ ] Enviar link de reset para email real do admin
- [ ] Página de reset personalizada no GateX
- [ ] Atualizar tanto Firebase Auth quanto Firestore

### 4. **VALIDAÇÃO E LIMPEZA**
- [ ] Testar login de admin/support após migração
- [ ] Validar escrita no Firestore (rules)
- [ ] Remover sistema legacy (JWT/bcrypt direto)
- [ ] Atualizar documentação

## 📁 Estrutura de Ficheiros Mantidos

### `lib/firebaseAdmin.ts` ✅ PRINCIPAL
- **Função**: Inicialização robusta do Firebase Admin SDK v13.x
- **Usado por**: APIs de login admin/company, custom claims
- **Funcionalidades**:
  - Suporte para ADC (Application Default Credentials)
  - Correção automática de chave privada para v13.x
  - Fallbacks múltiplos para diferentes ambientes
  - Validação e diagnóstico de configuração

### `utils/firebaseAuthSync.ts` ✅ NECESSÁRIO
- **Função**: Sincronização de custom claims entre client e server
- **Usado por**: `AuthProvider.tsx` 
- **Funcionalidades**:
  - Define custom claims via API calls
  - Sincroniza roles (admin, company, seeker)
  - Retry logic para falhas temporárias
  - Atualização de localStorage

### `firestore.rules` ✅ CORRIGIDO
- **Função**: Regras de segurança com fallbacks
- **Melhorias**: Funciona mesmo sem custom claims iniciais

## 🛡️ Como Funcionam as Regras de Firestore

### Estratégia de Permissões (3 Níveis)

**NOTA**: Todos os níveis requerem `request.auth != null` (Firebase Auth obrigatório)

```javascript
// Função base: SEMPRE verifica autenticação Firebase
function isAuthenticated() {
  return request.auth != null; // 🔑 FIREBASE AUTH OBRIGATÓRIO
}

// 1. Custom Claims (preferido)
function hasRole(role) {
  return isAuthenticated() && 
    request.auth.token != null && 
    request.auth.token.role == role;
}

// 2. Fallback: Documento existe na coleção (AINDA PRECISA DE AUTH)
function isAdmin() {
  return hasRole('admin') || 
    (isAuthenticated() && exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
    //    ↑ FIREBASE AUTH NECESSÁRIO AQUI TAMBÉM
}

// 3. Owner-based: Usuário é dono do documento (PRECISA DE AUTH)
function isOwner(userId) {
  return isAuthenticated() && request.auth.uid == userId;
  //     ↑ SEM ISTO, NÃO FUNCIONA
}
```

### Categorias de Acesso

#### 🌐 **Leitura Global**
```javascript
match /{document=**} {
  allow read: if true; // Todos podem ler
}
```

#### 👤 **Signup (Sem Autenticação)**
```javascript
match /users/{userId} {
  allow create: if true; // Qualquer um pode criar conta
}
match /seekers/{userId} {
  allow create: if true; // Qualquer um pode registar-se como seeker
}
match /companies/{userId} {
  allow create: if true; // Qualquer um pode registar empresa
}
```

#### 🔒 **Apenas Admin**
```javascript
match /admins/{docId} {
  allow write: if isAdmin(); // Custom claims OU documento existe
}
match /settings/{docId} {
  allow write: if isAdmin();
}
match /monitoring/{docId} {
  allow write: if isAdmin();
}
```

#### 🏢 **Companies + Admin**
```javascript
match /jobs/{docId} {
  allow write: if isCompany() || isAdmin();
}
match /instantJobs/{docId} {
  allow write: if isCompany() || isAdmin();
}
```

#### 🔍 **Seekers + Admin**
```javascript
match /applications/{docId} {
  allow write: if isSeeker() || isAdmin();
}
match /learn2earn/{docId} {
  allow write: if isSeeker() || isAdmin();
}
```

#### 🔓 **Utilizadores Autenticados**
```javascript
match /notifications/{docId} {
  allow write: if isAuthenticated(); // Qualquer user logado
}
match /payments/{docId} {
  allow write: if isAuthenticated();
}
```

#### ⚡ **Especiais**
```javascript
match /passwordResets/{docId} {
  allow write: if true; // Reset password sem auth
}
match /pendingCompanies/{docId} {
  allow create: if true; // Candidatura sem auth
  allow update, delete: if isAdmin();
}
match /write-test/{docId} {
  allow write: if true; // Testes de desenvolvimento
}
```

## 🔧 Como Funciona a Autenticação

### 1. **Firebase Admin SDK Inicialização**
```typescript
// lib/firebaseAdmin.ts
export function initAdmin() {
  // 1. Tentar ADC (Application Default Credentials)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    return initializeApp({ credential: applicationDefault() });
  }
  
  // 2. Tentar Service Account manual
  if (privateKey && clientEmail) {
    const cleanKey = fixPrivateKey(privateKey); // Correção v13.x
    return initializeApp({ credential: cert({...}) });
  }
  
  // 3. Fallback para desenvolvimento
  return initializeApp({ projectId });
}
```

### 2. **Login Flow**
```
User Login → Firebase Auth → Set Custom Claims → Firestore Access
     ↓              ↓              ↓                    ↓
  Email/Pass → User Object → API Call /auth/set → Rules Check
```

### 3. **Custom Claims Sync**
```typescript
// utils/firebaseAuthSync.ts
export async function syncUserRoleWithFirebase(user, role) {
  // 1. Atualizar localStorage imediatamente
  localStorage.setItem('userRole', role);
  
  // 2. Verificar se já tem claims corretos
  const token = await user.getIdTokenResult();
  if (token.claims.role === role) return true;
  
  // 3. Chamar API para definir claims
  const response = await fetch('/api/auth/set-custom-claims', {
    method: 'POST',
    body: JSON.stringify({ uid: user.uid, role })
  });
  
  // 4. Forçar refresh do token
  await user.getIdToken(true);
}
```

## 🚀 Vantagens da Configuração Atual

### ✅ **Robustez**
- **Fallbacks múltiplos**: Custom claims → Document exists → Owner check
- **Compatibilidade v13.x**: Correção automática de chaves privadas
- **Zero downtime**: Signup funciona mesmo sem custom claims

### ✅ **Segurança**
- **Role-based access**: Admin, Company, Seeker têm permissões específicas
- **Owner protection**: Users só editam seus próprios dados
- **Development friendly**: Coleções de teste permitidas

### ✅ **Manutenção**
- **Código limpo**: Apenas ficheiros necessários mantidos
- **Logs detalhados**: Debugging facilitado
- **Erro handling**: Tratamento de edge cases

## 🔍 Como Testar

### 1. **Verificar Firestore Rules**
```bash
firebase deploy --only firestore:rules
```

### 2. **Testar Login Admin**
```javascript
// Deve definir custom claims automaticamente
POST /api/admin/login
{ "email": "admin@example.com", "password": "password" }
```

### 3. **Verificar Custom Claims**
```javascript
// Ver se claims foram definidos
const user = auth.currentUser;
const token = await user.getIdTokenResult();
console.log(token.claims.role); // 'admin', 'company', 'seeker'
```

### 4. **Testar Escrita Firestore**
```javascript
// Deve funcionar com ou sem custom claims
await setDoc(doc(db, 'write-test', 'test'), { data: 'test' });
```

## 📊 Estado Atual do Sistema de Login

### ✅ **SEEKERS** - Totalmente Migrado para Firebase Auth
```typescript
// app/login/page.tsx + AuthProvider.tsx
Email/Password → Firebase Auth → Verificar em /seekers/{uid} → Custom Claims → Success
```
- **Método**: `signInWithEmailAndPassword()` (Firebase Auth)
- **Verificação**: Documento em `/seekers/{firebase_uid}`
- **Custom Claims**: Automático via `syncUserRoleWithFirebase()`
- **Status**: ✅ FUNCIONAL com Firebase v13.x

### ✅ **COMPANIES** - 100% Firebase Auth (LIMPO)
```typescript
// app/login/page.tsx + AuthProvider.tsx
Email/Password → Firebase Auth → Verificar em /companies/{uid} → Custom Claims → Success
```
- **Método**: `signInWithEmailAndPassword()` (Firebase Auth)
- **Verificação**: Documento em `/companies/{firebase_uid}`
- **Custom Claims**: ✅ Definidos via Firebase Admin SDK
- **Aprovação**: Via admin dashboard (pendingCompanies → companies)
- **Status**: ✅ FUNCIONAL - 100% Firebase Auth, sem APIs legacy

### ⚠️ **ADMIN** - Sistema Híbrido (Problemas Potenciais)
```typescript
// app/api/admin/login/route.ts
Email/Password → Firestore Query → bcrypt verify → JWT Token → Firebase Auth Sync
```
- **Método**: API custom + bcrypt + tokens JWT
- **Verificação**: Query em `/admins` por email/username
- **Custom Claims**: Tentativa de sync com Firebase Auth (opcional)
- **Status**: ⚠️ HÍBRIDO - pode ter problemas com Firestore rules se sync falhar

### ❌ **SUPPORT** - Sistema Legacy (PROBLEMÁTICO)
```typescript
// app/support-login/page.tsx
Email/Password → Firestore Query → bcrypt verify → localStorage Token
```
- **Método**: Query direto no Firestore + bcrypt
- **Verificação**: Query em `/admins` por role="support"
- **Custom Claims**: ❌ NÃO implementado (sem Firebase Auth)
- **Status**: ❌ PROBLEMÁTICO - sem Firebase Auth, viola regras Firestore

## 🚨 Problemas Identificados

### 1. **Admin Login - Inconsistência**
- Login via API custom `/api/admin/login`
- Tenta criar/sync Firebase Auth mas é opcional
- Se Firebase Auth falhar, admin fica sem `request.auth`
- **Resultado**: Pode não conseguir escrever no Firestore

### 2. **Company Login - RESOLVIDO ✅**
```typescript
// ATUAL (funcionando):
Email/Password → Firebase Auth → Verificar /companies/{uid} → Custom Claims → Success

// FLUXO COMPLETO:
1. Company se regista → pendingCompanies
2. Admin aprova → cria Firebase Auth → move para /companies/{auth_uid}
3. Company faz login → AuthProvider.tsx → Firebase Auth → Custom Claims
```

### 3. **Firestore Rules vs Reality**
- Rules assumem `request.auth != null` (Firebase Auth)
- Admin/Company podem estar "logados" mas sem Firebase Auth
- Fallbacks existem mas só funcionam SE `request.auth` existir

## 🔄 Como Funciona o Sistema Híbrido

### 1. **Signup Flow (Sem Auth Inicial)**
```
Utilizador → Cria conta → Firebase Auth → Documento Firestore
    ↓           ↓            ↓              ↓
Formulário → allow create → User Object → Sync com Firestore
```

### 2. **Login Flow (Com Auth Obrigatório)**  
```
Email/Pass → Firebase Auth → Custom Claims → Firestore Access
    ↓            ↓              ↓               ↓
Credenciais → request.auth → token.role → Rules Check
```

### 3. **Operações Normais (Auth Sempre Necessário)**
```
Acção → Verificar Auth → Verificar Permissões → Executar
  ↓          ↓               ↓                   ↓
Write → request.auth != null → isAdmin/isCompany → Success
```

## 📋 Resumo Final

- ✅ **SEEKERS**: 100% Firebase Auth funcionando
- ✅ **COMPANIES**: 100% Firebase Auth funcionando (LIMPO)
- ⚠️ **ADMIN**: Sistema híbrido (precisa migração para Firebase Auth)
- ❌ **SUPPORT**: Sistema legacy problemático (precisa migração)

### **Fluxo Completo das Companies** 🏢
```typescript
1. REGISTO:
   Company → company-register → pendingCompanies (sem Firebase Auth ainda)

2. APROVAÇÃO (Admin):
   pendingCompanies → createUserWithEmailAndPassword() → companies/{auth_uid}

3. LOGIN:
   Email/Password → AuthProvider.tsx → signInWithEmailAndPassword() → Custom Claims

4. OPERAÇÕES:
   Authenticated Company → Firestore rules → isCompany() || isAdmin() → Success
```

### **Configuração Limpa** ✨
- **Firebase Auth é OBRIGATÓRIO** para 99% das operações
- **Firebase Admin v13.x** funcionando com múltiplos fallbacks
- **Firestore Rules** robustas com fallbacks de permissão  
- **Custom Claims** sincronizados automaticamente para seekers E companies
- **APIs legacy** removidas (limpeza completa)
- **Código limpo** apenas ficheiros necessários

## 🔧 O Que Falta Corrigir

### **PRIORIDADE ALTA** 🔴

#### 1. **Company Login - Migrar para Firebase Auth**
```typescript
// ATUAL (problemático):
POST /api/company/login → Firestore query → JWT token

// NECESSÁRIO:
Email/Password → Firebase Auth → Verificar /companies/{uid} → Custom Claims
```

#### 2. **Admin Login - Corrigir Dependência Firebase Auth**
```typescript
// ATUAL (híbrido):
POST /api/admin/login → Firestore query → Tentar Firebase Auth (opcional)

// NECESSÁRIO:
Email/Password → Firebase Auth → Verificar /admins/{uid} → Custom Claims
```

### **SOLUÇÕES APLICADAS ✅**

#### **Para Companies: RESOLVIDO**
1. ✅ Migração para criar contas Firebase Auth durante aprovação
2. ✅ Login usa apenas `AuthProvider.tsx` com Firebase Auth
3. ✅ Custom claims automáticos via `syncUserRoleWithFirebase`
4. ✅ Operações de escrita funcionais (criar jobs, etc.)

#### **Para Admins: AINDA NECESSÁRIO**
1. Tornar Firebase Auth obrigatório (remover fallbacks de JWT)
2. Migrar script para criar contas Firebase Auth para admins existentes  
3. Garantir custom claims sempre funcionam
4. Atualizar middleware para verificar Firebase Auth

### **TESTE SIMPLES**
```javascript
// Verificar se conseguem escrever no Firestore após login:
await setDoc(doc(db, 'write-test', 'company-test'), { data: 'test' });
await setDoc(doc(db, 'write-test', 'admin-test'), { data: 'test' });
```

**EXPECTATIVA**: Companies/Admins provavelmente falham porque não têm `request.auth`
