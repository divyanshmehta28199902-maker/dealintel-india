export interface Listing {
  id: number;
  userId: number;
  companyName: string;
  industry: string;
  description: string | null;
  revenue: number;
  ebitda: number;
  ebitdaMargin: number | null;
  revenueGrowthRate: number | null;
  askingValuation: number;
  debtRatio: number | null;
  customerConcentration: number | null;
  employeeCount: number | null;
  foundedYear: number | null;
  city: string | null;
  state: string | null;
  stage: string;
  status: string;
  declarationAccepted: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  sellerName?: string | null;
}

export interface ScenarioResult {
  label: "Bear" | "Base" | "Bull";
  valuation: number;
  growthRate: number;
  discountRate: number;
  pctFromBase: number;
}

export interface ValuationResult {
  listingId: number;
  comparableEV: number;
  dcfValue: number;
  rangeMin: number;
  rangeMax: number;
  suggestedPrice: number;
  confidenceScore: number;
  explanation: string;
  ebitdaMultiple: number;
  industryBenchmarkMultiple: number;
  discountRate: number;
  terminalGrowthRate: number;
  projectedCashFlows: number[];
  tag: string;
  riskLabel: string;
  valuationMethod: "EBITDA" | "Revenue";
  isLossMaking: boolean;
  dcfNotMeaningful: boolean;
  scenarios: ScenarioResult[];
  irr: number | null;
  moic: number | null;
  moicLabel: string;
  paybackYears: number | null;
  dealScore: number;
  dealRating: string;
  tags: string[];
}

export interface RiskFactor {
  factor: string;
  score: number;
  description: string;
}

export interface IntelligenceResult {
  listingId: number;
  riskScore: number;
  growthScore: number;
  riskFactors: RiskFactor[];
  growthFactors: RiskFactor[];
  aiInsights: string[];
  marketSentiment: string;
  industryGrowthRate: number;
  trendSummary: string;
}

export interface ContactRequest {
  id: number;
  investorId: number;
  listingId: number;
  message: string;
  status: string;
  threadId: number | null;
  ndaAgreed: boolean;
  ndaAgreedAt: string | null;
  createdAt: string;
  investorName?: string | null;
  listingName?: string | null;
}

export interface DocumentVaultEntry {
  id: number;
  privateDealId: number | null;
  uploadedBy: number;
  documentType: string;
  objectPath: string;
  fileName: string;
  fileSize: number | null;
  createdAt: string;
}

export interface PrivateDeal {
  id: number;
  userId: number;
  companyName: string;
  industry: string;
  revenue: number;
  ebitda: number;
  growthRate: number;
  revenueY1: number | null;
  revenueY2: number | null;
  revenueY3: number | null;
  totalDebt: number | null;
  customerConcentration: number | null;
  dealMode: string;
  qualityScore: number | null;
  trustLevel: string;
  businessOverview: string | null;
  whySelling: string | null;
  growthDrivers: string | null;
  keyRisks: string | null;
  description: string | null;
  legalConfirmedAt: string | null;
  status: string;
  valuation: ValuationResult | null;
  intelligence: IntelligenceResult | null;
  documents?: DocumentVaultEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineActivity {
  ts: string;
  stage: string;
  note?: string;
}

export interface Pipeline {
  id: number;
  investorId: number;
  listingId: number;
  stage: string;
  notes: string | null;
  activityLog: PipelineActivity[];
  successFeePrompted: string | null;
  createdAt: string;
  updatedAt: string;
  listing: {
    name: string | null;
    industry: string | null;
    revenue: number | null;
    askingValuation: number | null;
    status: string | null;
  };
  sellerName: string | null;
}

export interface WatchlistItem {
  id: number;
  userId: number;
  listingId: number;
  createdAt: string;
  listing: Listing | null;
}

export interface MessageThread {
  id: number;
  listingId: number | null;
  sellerId: number;
  investorId: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  listingName?: string | null;
  otherPartyName?: string;
  unreadCount?: number;
}

export interface Message {
  id: number;
  threadId: number;
  senderId: number;
  content: string;
  isRead: boolean;
  createdAt: string;
  senderName?: string | null;
}

export interface SellerDashboardStats {
  totalListings: number;
  activeListings: number;
  draftListings: number;
  totalViews: number;
  pendingContactRequests: number;
  acceptedContactRequests: number;
  totalMessages: number;
}

export interface InvestorDashboardStats {
  watchlistCount: number;
  privateDealsCount: number;
  contactRequestsSent: number;
  activeThreads: number;
  recentListings: Listing[];
}

export interface MarketplaceStats {
  totalListings: number;
  totalDealValue: number;
  byIndustry: { industry: string; count: number; totalValue: number }[];
  byStage: { stage: string; count: number }[];
}

export interface Benchmark {
  id: number;
  industry: string;
  ebitdaMultiple: number;
  revenueMultiple: number;
  growthRate: number;
  description: string;
}
