// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title IERC20
 * @dev Interface do padrão ERC20 para tokens fungíveis
 */
interface IERC20 {
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address recipient, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

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
    
    // Mapeamento para armazenar balances de tokens ERC-20
    mapping(address => mapping(address => uint256)) public tokenPayments; // token => beneficiario => montante
    
    // Lista de tokens suportados
    mapping(address => bool) public supportedTokens;
    address[] public supportedTokensList;
    
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
    
    // Eventos adicionais para tokens ERC-20
    event TokenPaymentProcessed(address indexed token, address indexed from, address indexed to, uint256 amount, uint256 fee, bytes32 paymentId);
    event TokenFeeCollected(address indexed token, address indexed collector, uint256 amount, bytes32 paymentId);
    event TokenPaymentReleased(address indexed token, address indexed to, uint256 amount, bytes32 paymentId);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    
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
        
        // Adicionar automaticamente os endereços do USDT das principais redes
        // Ethereum Mainnet USDT
        supportedTokens[0xdAC17F958D2ee523a2206206994597C13D831ec7] = true;
        supportedTokensList.push(0xdAC17F958D2ee523a2206206994597C13D831ec7);
        
        // BSC Mainnet USDT
        supportedTokens[0x55d398326f99059fF775485246999027B3197955] = true;
        supportedTokensList.push(0x55d398326f99059fF775485246999027B3197955);
        
        // Polygon USDT
        supportedTokens[0xc2132D05D31c914a87C6611C10748AEb04B58e8F] = true;
        supportedTokensList.push(0xc2132D05D31c914a87C6611C10748AEb04B58e8F);
        
        // Avalanche USDT
        supportedTokens[0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7] = true;
        supportedTokensList.push(0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7);
        
        // BSC Testnet USDT (para testes)
        supportedTokens[0x337610d27c682E347C9cD60BD4b3b107C9d34dDd] = true;
        supportedTokensList.push(0x337610d27c682E347C9cD60BD4b3b107C9d34dDd);
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

    /**
     * @dev Adiciona um token à lista de tokens suportados
     * @param tokenAddress Endereço do contrato do token ERC-20
     */
    function addSupportedToken(address tokenAddress) external onlyOwner {
        require(tokenAddress != address(0), "Gate33: invalid token address");
        require(!supportedTokens[tokenAddress], "Gate33: token already supported");
        
        supportedTokens[tokenAddress] = true;
        supportedTokensList.push(tokenAddress);
        
        emit TokenAdded(tokenAddress);
    }
    
    /**
     * @dev Remove um token da lista de tokens suportados
     * @param tokenAddress Endereço do contrato do token ERC-20
     */
    function removeSupportedToken(address tokenAddress) external onlyOwner {
        require(supportedTokens[tokenAddress], "Gate33: token not supported");
        
        supportedTokens[tokenAddress] = false;
        
        // Remover da lista de tokens
        for (uint i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == tokenAddress) {
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }
        
        emit TokenRemoved(tokenAddress);
    }
    
    /**
     * @dev Verifica se um token é suportado
     * @param tokenAddress Endereço do contrato do token ERC-20
     */
    function isTokenSupported(address tokenAddress) public view returns (bool) {
        return supportedTokens[tokenAddress];
    }
    
    /**
     * @dev Retorna o número de tokens suportados
     */
    function getSupportedTokensCount() external view returns (uint256) {
        return supportedTokensList.length;
    }
    
    /**
     * @dev Processa um pagamento em token ERC-20 sem taxa
     * @param tokenAddress Endereço do token ERC-20
     * @param recipient Endereço do destinatário
     * @param amount Valor do pagamento em tokens
     * @return Verdadeiro se o processamento foi bem-sucedido
     */
    function processTokenPayment(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) external whenNotPaused returns (bool) {
        require(supportedTokens[tokenAddress], "Gate33: token not supported");
        require(recipient != address(0), "Gate33: invalid recipient");
        require(amount > 0, "Gate33: payment amount must be > 0");
        
        IERC20 token = IERC20(tokenAddress);
        
        // Verificar se o contrato tem permissão para transferir os tokens
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= amount, "Gate33: insufficient token allowance");
        
        // Transferir tokens do remetente para o destinatário
        bool success = token.transferFrom(msg.sender, recipient, amount);
        require(success, "Gate33: token transfer failed");
        
        // Gerar um paymentId baseado no remetente, destinatário, valor e timestamp
        // Dividido em duas partes para evitar erro "stack too deep"
        bytes32 hash1 = keccak256(abi.encodePacked(msg.sender, recipient, amount));
        bytes32 paymentId = keccak256(abi.encodePacked(hash1, block.timestamp, tokenAddress));
        
        // Registrar como processado
        processedPaymentIds[paymentId] = true;
        
        // Emitir evento (taxa zero neste caso)
        emit TokenPaymentProcessed(tokenAddress, msg.sender, recipient, amount, 0, paymentId);
        
        return true;
    }
    
    /**
     * @dev Processa um pagamento em token ERC-20 com taxa e distribuição para múltiplas carteiras
     * @param tokenAddress Endereço do token ERC-20
     * @param recipient Endereço do destinatário principal
     * @param amount Valor do pagamento em tokens
     * @return Verdadeiro se o processamento foi bem-sucedido
     */
    function processTokenPaymentWithFee(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) external whenNotPaused returns (bool) {
        require(supportedTokens[tokenAddress], "Gate33: token not supported");
        require(recipient != address(0), "Gate33: invalid recipient");
        require(amount > 0, "Gate33: payment amount must be > 0");
        
        // Chamar função auxiliar para reduzir uso da pilha
        return _processTokenPaymentWithFee(tokenAddress, recipient, amount);
    }
    
    /**
     * @dev Função auxiliar para processar pagamento em token com taxas
     * (Dividido para evitar erro "stack too deep")
     */
    function _processTokenPaymentWithFee(
        address tokenAddress,
        address recipient,
        uint256 amount
    ) private returns (bool) {
        IERC20 token = IERC20(tokenAddress);
        
        // Verificar se o contrato tem permissão para transferir os tokens
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= amount, "Gate33: insufficient token allowance");
        
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
        
        // Transferir tokens para o contrato primeiro
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Gate33: token transfer to contract failed");
        
        // Transferir valor líquido para o destinatário principal
        success = token.transfer(recipient, netAmount);
        require(success, "Gate33: payment to recipient failed");
        
        // Transferir taxa principal para o coletor de taxas
        if (feeAmount > 0) {
            success = token.transfer(feeCollector, feeAmount);
            require(success, "Gate33: fee transfer failed");
        }
        
        // Transferir para as carteiras adicionais
        _distributeAdditionalFees(token, devAmount, charityAmount, evolutionAmount);
        
        // Gerar um paymentId baseado no remetente, destinatário, valor e timestamp
        bytes32 hash1 = keccak256(abi.encodePacked(msg.sender, recipient, amount));
        bytes32 paymentId = keccak256(abi.encodePacked(hash1, block.timestamp, tokenAddress));
        
        // Registrar como processado
        processedPaymentIds[paymentId] = true;
        
        // Emitir eventos
        emit TokenPaymentProcessed(tokenAddress, msg.sender, recipient, netAmount, totalFees, paymentId);
        emit TokenFeeCollected(tokenAddress, feeCollector, feeAmount, paymentId);
        
        return true;
    }
    
    /**
     * @dev Função auxiliar para distribuir taxas adicionais
     * (Dividido para evitar erro "stack too deep")
     */
    function _distributeAdditionalFees(
        IERC20 token,
        uint256 devAmount,
        uint256 charityAmount,
        uint256 evolutionAmount
    ) private {
        bool success;
        
        // Transferir para a carteira de desenvolvimento
        if (devAmount > 0 && developmentWallet != address(0)) {
            success = token.transfer(developmentWallet, devAmount);
            require(success, "Gate33: development wallet transfer failed");
        }
        
        // Transferir para a carteira de caridade
        if (charityAmount > 0 && charityWallet != address(0)) {
            success = token.transfer(charityWallet, charityAmount);
            require(success, "Gate33: charity wallet transfer failed");
        }
        
        // Transferir para a carteira de evolução
        if (evolutionAmount > 0 && evolutionWallet != address(0)) {
            success = token.transfer(evolutionWallet, evolutionAmount);
            require(success, "Gate33: evolution wallet transfer failed");
        }
    }
    
    /**
     * @dev Processa um pagamento em token ERC-20 com retenção (similar à função processPaymentWithHold)
     * @param tokenAddress Endereço do token ERC-20
     * @param amount Valor a ser retido
     * @param paymentId ID único para o pagamento
     */
    function processTokenPaymentWithHold(
        address tokenAddress,
        uint256 amount,
        bytes32 paymentId
    ) external whenNotPaused {
        require(supportedTokens[tokenAddress], "Gate33: token not supported");
        require(amount > 0, "Gate33: payment amount must be > 0");
        require(!processedPaymentIds[paymentId], "Gate33: payment ID already processed");
        
        IERC20 token = IERC20(tokenAddress);
        
        // Verificar se o contrato tem permissão para transferir os tokens
        uint256 allowance = token.allowance(msg.sender, address(this));
        require(allowance >= amount, "Gate33: insufficient token allowance");
        
        // Calcular taxa
        uint256 feeAmount = (amount * feePercentage) / 1000;
        uint256 netAmount = amount - feeAmount;
        
        // Transferir tokens para o contrato
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Gate33: token transfer to contract failed");
        
        // Registrar o valor retido
        tokenPayments[tokenAddress][msg.sender] += netAmount;
        
        // Registrar ID de pagamento como processado
        processedPaymentIds[paymentId] = true;
        
        // Transferir taxa para o coletor de taxas
        if (feeAmount > 0) {
            success = token.transfer(feeCollector, feeAmount);
            require(success, "Gate33: fee transfer failed");
            emit TokenFeeCollected(tokenAddress, feeCollector, feeAmount, paymentId);
        }
        
        emit TokenPaymentProcessed(tokenAddress, msg.sender, address(this), netAmount, feeAmount, paymentId);
    }
    
    /**
     * @dev Liberar um pagamento em token ERC-20 retido
     * @param tokenAddress Endereço do token ERC-20
     * @param from Endereço do remetente original (de quem os tokens foram retidos)
     * @param to Endereço do destinatário
     * @param amount Valor a ser liberado
     * @param paymentId ID único para o pagamento
     */
    function releaseTokenPayment(
        address tokenAddress,
        address from,
        address to,
        uint256 amount,
        bytes32 paymentId
    ) external onlyAuthorized whenNotPaused {
        require(supportedTokens[tokenAddress], "Gate33: token not supported");
        require(to != address(0), "Gate33: invalid recipient");
        require(amount > 0, "Gate33: amount must be > 0");
        require(tokenPayments[tokenAddress][from] >= amount, "Gate33: insufficient held tokens");
        
        // Atualizar saldo retido
        tokenPayments[tokenAddress][from] -= amount;
        
        // Transferir tokens para o destinatário
        IERC20 token = IERC20(tokenAddress);
        bool success = token.transfer(to, amount);
        require(success, "Gate33: token transfer failed");
        
        emit TokenPaymentReleased(tokenAddress, to, amount, paymentId);
    }
    
    /**
     * @dev Obter saldo de um token ERC-20 no contrato
     * @param tokenAddress Endereço do token ERC-20
     */
    function getTokenBalance(address tokenAddress) external view returns (uint256) {
        return IERC20(tokenAddress).balanceOf(address(this));
    }
    
    /**
     * @dev Sacar tokens do contrato (apenas o proprietário pode fazer isso)
     * @param tokenAddress Endereço do token ERC-20
     * @param to Endereço para receber os tokens
     * @param amount Quantidade a sacar
     */
    function withdrawTokens(
        address tokenAddress,
        address to,
        uint256 amount
    ) external onlyOwner {
        require(to != address(0), "Gate33: invalid address");
        require(amount > 0, "Gate33: amount must be > 0");
        
        IERC20 token = IERC20(tokenAddress);
        require(token.balanceOf(address(this)) >= amount, "Gate33: insufficient token balance");
        
        bool success = token.transfer(to, amount);
        require(success, "Gate33: token withdrawal failed");
    }
}