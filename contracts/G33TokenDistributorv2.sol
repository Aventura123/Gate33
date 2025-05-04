// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title G33TokenDistributorV2
 * @dev Contrato para distribuir tokens G33 automaticamente para doadores.
 * Versão corrigida que considera corretamente as casas decimais dos tokens ERC-20.
 */
contract G33TokenDistributorV2 is Ownable, ReentrancyGuard {
    // Token G33 que será distribuído
    IERC20 public g33Token;
    
    // Casas decimais do token (padrão ERC-20 = 18)
    uint256 public constant TOKEN_DECIMALS = 18;
    
    // Taxa de distribuição (1 token = 1 USD)
    uint256 public constant TOKEN_RATE = 1;
    
    // Mapeamento para rastrear doações e tokens distribuídos
    mapping(address => uint256) public totalDonated;       // Valor doado em USD (x100 para precisão)
    mapping(address => uint256) public tokensDistributed;  // Tokens já distribuídos (em unidades inteiras, sem decimais)
    
    // Histórico de distribuições
    struct Distribution {
        address donorAddress;
        uint256 tokenAmount; // Quantidade de tokens em unidades inteiras (sem decimais)
        uint256 donationAmountUsd; // Valor USD (x100 para precisão de 2 casas decimais)
        uint256 timestamp;
    }
    
    Distribution[] public distributions;
    
    // Total valores globais
    uint256 public totalDistributedTokens; // Em unidades inteiras (sem decimais)
    uint256 public totalDonationsUsd; // Em centavos de USD
    
    // Contas autorizadas a distribuir tokens
    mapping(address => bool) public distributors;
    
    // Eventos
    event TokensDistributed(address indexed donor, uint256 tokenAmount, uint256 donationAmountUsd);
    event DistributorAdded(address indexed distributor);
    event DistributorRemoved(address indexed distributor);
    
    /**
     * @dev Modificador para garantir que apenas distribuidores autorizados ou o proprietário possam chamar certas funções
     */
    modifier onlyDistributors() {
        require(distributors[msg.sender] || owner() == msg.sender, "Not authorized to distribute tokens");
        _;
    }
    
    /**
     * @dev Construtor que configura o endereço do token G33
     */
    constructor(address _g33TokenAddress) Ownable(msg.sender) {
        require(_g33TokenAddress != address(0), "G33 token address cannot be zero");
        g33Token = IERC20(_g33TokenAddress);
        
        // Adicionar o proprietário como distribuidor por padrão
        distributors[msg.sender] = true;
        emit DistributorAdded(msg.sender);
    }
    
    /**
     * @dev Adiciona um endereço à lista de distribuidores autorizados
     * @param distributor O endereço a ser autorizado
     */
    function addDistributor(address distributor) external onlyOwner {
        require(distributor != address(0), "Distributor cannot be zero address");
        distributors[distributor] = true;
        emit DistributorAdded(distributor);
    }
    
    /**
     * @dev Remove um endereço da lista de distribuidores autorizados
     * @param distributor O endereço a ter autorização removida
     */
    function removeDistributor(address distributor) external onlyOwner {
        distributors[distributor] = false;
        emit DistributorRemoved(distributor);
    }
    
    /**
     * @dev Distribui tokens para um doador com base no valor em USD doado
     * @param donor O endereço que receberá os tokens
     * @param donationAmountUsd O valor doado em USD (multiplicado por 100 para precisão, ex: $10.50 = 1050)
     */
    function distributeTokens(address donor, uint256 donationAmountUsd) external onlyDistributors nonReentrant {
        require(donor != address(0), "Donor address cannot be zero");
        require(donationAmountUsd > 0, "Donation amount must be greater than zero");
        
        // Calcular tokens a serem distribuídos ($1 USD = 1 token)
        // Como donationAmountUsd é multiplicado por 100 para precisão, dividimos por 100
        uint256 tokenAmount = donationAmountUsd / 100;
        
        // Importante: Calcular o valor real a ser transferido, considerando os decimais
        // Para tokens ERC-20 padrão com 18 casas decimais
        uint256 tokenAmountWithDecimals = tokenAmount * 10**TOKEN_DECIMALS;
        
        // Verificar se há tokens suficientes no contrato
        require(g33Token.balanceOf(address(this)) >= tokenAmountWithDecimals, "Insufficient tokens in distributor");
        
        // Atualizar registros (armazenamos valores sem decimais para facilitar a contabilidade)
        totalDonated[donor] += donationAmountUsd;
        tokensDistributed[donor] += tokenAmount;
        totalDistributedTokens += tokenAmount;
        totalDonationsUsd += donationAmountUsd;
        
        // Registrar a distribuição
        distributions.push(Distribution({
            donorAddress: donor,
            tokenAmount: tokenAmount,
            donationAmountUsd: donationAmountUsd,
            timestamp: block.timestamp
        }));
        
        // Transferir tokens para o doador (com decimais corretos)
        bool success = g33Token.transfer(donor, tokenAmountWithDecimals);
        require(success, "Token transfer failed");
        
        emit TokensDistributed(donor, tokenAmount, donationAmountUsd);
    }
    
    /**
     * @dev Recupera tokens não utilizados (apenas proprietário)
     * @param amount Quantidade de tokens a recuperar (em unidades inteiras, sem decimais)
     */
    function recoverTokens(uint256 amount) external onlyOwner {
        // Converter para o valor com decimais
        uint256 amountWithDecimals = amount * 10**TOKEN_DECIMALS;
        require(amountWithDecimals <= g33Token.balanceOf(address(this)), "Amount exceeds balance");
        bool success = g33Token.transfer(owner(), amountWithDecimals);
        require(success, "Token recovery failed");
    }
    
    /**
     * @dev Recupera todos os tokens não utilizados (apenas proprietário)
     */
    function recoverAllTokens() external onlyOwner {
        uint256 balance = g33Token.balanceOf(address(this));
        require(balance > 0, "No tokens to recover");
        bool success = g33Token.transfer(owner(), balance);
        require(success, "Token recovery failed");
    }
    
    /**
     * @dev Retorna o saldo de tokens disponíveis para distribuição
     * @return Quantidade de tokens G33 no contrato (com decimais)
     */
    function getAvailableTokens() external view returns (uint256) {
        return g33Token.balanceOf(address(this));
    }
    
    /**
     * @dev Retorna o saldo de tokens disponíveis para distribuição em unidades inteiras
     * @return Quantidade de tokens G33 no contrato (convertida para unidades inteiras)
     */
    function getAvailableTokensFormatted() external view returns (uint256) {
        return g33Token.balanceOf(address(this)) / 10**TOKEN_DECIMALS;
    }
    
    /**
     * @dev Retorna o número de distribuições já realizadas
     * @return Número de distribuições
     */
    function getDistributionCount() external view returns (uint256) {
        return distributions.length;
    }
    
    /**
     * @dev Retorna as últimas N distribuições
     * @param count Número máximo de distribuições a retornar
     */
    function getRecentDistributions(uint256 count) external view returns (
        address[] memory donors,
        uint256[] memory amounts,
        uint256[] memory donationValues,
        uint256[] memory timestamps
    ) {
        uint256 length = distributions.length;
        uint256 resultCount = count > length ? length : count;
        
        donors = new address[](resultCount);
        amounts = new uint256[](resultCount);
        donationValues = new uint256[](resultCount);
        timestamps = new uint256[](resultCount);
        
        for (uint256 i = 0; i < resultCount; i++) {
            uint256 index = length - 1 - i; // Começando do mais recente
            donors[i] = distributions[index].donorAddress;
            amounts[i] = distributions[index].tokenAmount;
            donationValues[i] = distributions[index].donationAmountUsd;
            timestamps[i] = distributions[index].timestamp;
        }
        
        return (donors, amounts, donationValues, timestamps);
    }
}