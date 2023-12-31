import { Profile } from './profile';

export interface Article {
  slug: string;
  title: string;
  description: string;
  body: string;
  tagList: string[];
  createdAt: string;
  updatedAt: string;
  favorited: boolean;
  favoritesCount: number;
  authors: Profile[];
  main_author?: Profile;
  lockedUser?: Profile;
}

export interface ArticleResponse {
  article: Article;
}
