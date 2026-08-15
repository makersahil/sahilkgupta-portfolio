export interface PortfolioRuntimeMetrics {
  persistence: {
    provider: 'PostgreSQL';
    orm: 'Prisma';
  };
  content: {
    categories: number;
    projects: number;
    blogs: number;
    certifications: number;
    skills: number;
  };
  labs: {
    labs: number;
    inputs: number;
    scenarios: number;
    evidence: number;
    artifacts: number;
  };
  generatedAt: string;
}

export interface SystemRepository {
  getPortfolioRuntimeMetrics(now?: Date): Promise<PortfolioRuntimeMetrics>;
}
