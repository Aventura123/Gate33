import { NextResponse } from 'next/server';
import { sendContactFormEmail, sendContactFormConfirmation } from '@/utils/emailService';
import { logSystemActivity } from '@/utils/logSystem';

export async function POST(request: Request) {
  try {
    // Obter dados do formulário
    const data = await request.json();
    const { name, email, message, subject } = data;
    
    // Validação básica
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, message: 'Nome, email e mensagem são obrigatórios' },
        { status: 400 }
      );
    }
    
    // Enviar email para o suporte
    const supportEmailResult = await sendContactFormEmail({
      name,
      email,
      message,
      subject: subject || 'Nova mensagem do formulário de contato',
    });
    
    // Enviar confirmação para o usuário
    const confirmationEmailResult = await sendContactFormConfirmation({
      name,
      email,
    });
    
    // Registrar atividade no sistema
    try {
      await logSystemActivity(
        'system',
        'Sistema de Formulários',
        {
          action: 'envio_formulario',
          userName: name,
          userEmail: email,
          subject: subject || 'Formulário de contato',
          supportEmailSent: supportEmailResult.success,
          confirmationEmailSent: confirmationEmailResult.success,
          timestamp: new Date().toISOString()
        }
      );
    } catch (logError) {
      console.error('Erro ao registrar envio de formulário:', logError);
    }
    
    // Retornar resultado
    if (supportEmailResult.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Mensagem enviada com sucesso',
        confirmationSent: confirmationEmailResult.success
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Erro ao enviar mensagem: ' + supportEmailResult.message 
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Erro ao processar formulário de contato:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: `Erro ao processar solicitação: ${error instanceof Error ? error.message : String(error)}` 
      },
      { status: 500 }
    );
  }
}