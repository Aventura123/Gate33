// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title Gate33Token
 * @dev Implementação do token ERC20 para Gate33 com fornecimento máximo (cap) de 3.300.000 tokens.
 * Todos os tokens serão mintados de uma única vez e enviados para o contrato distribuidor.
 */
contract Gate33Token is ERC20Capped, Ownable {
    // Constantes do token (usando decimais de 18 casas)
    uint256 public constant MAX_SUPPLY = 3300000 * 10**18;  // 3.300.000 tokens
    
    // Evento para registrar a mintagem inicial
    event InitialMintCompleted(address indexed distributor, uint256 amount);

    /**
     * @dev Construtor que configura o token sem mintar nenhum token inicialmente
     */
    constructor() ERC20("Gate33", "G33") ERC20Capped(MAX_SUPPLY) {
        // Não minta tokens no construtor
    }
    
    /**
     * @dev Realiza a mintagem completa de todos os tokens para o contrato distribuidor
     * Esta função só pode ser chamada uma vez pelo proprietário
     * @param distributor Endereço do contrato distribuidor que receberá todos os tokens
     */
    function mintAllToDistributor(address distributor) external onlyOwner {
        require(distributor != address(0), "Distributor address cannot be zero");
        require(totalSupply() == 0, "Tokens already minted");
        
        _mint(distributor, MAX_SUPPLY);
        emit InitialMintCompleted(distributor, MAX_SUPPLY);
    }
}