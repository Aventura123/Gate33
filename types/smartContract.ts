interface SmartContractService {
  initializeContract(): Promise<void>;
  isContractInitialized(): boolean;
  resetContract(): void;
  getFeeCollector(): Promise<string>;
  getDevelopmentWallet(): Promise<string>;
  getCharityWallet(): Promise<string>;
  getEvolutionWallet(): Promise<string>;
  getDistributionPercentages(): Promise<{
    feePercentage: number;
    developmentPercentage: number;
    charityPercentage: number;
    evolutionPercentage: number;
    totalPercentage: number;
  }>;
  updateFeeCollector(newAddress: string): Promise<void>;
  updateDevelopmentWallet(newAddress: string): Promise<void>;
  updateCharityWallet(newAddress: string): Promise<void>;
  updateEvolutionWallet(newAddress: string): Promise<void>;
  updateFeePercentage(newPercentage: number): Promise<void>;
  updateDevelopmentPercentage(newPercentage: number): Promise<void>;
  updateCharityPercentage(newPercentage: number): Promise<void>;
  updateEvolutionPercentage(newPercentage: number): Promise<void>;
  checkOwnership(): Promise<boolean>;
  getContractOwner(): Promise<string>;
}

declare module "g33TokenContractService" {
  export const g33TokenContractService: any;
  export default g33TokenContractService;
}