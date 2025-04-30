// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/**
 * @title InstantJobsEscrow
 * @dev Contrato para gerenciar micro-tarefas com sistema de escrow para pagamentos
 */
contract InstantJobsEscrow {
    struct Job {
        address employer;      // Empresa que criou o trabalho
        address worker;        // Profissional que aceitou o trabalho
        uint256 payment;       // Valor do pagamento
        uint256 deadline;      // Prazo final
        string jobId;          // ID correspondente no Firebase
        bool isAccepted;       // Se o trabalho foi aceito
        bool isCompleted;      // Se o trabalho foi marcado como concluído
        bool isApproved;       // Se o trabalho foi aprovado
        bool isPaid;           // Se o pagamento foi liberado
        uint8 disputeStatus;   // Status de disputa (0=sem disputa, 1=em disputa, 2=resolvida)
    }
    
    // Owner e configurações do contrato
    address public owner;
    uint256 public platformFeePercentage = 50; // 5% (base 1000)
    address public feeCollector;
    
    // Mapeamentos principais
    mapping(string => Job) public jobs;
    mapping(address => uint256) public balances;
    
    // Modificador para funções restritas ao owner
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }
    
    // Inicialização do contrato
    constructor() {
        owner = msg.sender;
        feeCollector = msg.sender; // Inicialmente, o owner também é o coletor de taxas
    }
    
    // Eventos
    event JobCreated(string jobId, address employer, uint256 payment);
    event JobAccepted(string jobId, address worker);
    event JobCompleted(string jobId);
    event JobApproved(string jobId);
    event PaymentReleased(string jobId, address worker, uint256 amount);
    event DisputeOpened(string jobId);
    event DisputeResolved(string jobId, address winner);
    event FeePercentageUpdated(uint256 oldPercentage, uint256 newPercentage);
    event FeeCollectorUpdated(address oldCollector, address newCollector);
    
    // Criar novo instant job com depósito
    function createJob(string memory jobId, uint256 deadline) external payable {
        require(msg.value > 0, "Payment must be greater than zero");
        require(jobs[jobId].employer == address(0), "Job already exists");
        
        jobs[jobId] = Job({
            employer: msg.sender,
            worker: address(0),
            payment: msg.value,
            deadline: deadline,
            jobId: jobId,
            isAccepted: false,
            isCompleted: false,
            isApproved: false,
            isPaid: false,
            disputeStatus: 0
        });
        
        balances[msg.sender] += msg.value;
        emit JobCreated(jobId, msg.sender, msg.value);
    }
    
    // Aceitar um trabalho
    function acceptJob(string memory jobId) external {
        Job storage job = jobs[jobId];
        require(job.employer != address(0), "Job does not exist");
        require(job.worker == address(0), "Job already accepted");
        require(!job.isCompleted, "Job already completed");
        
        job.worker = msg.sender;
        job.isAccepted = true;
        
        emit JobAccepted(jobId, msg.sender);
    }
    
    // Marcar trabalho como concluído (pelo worker)
    function completeJob(string memory jobId) external {
        Job storage job = jobs[jobId];
        require(job.worker == msg.sender, "Only worker can complete");
        require(job.isAccepted, "Job not accepted");
        require(!job.isCompleted, "Job already completed");
        
        job.isCompleted = true;
        
        emit JobCompleted(jobId);
    }
    
    // Aprovar trabalho e liberar pagamento (pelo employer)
    function approveAndPay(string memory jobId) external {
        Job storage job = jobs[jobId];
        require(job.employer == msg.sender, "Only employer can approve");
        require(job.isCompleted, "Job not completed yet");
        require(!job.isApproved, "Job already approved");
        require(!job.isPaid, "Payment already released");
        
        job.isApproved = true;
        job.isPaid = true;
        
        uint256 amount = job.payment;
        balances[job.employer] -= amount;
        
        // Calcula a taxa da plataforma (usando base 1000)
        uint256 fee = (amount * platformFeePercentage) / 1000;
        uint256 workerPayment = amount - fee;
        
        // Envia o pagamento para o worker
        (bool successWorker, ) = job.worker.call{value: workerPayment}("");
        require(successWorker, "Worker payment transfer failed");
        
        // Envia a taxa para o coletor de taxas
        if (fee > 0) {
            (bool successFee, ) = feeCollector.call{value: fee}("");
            require(successFee, "Fee transfer failed");
        }
        
        emit JobApproved(jobId);
        emit PaymentReleased(jobId, job.worker, workerPayment);
    }
    
    // Abrir disputa (por qualquer parte)
    function openDispute(string memory jobId) external {
        Job storage job = jobs[jobId];
        require(msg.sender == job.employer || msg.sender == job.worker, "Not authorized");
        require(job.isAccepted, "Job not accepted");
        require(job.disputeStatus == 0, "Dispute already exists");
        
        job.disputeStatus = 1; // Em disputa
        
        emit DisputeOpened(jobId);
    }
    
    // Resolver disputa (por árbitro/admin)
    function resolveDispute(string memory jobId, address winner, bool releasePayment) external {
        // Na implementação final, adicionar verificação de função de moderador
        Job storage job = jobs[jobId];
        require(job.disputeStatus == 1, "No active dispute");
        
        job.disputeStatus = 2; // Resolvida
        
        if (releasePayment && (winner == job.worker)) {
            job.isApproved = true;
            job.isPaid = true;
            
            uint256 amount = job.payment;
            balances[job.employer] -= amount;
            
            // Calcula a taxa da plataforma (usando base 1000)
            uint256 fee = (amount * platformFeePercentage) / 1000;
            uint256 workerPayment = amount - fee;
            
            // Envia o pagamento para o worker
            (bool successWorker, ) = job.worker.call{value: workerPayment}("");
            require(successWorker, "Worker payment transfer failed");
            
            // Envia a taxa para o coletor de taxas
            if (fee > 0) {
                (bool successFee, ) = feeCollector.call{value: fee}("");
                require(successFee, "Fee transfer failed");
            }
            
            emit PaymentReleased(jobId, job.worker, workerPayment);
        }
        
        emit DisputeResolved(jobId, winner);
    }
    
    // Atualizar a porcentagem da taxa da plataforma (apenas owner)
    function updatePlatformFeePercentage(uint256 _newPercentage) external onlyOwner {
        require(_newPercentage <= 100, "Fee cannot exceed 10%"); // Limite máximo de 10% (100 em base 1000)
        
        uint256 oldPercentage = platformFeePercentage;
        platformFeePercentage = _newPercentage;
        
        emit FeePercentageUpdated(oldPercentage, _newPercentage);
    }
    
    // Atualizar o endereço que recebe as taxas (apenas owner)
    function updateFeeCollector(address _newCollector) external onlyOwner {
        require(_newCollector != address(0), "Fee collector cannot be zero address");
        
        address oldCollector = feeCollector;
        feeCollector = _newCollector;
        
        emit FeeCollectorUpdated(oldCollector, _newCollector);
    }
    
    // Obter a taxa atual da plataforma
    function getPlatformFeePercentage() external view returns (uint256) {
        return platformFeePercentage;
    }
    
    // Transferir a propriedade do contrato
    function transferOwnership(address _newOwner) external onlyOwner {
        require(_newOwner != address(0), "New owner cannot be zero address");
        owner = _newOwner;
    }
}