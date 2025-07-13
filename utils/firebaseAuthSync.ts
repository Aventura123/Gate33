import { User as FirebaseUser } from 'firebase/auth';

/**
 * Sincroniza os custom claims do Firebase com o papel (role) do usuário
 * Isso é necessário para que as regras de segurança do Firestore funcionem corretamente
 * @param user Usuário Firebase autenticado
 * @param role Papel do usuário (admin, company, seeker)
 */
export async function syncUserRoleWithFirebase(
  user: FirebaseUser,
  role: 'admin' | 'company' | 'seeker',
  additionalClaims: Record<string, any> = {}
): Promise<boolean> {
  try {
    console.log('Sincronizando role para usuário:', user.uid, 'Role:', role);
    
    // Primeiro, atualizar localStorage imediatamente
    localStorage.setItem('userRole', role);
    localStorage.setItem('firebaseToken', await user.getIdToken());
    localStorage.setItem('firebaseUid', user.uid);
    
    // Verificar se o usuário já tem o custom claim correto
    const idTokenResult = await user.getIdTokenResult();
    if (idTokenResult.claims.role === role) {
      console.log('Usuário já tem o custom claim correto:', role);
      return true;
    }
    
    // Chamar API para definir custom claims
    console.log('Definindo custom claims via API...');
    const response = await fetch('/api/auth/set-custom-claims', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        uid: user.uid,
        claims: {
          role,
          ...additionalClaims
        }
      })
    });
    
    const responseData = await response.text();
    console.log('Resposta da API set-custom-claims:', response.status, responseData);
    
    if (response.ok) {
      // Aguardar um pouco para o Firebase processar (importante no v13.x)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Forçar refresh do token com retry
      let tokenRefreshed = false;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await user.getIdToken(true);
          tokenRefreshed = true;
          break;
        } catch (tokenError) {
          console.warn(`Tentativa ${attempt + 1} de refresh token falhou:`, tokenError);
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      if (tokenRefreshed) {
        console.log('Custom claims definidos com sucesso para role:', role);
        return true;
      } else {
        console.warn('Custom claims definidos mas token refresh falhou');
        return true; // Não falhar o login por isso
      }
    } else {
      console.error('Erro ao definir custom claims. Status:', response.status);
      console.error('Response:', responseData);
      
      try {
        const errorData = JSON.parse(responseData);
        console.error('Error details:', errorData);
        
        // Se é erro de usuário não encontrado, pode ser um problema de timing
        if (errorData.code === 'auth/user-not-found') {
          console.warn('Usuário não encontrado no Firebase Auth - possível problema de timing');
          // Aguardar um pouco e tentar novamente
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const retryResponse = await fetch('/api/auth/set-custom-claims', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              uid: user.uid,
              claims: {
                role,
                ...additionalClaims
              }
            })
          });
          
          if (retryResponse.ok) {
            console.log('Custom claims definidos com sucesso na segunda tentativa');
            await user.getIdToken(true);
            return true;
          }
        }
      } catch (e) {
        console.error('Response não é JSON válido:', responseData);
      }
      
      // Não falhar o login por causa disso - o usuário ainda pode usar a aplicação
      console.log('Continuando login apesar do erro nos custom claims');
      return true;
    }
    
  } catch (error) {
    console.error('Erro ao sincronizar role:', error);
    // Não falhar o login por causa disso
    return true;
  }
}

/**
 * Verifica se o usuário tem o papel (role) necessário no token
 * @param user Usuário Firebase autenticado
 * @param requiredRole Papel necessário
 */
export async function verifyUserRole(
  user: FirebaseUser,
  requiredRole: 'admin' | 'company' | 'seeker'
): Promise<boolean> {
  try {
    // Busca o token atualizado
    const idTokenResult = await user.getIdTokenResult();
    
    // Verifica se o token tem o claim de role e se é o correto
    return idTokenResult.claims.role === requiredRole;
  } catch (error) {
    console.error('Erro ao verificar papel do usuário:', error);
    return false;
  }
}
