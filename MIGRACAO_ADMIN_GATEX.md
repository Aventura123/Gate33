# 🚀 Migração Admin/Support para Firebase Auth - Plano Completo

## 🎯 **OBJETIVO**
Migrar admins e support para Firebase Auth usando **username → email interno**, mantendo interface familiar mas resolvendo conflitos de email.

## 🔧 **ESTRATÉGIA: Username → Email Interno**

### **Como Funciona:**
```typescript
// Admin faz login
Username: "raulcsdm94"
Password: "senha123"

// Sistema converte
Email interno: "admin.raulcsdm94@gate33.internal"
Firebase Auth: usa email interno
Interface: mostra "raulcsdm94" (limpo)
```

## 📊 **CONFLITOS IDENTIFICADOS**
```
Admin conflitos com Seekers:
- raulcsdm94@gmail.com
- ghita.cristian202@gmail.com

Solução: Converter para emails internos únicos
```

## 🛠️ **IMPLEMENTAÇÃO**

### **FASE 1: Preparar Sistema de Conversão**

#### 1.1 **Função de Conversão Username → Email**
```typescript
// utils/adminEmailConverter.ts
export function usernameToInternalEmail(username: string, role: 'admin' | 'support'): string {
  // Remover caracteres especiais e normalizar
  const cleanUsername = username.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return `${role}.${cleanUsername}@gate33.internal`;
}

export function internalEmailToUsername(email: string): string {
  // admin.raulcsdm94@gate33.internal → raulcsdm94
  return email.split('.')[1].split('@')[0];
}
```

#### 1.2 **Atualizar API de Login Admin**
```typescript
// app/api/admin/login/route.ts
export async function POST(request: Request) {
  const { username, password } = await request.json();
  
  // 1. Buscar admin por username no Firestore
  const adminDoc = await findAdminByUsername(username);
  
  // 2. Verificar password (bcrypt)
  const passwordValid = await bcrypt.compare(password, adminDoc.password);
  
  // 3. Converter username para email interno
  const internalEmail = usernameToInternalEmail(username, adminDoc.role);
  
  // 4. Criar/obter conta Firebase Auth
  let firebaseUser;
  try {
    firebaseUser = await auth.getUserByEmail(internalEmail);
  } catch {
    // Criar nova conta Firebase Auth
    firebaseUser = await auth.createUser({
      email: internalEmail,
      displayName: adminDoc.name,
      password: generateTempPassword() // Senha temporária
    });
  }
  
  // 5. Definir custom claims
  await auth.setCustomUserClaims(firebaseUser.uid, {
    role: adminDoc.role, // 'admin' ou 'support'
    username: username,
    adminId: adminDoc.id
  });
  
  // 6. Retornar token Firebase Auth
  const customToken = await auth.createCustomToken(firebaseUser.uid);
  
  return NextResponse.json({
    success: true,
    firebaseToken: customToken,
    admin: {
      username: username, // Mostrar username, não email
      role: adminDoc.role,
      name: adminDoc.name
    }
  });
}
```

#### 1.3 **Atualizar Frontend Admin Login**
```typescript
// app/admin-login/page.tsx
const handleLogin = async (e: React.FormEvent) => {
  // 1. Login via API (retorna Firebase token)
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  
  const data = await response.json();
  
  // 2. Autenticar no Firebase com token personalizado
  await signInWithCustomToken(auth, data.firebaseToken);
  
  // 3. Agora tem request.auth válido!
  router.replace('/admin/dashboard');
};
```

### **FASE 2: Script de Migração**

#### 2.1 **Migrar Admins Existentes**
```typescript
// scripts/migrate-admins-to-firebase-internal.js
async function migrateAdmins() {
  const admins = await getDocs(collection(db, 'admins'));
  
  for (const adminDoc of admins.docs) {
    const adminData = adminDoc.data();
    const username = adminData.username;
    const role = adminData.role || 'admin';
    
    // Converter para email interno
    const internalEmail = usernameToInternalEmail(username, role);
    
    try {
      // Criar conta Firebase Auth
      const firebaseUser = await auth.createUser({
        email: internalEmail,
        displayName: adminData.name,
        password: generateTempPassword()
      });
      
      // Definir custom claims
      await auth.setCustomUserClaims(firebaseUser.uid, {
        role: role,
        username: username,
        adminId: adminDoc.id
      });
      
      // Mover documento Firestore para usar UID do Firebase
      const newAdminRef = doc(db, 'admins', firebaseUser.uid);
      await setDoc(newAdminRef, {
        ...adminData,
        firebaseUid: firebaseUser.uid,
        internalEmail: internalEmail,
        migratedToFirebase: true,
        migrationDate: new Date()
      });
      
      // Deletar documento antigo
      await deleteDoc(adminDoc.ref);
      
      console.log(`✅ Migrado: ${username} → ${internalEmail}`);
      
    } catch (error) {
      console.error(`❌ Erro ao migrar ${username}:`, error);
    }
  }
}
```

### **FASE 3: Sistema de Recovery Personalizado**

#### 3.1 **Interface de Recovery no Admin Dashboard**
```typescript
// app/admin/dashboard/components/PasswordRecovery.tsx
export function AdminPasswordRecovery() {
  const handlePasswordReset = async (username: string) => {
    // 1. Buscar admin por username
    const adminDoc = await findAdminByUsername(username);
    
    // 2. Gerar token de reset personalizado
    const resetToken = generateSecureToken();
    
    // 3. Salvar token no Firestore
    await setDoc(doc(db, 'adminPasswordResets', resetToken), {
      username: username,
      adminId: adminDoc.id,
      expires: Date.now() + (60 * 60 * 1000), // 1 hora
      used: false
    });
    
    // 4. Enviar email com link personalizado
    await sendAdminPasswordResetEmail(
      adminDoc.email || adminDoc.contactEmail,
      `https://gatex.gate33.com/reset-password?token=${resetToken}`
    );
    
    alert(`Link de reset enviado para ${adminDoc.email}`);
  };
  
  return (
    <div className="admin-recovery">
      <h3>🔑 Reset Password de Admin</h3>
      <input placeholder="Username do admin" />
      <button onClick={() => handlePasswordReset(username)}>
        Enviar Link de Reset
      </button>
    </div>
  );
}
```

#### 3.2 **Página de Reset Personalizada**
```typescript
// app/admin/reset-password/page.tsx
export default function AdminPasswordReset() {
  const handleReset = async (token: string, newPassword: string) => {
    // 1. Validar token
    const resetDoc = await getDoc(doc(db, 'adminPasswordResets', token));
    
    // 2. Obter admin
    const adminData = resetDoc.data();
    const internalEmail = usernameToInternalEmail(adminData.username, 'admin');
    
    // 3. Atualizar password no Firebase Auth
    const user = await auth.getUserByEmail(internalEmail);
    await auth.updateUser(user.uid, { password: newPassword });
    
    // 4. Atualizar hash no Firestore
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await updateDoc(doc(db, 'admins', user.uid), {
      password: hashedPassword
    });
    
    // 5. Marcar token como usado
    await updateDoc(doc(db, 'adminPasswordResets', token), {
      used: true
    });
  };
}
```

## 🎯 **APLICAÇÃO PARA SUPPORT**

### **Support = Admin com Role Diferente**
```typescript
// Mesmo sistema, role diferente
const supportEmail = usernameToInternalEmail("support_user", "support");
// Resultado: "support.support_user@gate33.internal"

// Custom claims
{
  role: "support",
  username: "support_user",
  adminId: "admin_doc_id"
}
```

## 📋 **CHECKLIST DE MIGRAÇÃO**

### **Preparação**
- [ ] Criar função `usernameToInternalEmail()`
- [ ] Atualizar `/api/admin/login` para usar emails internos
- [ ] Atualizar frontend admin login
- [ ] Criar script de migração
- [ ] Preparar sistema de recovery personalizado

### **Execução**
- [ ] Executar script de migração para admins
- [ ] Executar script de migração para support
- [ ] Testar login com username
- [ ] Testar operações Firestore (escrita)
- [ ] Testar sistema de recovery

### **Validação**
- [ ] Todos os admins conseguem fazer login
- [ ] Custom claims funcionam
- [ ] Operações Firestore funcionais
- [ ] Sistema de recovery funcional
- [ ] Interface mostra username (não email)

### **Limpeza**
- [ ] Remover sistema de login legacy
- [ ] Remover JWT tokens antigos
- [ ] Atualizar documentação
- [ ] Remover APIs desnecessárias

## 🚀 **RESULTADO FINAL**

### **Admin Experience:**
```
Login: username "raulcsdm94" + password
Sistema: converte para "admin.raulcsdm94@gate33.internal"
Firebase: autentica com email interno
Interface: mostra "raulcsdm94" (limpo)
Recovery: via interface admin personalizada
```

### **Firestore Rules:**
```javascript
// Funciona perfeitamente!
function isAdmin() {
  return hasRole('admin') || 
    (isAuthenticated() && exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
}

// request.auth.uid = Firebase UID
// Custom claims = { role: 'admin', username: 'raulcsdm94' }
```

### **Zero Conflitos:**
- ✅ Admins: `admin.username@gate33.internal`
- ✅ Support: `support.username@gate33.internal`  
- ✅ Seekers: `email@real.com`
- ✅ Companies: `email@real.com`

## 🎯 **PRÓXIMOS PASSOS**

1. **Implementar Fase 1** (sistema de conversão)
2. **Criar script de migração** (Fase 2)
3. **Executar migração** em ambiente de teste
4. **Implementar recovery personalizado** (Fase 3)
5. **Deploy em produção**

**Esta solução resolve todos os problemas e mantém a experiência familiar para os admins! 🎉**
