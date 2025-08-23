export type UserProfile = {
    id: string;
    full_name: string | null;
    notification_preferences: {
      bet_results: boolean;
      promotions: boolean;
    };
    created_at: string;
    updated_at: string;
  };
  
  export type Category = {
    id: string;
    name: string;
    nominees_count: number;
    created_at: string;
    updated_at: string;
  };
  
  export type Nominee = {
    id: string;
    name: string;
    category_id: string;
    is_winner: boolean;
    created_at: string;
    updated_at: string;
  };
  
  export type Bet = {
    id: string;
    user_id: string;
    nominee_id: string;
    category_id: string;
    created_at: string;
    updated_at: string;
  };
  
  export type BettingSettings = {
    id: string;
    betting_enabled: boolean;
    created_at: string;
    updated_at: string;
  };
  
  export type UserRanking = {
    user_id: string;
    full_name: string;
    correct_bets: number;
    total_bets: number;
  };
  
  export type DetailedBet = {
    id: string;
    user_id: string;
    nominee_id: string;
    category_id: string;
    category_name: string;
    nominee_name: string;
    is_winner: boolean;
    created_at: string;
    updated_at: string;
  };