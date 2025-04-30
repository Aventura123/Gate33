// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title Gate33PaymentProcessor
 * @dev Contrato para processamento de pagamentos em criptomoedas para o projeto Gate33
 */
contract Gate33PaymentProcessor {
    address public owner;
    address public feeCollector;
    uint256 public feePercentage; // em base 1000 (ex: 25 = 2.5%)
    bool public paused;
    
    // Carteiras adicionais para divisão de fundos
    address public developmentWallet;
    address public charityWallet;
    address public evolutionWallet;
    
    // Percentuais para cada carteira em base 1000
    uint256 public developmentPercentage;
    uint256 public charityPercentage;
    uint256 public evolutionPercentage;
    
    mapping(address => bool) public authorizedOperators;
    mapping(address => uint256) public payments;
    mapping(bytes32 => bool) public processedPaymentIds;
    
    // Eventos
    event PaymentProcessed(address indexed from, address indexed to, uint256 amount, uint256 fee, bytes32 indexed paymentId);
    event PaymentReleased(address indexed to, uint256 amount, bytes32 paymentId);
    event FeeCollected(address indexed collector, uint256 amount, bytes32 paymentId);
    event OperatorAdded(address indexed operator);
    event OperatorRemoved(address indexed operator);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event FeeUpdated(uint256 previousFee, uint256 newFee);
    event WalletUpdated(string walletType, address previousWallet, address newWallet);
    event PercentageUpdated(string percentageType, uint256 previousPercentage, uint256 newPercentage);
    event Paused(address by);
    event Unpaused(address by);
    
    // Modificadores
    modifier onlyOwner() {
        require(msg.sender == owner, "Gate33: only owner");
        _;
    }
    
    modifier onlyAuthorized() {
        require(msg.sender == owner || authorizedOperators[msg.sender], "Gate33: not authorized");
        _;
    }
    
    modifier whenNotPaused() {
        require(!paused, "Gate33: contract paused");
        _;
    }
    
    /**
     * @dev Construtor que configura o proprietário inicial, coletor de taxas e percentual de taxa
     * @param _feeCollector Endereço que receberá as taxas
     * @param _feePercentage Percentual de taxa em base 1000 (ex: 25 = 2.5%)
     */
    constructor(address _feeCollector, uint256 _feePercentage) {
        require(_feePercentage <= 100, "Gate33: fee too high"); // Máximo de 10%
        owner = msg.sender;
        feeCollector = _feeCollector;
        feePercentage = _feePercentage;
        paused = false;
        
        // Inicializar com valores padrão para as carteiras adicionais
        developmentWallet = _feeCollector;
        charityWallet = _feeCollector;
        evolutionWallet = _feeCollector;
        
        // Inicialmente, definir percentuais zerados para as carteiras adicionais
        developmentPercentage = 0;
        charityPercentage = 0;
        evolutionPercentage = 0;
    }
    
    /**
     * @dev Processa um pagamento sem taxa
     * @param recipient Endereço do destinatário
     * @param amount Valor do pagamento (pode ser diferente de msg.value para compatibilidade)
     * @return Verdadeiro se o processamento foi bem-sucedido
     */
    function processPayment(address recipient, uint256 amount) external payable whenNotPaused returns (bool) {
        require(recipient != address(0), "Gate33: invalid recipient");
        require(msg.value > 0, "Gate33: payment amount must be > 0");
        require(msg.value >= amount, "Gate33: insufficient value");
        
        // Transferir fundos diretamente para o destinatário
        (bool success, ) = payable(recipient).call{value: amount}("");
        require(success, "Gate33: payment failed");
        
        // Gerar um paymentId baseado no remetente, destinatário, valor e timestamp
        bytes32 paymentId = keccak256(abi.encodePacked(msg.sender, recipient, amount, block.timestamp));
        
        // Registrar como processado
        processedPaymentIds[paymentId] = true;
        
        // Devolver qualquer excesso de ETH enviado
        uint256 excess = msg.value - amount;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "Gate33: refund failed");
        }
        
        // Emitir evento (fee zero neste caso)
        emit PaymentProcessed(msg.sender, recipient, amount, 0, paymentId);
        
        return true;
    }
    
    /**
     * @dev Processa um pagamento com taxa e distribuição para múltiplas carteiras
     * @param recipient Endereço do destinatário principal
     * @param amount Valor do pagamento (pode ser diferente de msg.value para compatibilidade)
     * @return Verdadeiro se o processamento foi bem-sucedido
     */
    function processPaymentWithFee(address recipient, uint256 amount) external payable whenNotPaused returns (bool) {
        require(recipient != address(0), "Gate33: invalid recipient");
        require(msg.value > 0, "Gate33: payment amount must be > 0");
        require(msg.value >= amount, "Gate33: insufficient value");
        
        // Calcular taxa principal
        uint256 feeAmount = (amount * feePercentage) / 1000;
        
        // Calcular taxas adicionais para cada carteira
        uint256 devAmount = (amount * developmentPercentage) / 1000;
        uint256 charityAmount = (amount * charityPercentage) / 1000;
        uint256 evolutionAmount = (amount * evolutionPercentage) / 1000;
        
        // Calcular o valor líquido após todas as taxas
        uint256 totalFees = feeAmount + devAmount + charityAmount + evolutionAmount;
        uint256 netAmount = amount - totalFees;
        
        // Verificar que a soma de todas as taxas não excede o valor total
        require(totalFees <= amount, "Gate33: total fees exceed payment amount");
        
        // Transferir valor líquido para o destinatário principal
        (bool recipientSuccess, ) = payable(recipient).call{value: netAmount}("");
        require(recipientSuccess, "Gate33: payment to recipient failed");
        
        // Transferir taxa principal para o coletor de taxas
        if (feeAmount > 0) {
            (bool feeSuccess, ) = payable(feeCollector).call{value: feeAmount}("");
            require(feeSuccess, "Gate33: fee transfer failed");
        }
        
        // Transferir para a carteira de desenvolvimento
        if (devAmount > 0 && developmentWallet != address(0)) {
            (bool devSuccess, ) = payable(developmentWallet).call{value: devAmount}("");
            require(devSuccess, "Gate33: development wallet transfer failed");
        }
        
        // Transferir para a carteira de caridade
        if (charityAmount > 0 && charityWallet != address(0)) {
            (bool charitySuccess, ) = payable(charityWallet).call{value: charityAmount}("");
            require(charitySuccess, "Gate33: charity wallet transfer failed");
        }
        
        // Transferir para a carteira de evolução
        if (evolutionAmount > 0 && evolutionWallet != address(0)) {
            (bool evolutionSuccess, ) = payable(evolutionWallet).call{value: evolutionAmount}("");
            require(evolutionSuccess, "Gate33: evolution wallet transfer failed");
        }
        
        // Gerar um paymentId baseado no remetente, destinatário, valor e timestamp
        bytes32 paymentId = keccak256(abi.encodePacked(msg.sender, recipient, amount, block.timestamp));
        
        // Registrar como processado
        processedPaymentIds[paymentId] = true;
        
        // Devolver qualquer excesso de ETH enviado
        uint256 excess = msg.value - amount;
        if (excess > 0) {
            (bool refundSuccess, ) = payable(msg.sender).call{value: excess}("");
            require(refundSuccess, "Gate33: refund failed");
        }
        
        // Emitir eventos
        emit PaymentProcessed(msg.sender, recipient, netAmount, totalFees, paymentId);
        emit FeeCollected(feeCollector, feeAmount, paymentId);
        
        return true;
    }
    
    /**
     * @dev Processa um pagamento com retenção (versão original)
     * @param paymentId ID único para o pagamento
     */
    function processPaymentWithHold(bytes32 paymentId) external payable whenNotPaused {
        require(msg.value > 0, "Gate33: payment amount must be > 0");
        require(!processedPaymentIds[paymentId], "Gate33: payment ID already processed");
        
        uint256 feeAmount = (msg.value * feePercentage) / 1000;
        uint256 netAmount = msg.value - feeAmount;
        
        // Armazenar pagamento (pode ser liberado depois)
        payments[msg.sender] += netAmount;
        
        // Registrar ID de pagamento como processado
        processedPaymentIds[paymentId] = true;
        
        // Coletar taxa
        if (feeAmount > 0) {
            (bool feeSuccess, ) = payable(feeCollector).call{value: feeAmount}("");
            require(feeSuccess, "Gate33: fee transfer failed");
            emit FeeCollected(feeCollector, feeAmount, paymentId);
        }
        
        emit PaymentProcessed(msg.sender, address(this), netAmount, feeAmount, paymentId);
    }
    
    /**
     * @dev Liberar pagamento para o destinatário
     * @param to Endereço do destinatário
     * @param amount Valor a ser liberado
     * @param paymentId ID único para o pagamento
     */
    function releasePayment(address to, uint256 amount, bytes32 paymentId) external onlyAuthorized whenNotPaused {
        require(to != address(0), "Gate33: invalid address");
        require(amount > 0, "Gate33: amount must be > 0");
        require(address(this).balance >= amount, "Gate33: insufficient contract balance");
        
        // Transferir fundos
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Gate33: transfer failed");
        
        emit PaymentReleased(to, amount, paymentId);
    }
    
    /**
     * @dev Adicionar operador autorizado
     * @param operator Endereço do operador
     */
    function addOperator(address operator) external onlyOwner {
        require(operator != address(0), "Gate33: invalid address");
        require(!authorizedOperators[operator], "Gate33: already an operator");
        
        authorizedOperators[operator] = true;
        emit OperatorAdded(operator);
    }
    
    /**
     * @dev Remover operador autorizado
     * @param operator Endereço do operador
     */
    function removeOperator(address operator) external onlyOwner {
        require(authorizedOperators[operator], "Gate33: not an operator");
        
        authorizedOperators[operator] = false;
        emit OperatorRemoved(operator);
    }
    
    /**
     * @dev Verificar se um endereço é um operador
     * @param account Endereço a verificar
     */
    function isOperator(address account) external view returns (bool) {
        return authorizedOperators[account];
    }
    
    /**
     * @dev Atualizar o percentual de taxa
     * @param _feePercentage Novo percentual de taxa em base 1000
     */
    function updateFeePercentage(uint256 _feePercentage) external onlyOwner {
        require(_feePercentage <= 100, "Gate33: fee too high"); // Máximo de 10%
        
        uint256 oldFee = feePercentage;
        feePercentage = _feePercentage;
        
        emit FeeUpdated(oldFee, feePercentage);
    }
    
    /**
     * @dev Atualizar endereço do coletor de taxas
     * @param _feeCollector Novo endereço do coletor
     */
    function updateFeeCollector(address _feeCollector) external onlyOwner {
        require(_feeCollector != address(0), "Gate33: invalid address");
        address oldFeeCollector = feeCollector;
        feeCollector = _feeCollector;
        emit WalletUpdated("feeCollector", oldFeeCollector, _feeCollector);
    }
    
    /**
     * @dev Atualizar endereço da carteira de desenvolvimento
     * @param _developmentWallet Novo endereço da carteira de desenvolvimento
     */
    function updateDevelopmentWallet(address _developmentWallet) external onlyOwner {
        require(_developmentWallet != address(0), "Gate33: invalid address");
        address oldWallet = developmentWallet;
        developmentWallet = _developmentWallet;
        emit WalletUpdated("developmentWallet", oldWallet, _developmentWallet);
    }
    
    /**
     * @dev Atualizar endereço da carteira de caridade
     * @param _charityWallet Novo endereço da carteira de caridade
     */
    function updateCharityWallet(address _charityWallet) external onlyOwner {
        require(_charityWallet != address(0), "Gate33: invalid address");
        address oldWallet = charityWallet;
        charityWallet = _charityWallet;
        emit WalletUpdated("charityWallet", oldWallet, _charityWallet);
    }
    
    /**
     * @dev Atualizar endereço da carteira de evolução
     * @param _evolutionWallet Novo endereço da carteira de evolução
     */
    function updateEvolutionWallet(address _evolutionWallet) external onlyOwner {
        require(_evolutionWallet != address(0), "Gate33: invalid address");
        address oldWallet = evolutionWallet;
        evolutionWallet = _evolutionWallet;
        emit WalletUpdated("evolutionWallet", oldWallet, _evolutionWallet);
    }
    
    /**
     * @dev Atualizar o percentual da carteira de desenvolvimento
     * @param _percentage Novo percentual em base 1000
     */
    function updateDevelopmentPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 100, "Gate33: percentage too high"); // Máximo de 10%
        uint256 oldPercentage = developmentPercentage;
        developmentPercentage = _percentage;
        emit PercentageUpdated("developmentPercentage", oldPercentage, _percentage);
    }
    
    /**
     * @dev Atualizar o percentual da carteira de caridade
     * @param _percentage Novo percentual em base 1000
     */
    function updateCharityPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 100, "Gate33: percentage too high"); // Máximo de 10%
        uint256 oldPercentage = charityPercentage;
        charityPercentage = _percentage;
        emit PercentageUpdated("charityPercentage", oldPercentage, _percentage);
    }
    
    /**
     * @dev Atualizar o percentual da carteira de evolução
     * @param _percentage Novo percentual em base 1000
     */
    function updateEvolutionPercentage(uint256 _percentage) external onlyOwner {
        require(_percentage <= 100, "Gate33: percentage too high"); // Máximo de 10%
        uint256 oldPercentage = evolutionPercentage;
        evolutionPercentage = _percentage;
        emit PercentageUpdated("evolutionPercentage", oldPercentage, _percentage);
    }
    
    /**
     * @dev Verificar a soma total de percentuais para garantir que não exceda um limite
     * @return Soma de todos os percentuais
     */
    function getTotalPercentage() public view returns (uint256) {
        return feePercentage + developmentPercentage + charityPercentage + evolutionPercentage;
    }
    
    /**
     * @dev Transferir propriedade do contrato
     * @param newOwner Novo proprietário
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Gate33: invalid address");
        
        address oldOwner = owner;
        owner = newOwner;
        
        emit OwnershipTransferred(oldOwner, newOwner);
    }
    
    /**
     * @dev Verificar se o contrato está pausado
     */
    function isPaused() external view returns (bool) {
        return paused;
    }
    
    /**
     * @dev Pausar o contrato
     */
    function pause() external onlyOwner {
        require(!paused, "Gate33: already paused");
        paused = true;
        emit Paused(msg.sender);
    }
    
    /**
     * @dev Despausar o contrato
     */
    function unpause() external onlyOwner {
        require(paused, "Gate33: not paused");
        paused = false;
        emit Unpaused(msg.sender);
    }
    
    /**
     * @dev Obter saldo do contrato
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Verificar se um ID de pagamento já foi processado
     * @param paymentId ID do pagamento
     */
    function isPaymentProcessed(bytes32 paymentId) external view returns (bool) {
        return processedPaymentIds[paymentId];
    }
    
    /**
     * @dev Sacar fundos do contrato (apenas o proprietário pode fazer isso)
     * @param to Endereço para receber os fundos
     * @param amount Quantidade a sacar
     */
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Gate33: invalid address");
        require(amount > 0, "Gate33: amount must be > 0");
        require(amount <= address(this).balance, "Gate33: insufficient balance");
        
        (bool success, ) = payable(to).call{value: amount}("");
        require(success, "Gate33: withdrawal failed");
    }
    
    /**
     * @dev Função para receber ETH diretamente
     */
    receive() external payable {
        // Aceita ETH diretamente (sem processamento avançado)
    }
    
    /**
     * @dev Função para lidar com chamadas de função desconhecidas
     */
    fallback() external payable {
        revert("Gate33: function not found");
    }
}