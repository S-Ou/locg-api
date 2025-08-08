export interface LogcConfigurator {
  addons: string;
  list: string;
  order: string;
  format: string[];
  date_type: string;
  date: string;
  ajax: number;
  type: string;
  query: number;
  view: string;
  view_series: string;
  series: number;
  series_id: number;
  detailed: number;
  my_lists: any[];
  my_user_id: number;
  list_option: string;
  list_filter: string;
  list_refinement: string;
  media_format: string;
  character: string;
  role: any[];
  page: number;
  per_page: number;
  limit: number;
  offset: number;
  facets: any[];
  rank: number;
  custom_columns: any[];
  lazy: number;
  extendable: number;
  starts_with: string;
  list_mode_limit: number;
  list_mode_offset: number;
  order_series: string;
  hide_format: string[];
  hide_variant_types: any[];
  variant_types: number[];
  user_id: number;
  potw: number;
  view_cookie_value: string;
  view_cookie_value_series: string | null;
  nsfw_reveal: number;
  my_series_thumb: number;
  separate_variants: number;
  custom_title_sort: number;
  result_count: number;
}

export interface ComicData {
  id: number;
  title: string;
  publisher: string;
  date: Date;
  price: number;
  coverImage: string;
  url: string;
  pulls: number;
  community: number;
  titlePath: string;
  variantId?: string; // Optional variant ID
  parentId?: string; // Optional parent ID for variants
  variantName?: string; // Optional variant name
}

export interface Creator {
  name: string;
  role: string;
  url: string;
}

export interface Character {
  name: string;
  realName?: string;
  url: string;
  type?: string; // "Main", "Supporting", "Cameo", etc.
}

export interface Variant {
  id: number;
  title: string;
  coverImage: string;
  url: string;
  category: string; // "Open Order Covers", "Incentive Covers"
}

export interface Story {
  title: string;
  type: string; // "Story", "Front Matter", etc.
  pages?: number;
  creators: Creator[];
  characters: Character[];
}

export interface ComicRequest {
  comicId: number;
  title: string;
  variantId?: string; // Optional variant ID for specific variants
}

export interface ComicDetails {
  id: number;
  title: string;
  issueNumber: string;
  publisher: string;
  description: string;
  coverDate: string;
  releaseDate: Date;
  pages: number;
  price: number;
  format: string; // "Comic"
  upc: string | null;
  isbn: string | null;
  distributorSku: string;
  finalOrderCutoff: string;
  coverImage: string;
  url: string;
  rating: number;
  ratingCount: number;
  ratingText: string; // "Mostly Positive", etc.
  pulls: number;
  collected: number;
  read: number;
  wanted: number;
  seriesUrl: string;
  creators: Creator[];
  characters: Character[];
  variants: Variant[];
  stories: Story[];
  previousIssueUrl?: string;
  nextIssueUrl?: string;
}

export interface GetComicsResponse {
  statbar: string;
  count: number;
  configurator: LogcConfigurator;
  list: string; // HTML content
  filters_publishers: string; // HTML content
  reviews_tab: string;
  addons: number;
}
