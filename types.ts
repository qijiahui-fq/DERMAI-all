
export enum NodeType {
  Disease = 'Disease',
  Gene = 'Gene',
  Drug = 'Drug',
  Pathway = 'Pathway',
  Protein = 'Protein'
}

export enum RelationType {
  ASSOCIATED_WITH = 'ASSOCIATED_WITH',
  TARGETS = 'TARGETS',
  TREATS = 'TREATS',
  PART_OF = 'PART_OF',
  INTERACTS_WITH = 'INTERACTS_WITH',
  REGULATES = 'REGULATES'
}

export interface Node {
  id: string;
  name: string;
  type: NodeType;
  val?: number;
}

export interface Link {
  source: string;
  target: string;
  type: RelationType;
}

export interface TargetCandidate {
  geneSymbol: string;
  uniprotId: string;
  score: number;
  scoreBreakdown: {
    genetics: number; // 0.0 - 1.0
    expression: number; // 0.0 - 1.0
    clinical: number; // 0.0 - 1.0
  };
  scoreBasis: {
    genetics: string; 
    expression: string; 
    clinical: string; 
  };
  rationale: string;
  evidenceLinks: {
    title: string;
    source: string;
    url: string;
  }[];
  associatedDrugs: string[];
  pathways: string[];
}

export interface DiscoveryResponse {
  disease: string;
  summary: string;
  targets: TargetCandidate[];
}

export interface KnowledgeGraphData {
  nodes: Node[];
  links: Link[];
}

declare global {
  interface Window {
    aistudio: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}
