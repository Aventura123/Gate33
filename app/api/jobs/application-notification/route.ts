import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/firebase';
import { getDoc, doc } from 'firebase/firestore';
import { createJobApplicationNotification } from '../../../../utils/jobApplicationNotifications';

// Função para enviar e-mails usando o serviço de e-mail existente
async function sendEmail(to: string | string[], subject: string, message: string) {
  try {
    const { sendEmail: sendEmailService } = await import('../../../../utils/emailService');
    
    // Se for um array, enviar para cada destinatário
    if (Array.isArray(to)) {
      for (const recipient of to) {
        await sendEmailService({
          to: recipient,
          subject,
          text: "Uma nova aplicação para vaga foi recebida.",
          html: message
        });
      }
    } else {
      await sendEmailService({
        to,
        subject,
        text: "Uma nova aplicação para vaga foi recebida.",
        html: message
      });
    }
    
    return true;
  } catch (error) {
    console.error("Erro ao enviar e-mail de notificação de aplicação:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      jobId,
      jobTitle,
      companyId,
      companyName,
      seekerId,
      seekerName,
      seekerEmail,
      seekerPhone,
      phoneCountry,
      resumeLetter,
      cvUrl,
      videoUrl,
      linkedinProfile,
      githubProfile,
      telegramHandle,
      portfolioUrl,
      yearsOfExperience,
      web3Experience,
      currentSalary,
      screeningAnswers,
      screeningQuestions
    } = body;
    
    // Validar campos obrigatórios
    if (!jobId || !companyId || !seekerId || !seekerEmail) {
      return NextResponse.json(
        { success: false, message: 'Campos obrigatórios faltando' },
        { status: 400 }
      );
    }
    
    // Buscar o e-mail da empresa
    const companyRef = doc(db, "companies", companyId);
    const companyDoc = await getDoc(companyRef);
    
    if (!companyDoc.exists()) {
      return NextResponse.json(
        { success: false, message: 'Empresa não encontrada' },
        { status: 404 }
      );
    }
    
    const companyData = companyDoc.data();
    const companyEmail = companyData.email;
    
    if (!companyEmail) {
      return NextResponse.json(
        { success: false, message: 'E-mail da empresa não encontrado' },
        { status: 400 }
      );
    }
    
    // Preparar o HTML do e-mail para a empresa
    const emailHtmlCompany = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
        <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">Nova Aplicação Recebida para: ${jobTitle}</h2>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Informações do Candidato:</h3>
          <ul style="list-style: none; padding-left: 0;">
            <li><strong>Nome:</strong> ${seekerName}</li>
            <li><strong>Email:</strong> ${seekerEmail}</li>
            <li><strong>Telefone:</strong> ${phoneCountry} ${seekerPhone}</li>
            <li><strong>Anos de Experiência:</strong> ${yearsOfExperience}</li>
            <li><strong>Experiência com Web3:</strong> ${web3Experience || 'Não informado'}</li>
            <li><strong>Salário Atual:</strong> ${currentSalary || 'Não informado'}</li>
          </ul>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Perfis Sociais e Portfolio:</h3>
          <ul style="list-style: none; padding-left: 0;">
            ${linkedinProfile ? `<li><strong>LinkedIn:</strong> <a href="${linkedinProfile}" target="_blank">${linkedinProfile}</a></li>` : ''}
            ${githubProfile ? `<li><strong>GitHub:</strong> <a href="${githubProfile}" target="_blank">${githubProfile}</a></li>` : ''}
            ${telegramHandle ? `<li><strong>Telegram:</strong> ${telegramHandle}</li>` : ''}
            ${portfolioUrl ? `<li><strong>Portfolio:</strong> <a href="${portfolioUrl}" target="_blank">${portfolioUrl}</a></li>` : ''}
          </ul>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Carta de Apresentação:</h3>
          <p style="background-color: #f9f9f9; padding: 15px; border-left: 4px solid #FF6B00;">${resumeLetter.replace(/\n/g, '<br>')}</p>
        </div>
        
        ${cvUrl ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Currículo Anexado:</h3>
          <p><a href="${cvUrl}" target="_blank" style="color: #FF6B00; font-weight: bold;">Baixar currículo</a></p>
        </div>
        ` : ''}
        
        ${videoUrl ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Vídeo de Apresentação:</h3>
          <p><a href="${videoUrl}" target="_blank" style="color: #FF6B00; font-weight: bold;">Assistir vídeo</a></p>
        </div>
        ` : ''}
        
        ${screeningQuestions && screeningQuestions.length > 0 ? `
        <div style="margin-bottom: 20px;">
          <h3 style="color: #333;">Respostas às perguntas:</h3>
          <ul style="background-color: #f9f9f9; padding: 15px;">
            ${screeningQuestions.map((question: string, index: number) => `
              <li style="margin-bottom: 10px;">
                <p style="font-weight: bold; margin-bottom: 5px;">${question}</p>
                <p style="color: #444;">${screeningAnswers[index] || 'Sem resposta'}</p>
              </li>
            `).join('')}
          </ul>
        </div>
        ` : ''}
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #777; font-size: 14px;">
          <p>Este é um e-mail automático do sistema Gate33. Para acessar todas as aplicações, entre em seu painel de controle.</p>
        </div>
      </div>
    `;
    
    // Preparar o HTML do e-mail para o candidato
    const emailHtmlCandidate = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FF6B00; border-radius: 5px;">
        <h2 style="color: #FF6B00; border-bottom: 2px solid #FF6B00; padding-bottom: 10px;">Sua aplicação foi enviada com sucesso!</h2>
        
        <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
          Obrigado por se candidatar à vaga <strong>${jobTitle}</strong> na empresa <strong>${companyName}</strong>.
        </p>
        
        <div style="background-color: #f9f9f9; border-left: 4px solid #FF6B00; padding: 15px; margin-bottom: 20px;">
          <p style="margin: 0;"><strong>Detalhes da sua aplicação:</strong></p>
          <ul>
            <li>Vaga: ${jobTitle}</li>
            <li>Empresa: ${companyName}</li>
            <li>Data: ${new Date().toLocaleString()}</li>
          </ul>
        </div>
        
        <p style="color: #333;">A empresa revisará sua aplicação e entrará em contato caso seu perfil atenda aos requisitos da vaga.</p>
        
        <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #ddd; color: #777; font-size: 14px;">
          <p>Este é um e-mail automático do sistema Gate33. Para acompanhar suas aplicações, acesse seu painel de controle.</p>
        </div>
      </div>
    `;
    
    // Enviar e-mail para a empresa
    const companyEmailSent = await sendEmail(
      companyEmail,
      `Nova aplicação recebida: ${jobTitle} - ${seekerName}`,
      emailHtmlCompany
    );
      // Enviar cópia para o candidato
    const candidateEmailSent = await sendEmail(
      seekerEmail,
      `Sua aplicação para: ${jobTitle} - ${companyName}`,
      emailHtmlCandidate
    );
    
    // Criar notificação para a empresa no sistema
    const notificationResult = await createJobApplicationNotification(
      companyId,
      seekerId,
      seekerName,
      jobId,
      jobTitle
    );
    
    return NextResponse.json({
      success: true,
      message: 'Notificações enviadas com sucesso',
      companyEmailSent,
      candidateEmailSent,
      notificationCreated: notificationResult.success
    });
    
  } catch (error) {
    console.error('Erro na API de notificação de aplicação:', error);
    return NextResponse.json(
      { success: false, message: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
