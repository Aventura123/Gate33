import { NextRequest, NextResponse } from "next/server";
import instantJobsService from "@/services/instantJobsService";
import { web3Service } from "@/services/web3Service";

// API para criar um Instant Job com depósito em escrow
export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const { 
      jobData, 
      companyId, 
      transactionDetails 
    } = data;
    
    if (!jobData || !companyId) {
      return NextResponse.json(
        { error: "Dados incompletos para criação de Instant Job" },
        { status: 400 }
      );
    }
    
    // Criar job no Firestore
    const jobId = await instantJobsService.createInstantJob({
      ...jobData,
      companyId,
      transactionHash: transactionDetails?.transactionHash,
      contractAddress: transactionDetails?.contractAddress
    });
    
    return NextResponse.json({ success: true, jobId });
  } catch (error) {
    console.error("Erro ao criar Instant Job:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: "Falha ao processar solicitação: " + errorMessage },
      { status: 500 }
    );
  }
}

// API para aceitar um Instant Job
export async function PUT(req: NextRequest) {
  try {
    const data = await req.json();
    const { jobId, workerId, workerName, action } = data;
    
    if (!jobId || !workerId) {
      return NextResponse.json(
        { error: "Dados incompletos para atualização de Instant Job" },
        { status: 400 }
      );
    }
    
    if (action === "accept") {
      await instantJobsService.acceptInstantJob(jobId, workerId, workerName);
      return NextResponse.json({ success: true, message: "Instant Job aceito com sucesso" });
    } 
    else if (action === "complete") {
      await instantJobsService.markAsCompleted(jobId, workerId);
      return NextResponse.json({ success: true, message: "Instant Job marcado como completo" });
    } 
    else if (action === "approve") {
      const { companyId } = data;
      if (!companyId) {
        return NextResponse.json(
          { error: "ID da empresa necessário para aprovar Instant Job" },
          { status: 400 }
        );
      }
      await instantJobsService.approveJob(jobId, companyId);
      return NextResponse.json({ success: true, message: "Instant Job aprovado com sucesso" });
    } 
    else {
      return NextResponse.json(
        { error: "Ação desconhecida" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Erro ao atualizar Instant Job:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: "Falha ao processar solicitação: " + errorMessage },
      { status: 500 }
    );
  }
}

// API para obter detalhes de um Instant Job
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const companyId = searchParams.get("companyId");
    const workerId = searchParams.get("workerId");
    
    if (jobId) {
      // Obter detalhes de um job específico
      const job = await instantJobsService.getJobById(jobId);
      return NextResponse.json(job);
    } 
    else if (companyId) {
      // Obter jobs de uma empresa
      const jobs = await instantJobsService.getInstantJobsByCompany(companyId);
      return NextResponse.json(jobs);
    } 
    else if (workerId) {
      // Obter jobs de um trabalhador
      const jobs = await instantJobsService.getInstantJobsByWorker(workerId);
      return NextResponse.json(jobs);
    } 
    else {
      // Obter todos os jobs disponíveis
      const jobs = await instantJobsService.getAvailableInstantJobs();
      return NextResponse.json(jobs);
    }
  } catch (error) {
    console.error("Erro ao buscar Instant Jobs:", error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return NextResponse.json(
      { error: "Falha ao processar solicitação: " + errorMessage },
      { status: 500 }
    );
  }
}