export interface DashboardSummaryStats {
  totalPlayers: number;
  totalTournaments: number;
  upcomingEventsCount: number;
}

export interface DashboardSummaryUpcomingEvent {
  id: string;
  sourceTournamentId: number;
  name: string;
  city: string | null;
  startDate: string;
  sourceUrl: string | null;
}

export interface DashboardSummaryTopPlayer {
  id: string;
  sourcePlayerId: number;
  name: string;
  city: string | null;
  rating: number | null;
}

export interface DashboardSummaryLatestRating {
  id: string;
  sourceRatingId: number;
  typeName: string;
  name: string;
  snapshotDate: string | null;
}

export interface DashboardSummaryResponse {
  ready: boolean;
  generatedAt: string;
  stats: DashboardSummaryStats;
  latestRating: DashboardSummaryLatestRating | null;
  upcoming: DashboardSummaryUpcomingEvent[];
  topPlayers: DashboardSummaryTopPlayer[];
  message?: string;
}
