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

export interface GetComicsResponse {
  statbar: string;
  count: number;
  configurator: LogcConfigurator;
  list: string; // HTML content
  filters_publishers: string; // HTML content
  reviews_tab: string;
  addons: number;
}
